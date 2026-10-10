from __future__ import annotations

import copy
import json
import sys
import unittest
from pathlib import Path


REVIEW_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REVIEW_DIR))

from migrate_fastgpt_v11 import (  # noqa: E402
    EVIDENCE_NODE_ID,
    SELECTOR_NODE_ID,
    MigrationError,
    find_unique_node,
    input_by_key,
    migrate,
)


CURRENT_EXPORT = Path.home() / "Downloads" / "肿瘤大查房小工具 (AI简化) (5).json"


@unittest.skipUnless(CURRENT_EXPORT.exists(), "current FastGPT export fixture is unavailable")
class WorkflowMigrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = json.loads(CURRENT_EXPORT.read_text(encoding="utf-8-sig"))

    def test_migration_is_non_mutating_and_preserves_publication_loop(self):
        before = copy.deepcopy(self.source)
        migrated, report = migrate(
            self.source,
            generator_prompt="GENERATOR V1.1 TEST PROMPT",
            validator_prompt="VALIDATOR V1.1 TEST PROMPT",
        )
        self.assertEqual(self.source, before)
        self.assertFalse(report.import_ready)
        self.assertTrue(report.DO_NOT_IMPORT)
        self.assertIn("DO_NOT_IMPORT=true", migrated["intro"])
        self.assertTrue(any("irAE" in item for item in report.unresolved))

        knowledge = find_unique_node(migrated, "知识库搜索", "datasetSearchNode")
        self.assertEqual(input_by_key(knowledge, "limit")["value"], 1500)
        difficulty = next(v for v in migrated["chatConfig"]["variables"] if v["label"] == "difficulty")
        self.assertEqual(difficulty["defaultValue"], "进阶")
        self.assertEqual(difficulty["list"], [{"label": "进阶", "value": "进阶"}])

        normalizer = find_unique_node(migrated, "题目结构归一化", "code")
        code = input_by_key(normalizer, "code")["value"]
        self.assertNotIn("answerPatterns", code)
        self.assertNotIn("newOptions", code)
        self.assertIn("normalized_json: raw", code)

        validation_splice = find_unique_node(migrated, "校验输入拼接", "textEditor")
        validation_text = input_by_key(validation_splice, "system_textareaInput")["value"]
        self.assertIn("实际引用证据", validation_text)
        self.assertIn("初检与补检", validation_text)
        self.assertIn(SELECTOR_NODE_ID, validation_text)
        self.assertNotIn("五路原始检索结果", validation_text)
        self.assertNotIn("出题计划与证据门禁", validation_text)

        node_ids = {node["nodeId"] for node in migrated["nodes"]}
        self.assertIn(EVIDENCE_NODE_ID, node_ids)
        self.assertIn(SELECTOR_NODE_ID, node_ids)

        loop = find_unique_node(migrated, "循环节点", "loopRun")
        children = input_by_key(loop, "childrenNodeIdList")["value"]
        self.assertIn(SELECTOR_NODE_ID, children)
        self.assertEqual(len(children), len(set(children)))

        original_final = find_unique_node(self.source, "最终结果判断", "ifElseNode")
        migrated_final = find_unique_node(migrated, "最终结果判断", "ifElseNode")
        self.assertEqual(original_final["inputs"], migrated_final["inputs"])

    def test_gate_is_bypassed_without_deleting_node(self):
        migrated, _ = migrate(self.source)
        aggregator = find_unique_node(migrated, "文本拼接#2", "textEditor")
        gate = find_unique_node(migrated, "出题计划与证据门禁", "chatNode")
        initializer = find_unique_node(migrated, "初始化循环变量", "variableUpdate")
        edges = {(edge["source"], edge["target"]) for edge in migrated["edges"]}
        self.assertIn((aggregator["nodeId"], initializer["nodeId"]), edges)
        self.assertNotIn((aggregator["nodeId"], gate["nodeId"]), edges)
        self.assertNotIn((gate["nodeId"], initializer["nodeId"]), edges)

    def test_ambiguous_node_name_refuses_migration(self):
        source = copy.deepcopy(self.source)
        source["nodes"].append(copy.deepcopy(find_unique_node(source, "知识库搜索")))
        with self.assertRaises(MigrationError):
            migrate(source)


if __name__ == "__main__":
    unittest.main()
