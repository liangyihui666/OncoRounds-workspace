#!/usr/bin/env python3
"""Apply the approved Fix C and locator-reuse guard to the current FastGPT export.

This is intentionally a content-only patcher. It refuses to write an artifact if
the source is not the audited 41-node/54-edge v1.1 graph or if any node ID, edge,
global variable, or chat-model setting changes.
"""

from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path.home() / "Downloads" / "题目生成 (1).json"
ARTIFACTS = ROOT / "outputs" / "快速稳定五题-v1.1"
OUTPUT = ARTIFACTS / "题目生成-v1.1-FixE-数组引用形状修复-可导入.json"
REPORT = ARTIFACTS / "题目生成-v1.1-FixE-数组引用形状修复-构建审计报告.json"

GENERATOR_PROMPT = ROOT / "outputs" / "题目生成提示词-循证临床决策版.txt"
VALIDATOR_PROMPT = ROOT / "outputs" / "题目校验提示词-循证临床决策版.txt"
MECHANICAL_CODE = ARTIFACTS / "纯机械结构硬检.js"


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig")


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(read_text(path))
    if not isinstance(value, dict):
        raise ValueError(f"{path} root must be an object")
    return value


def find_node(workflow: dict[str, Any], name: str) -> dict[str, Any]:
    matches = [node for node in workflow.get("nodes", []) if node.get("name") == name]
    if len(matches) != 1:
        raise ValueError(f"expected exactly one node named {name}, found {len(matches)}")
    return matches[0]


def find_input(node: dict[str, Any], key: str) -> dict[str, Any]:
    matches = [item for item in node.get("inputs", []) if item.get("key") == key]
    if len(matches) != 1:
        raise ValueError(f"{node.get('name')}.{key}: expected one input, found {len(matches)}")
    return matches[0]


def normalize_runtime_array_reference(
    node: dict[str, Any], key: str, value_type: str
) -> None:
    """Use FastGPT's nested reference form for an array-valued input.

    Live traces show that a scalar-shaped reference such as [nodeId, outputId]
    remains visible in the editor but disappears from a code node's runtime
    input. FastGPT serializes array input references as
    [[nodeId, outputId]], while retaining the native array value type.
    """
    item = find_input(node, key)
    value = item.get("value")
    if (
        isinstance(value, list)
        and len(value) == 1
        and isinstance(value[0], list)
        and len(value[0]) == 2
        and all(isinstance(part, str) for part in value[0])
    ):
        reference = value[0]
    elif value not in (None, []) and (
        isinstance(value, list)
        and len(value) == 2
        and all(isinstance(part, str) for part in value)
    ):
        reference = value
    elif value in (None, []):
        reference = None
    else:
        raise ValueError(f"{node.get('name')}.{key}: unexpected reference shape {value!r}")
    item["valueType"] = value_type
    item["value"] = [reference] if reference else []
    item["renderTypeList"] = ["reference"]


def edge_signature(edge: dict[str, Any]) -> tuple[str, str, str, str]:
    return (
        str(edge.get("source", "")),
        str(edge.get("target", "")),
        str(edge.get("sourceHandle", "")),
        str(edge.get("targetHandle", "")),
    )


def audit(source: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []

    if len(source.get("nodes", [])) != 41 or len(source.get("edges", [])) != 54:
        errors.append("source must be the audited 41-node/54-edge workflow")
    if len(result.get("nodes", [])) != 41 or len(result.get("edges", [])) != 54:
        errors.append("result topology is not 41 nodes and 54 edges")

    source_ids = [str(node.get("nodeId")) for node in source.get("nodes", [])]
    result_ids = [str(node.get("nodeId")) for node in result.get("nodes", [])]
    if source_ids != result_ids:
        errors.append("node IDs or node order changed")
    if len(result_ids) != len(set(result_ids)):
        errors.append("duplicate nodeId")

    source_edges = [edge_signature(edge) for edge in source.get("edges", [])]
    result_edges = [edge_signature(edge) for edge in result.get("edges", [])]
    if source_edges != result_edges:
        errors.append("edge list changed")

    if source.get("chatConfig") != result.get("chatConfig"):
        errors.append("chatConfig or global variables changed")
    if any(node.get("name") == "出题计划与证据门禁" for node in result.get("nodes", [])):
        errors.append("deleted planning gate was restored")

    node_ids = set(result_ids)
    incoming = {node_id: 0 for node_id in node_ids}
    outgoing = {node_id: 0 for node_id in node_ids}
    for edge in result.get("edges", []):
        source_id = str(edge.get("source"))
        target_id = str(edge.get("target"))
        if source_id not in node_ids or target_id not in node_ids:
            errors.append(f"dangling edge {source_id}->{target_id}")
            continue
        outgoing[source_id] += 1
        incoming[target_id] += 1
    allowed_no_incoming = {"userGuide", "workflowStart", "loopRunStart"}
    allowed_no_outgoing = {"userGuide", "loopRunBreak", "answerNode"}
    for node in result.get("nodes", []):
        node_id = str(node.get("nodeId"))
        node_type = str(node.get("flowNodeType", ""))
        name = str(node.get("name", ""))
        if incoming[node_id] == 0 and node_type not in allowed_no_incoming:
            errors.append(f"node has no incoming edge: {name}")
        if outgoing[node_id] == 0 and node_type not in allowed_no_outgoing and name != "保存本轮反馈":
            errors.append(f"node has no outgoing edge: {name}")
        if incoming[node_id] == 0 and outgoing[node_id] == 0 and node_type != "userGuide":
            errors.append(f"isolated executable node: {name}")

    generator = find_node(result, "题目生成")
    validator = find_node(result, "题目校验")
    mechanical = find_node(result, "纯机械结构硬检")
    for node in (generator, validator):
        expected = {
            "model": "deepseek-v4-pro",
            "temperature": 0.1,
            "maxToken": 16384,
            "aiChatReasoning": True,
            "aiChatReasoningEffort": "medium",
            "aiChatResponseFormat": "json_object",
        }
        for key, value in expected.items():
            actual = find_input(node, key).get("value")
            if actual != value:
                errors.append(f"{node['name']}.{key}={actual!r}, expected {value!r}")

    generator_text = str(find_input(generator, "systemPrompt").get("value", ""))
    validator_text = str(find_input(validator, "systemPrompt").get("value", ""))
    mechanical_text = str(find_input(mechanical, "code").get("value", ""))
    required_generator = [
        "病例发生当时可执行的决策/实际治疗路径",
        "按现行规范进行的教学复盘",
        "优先纳入1道诊断/鉴别题",
        "缺少安全方向时不强行覆盖",
    ]
    required_validator = [
        "混淆当前规范与历史可用性属于时间与证据适用性硬错误",
        "只作为临床价值与题集多样性的软评分因素",
        "不能单独构成硬错误或阻止PASS",
    ]
    required_mechanical = [
        'for (const field of ["timepoint", "answer_text", "keyPoint"])',
        "二次使用时",
        "被使用${uses.length}次，超过最多2题",
    ]
    for phrase in required_generator:
        if phrase not in generator_text:
            errors.append(f"generator prompt missing: {phrase}")
    for phrase in required_validator:
        if phrase not in validator_text:
            errors.append(f"validator prompt missing: {phrase}")
    for phrase in required_mechanical:
        if phrase not in mechanical_text:
            errors.append(f"mechanical checker missing: {phrase}")

    runtime_bindings = {
        "研究线索提取": {
            "initial_studies": "arrayObject",
            "guideline_a": "arrayObject",
            "guideline_b": "arrayObject",
        },
        "证据注册与压缩-初检": {
            "guideline_a": "arrayObject",
            "guideline_b": "arrayObject",
            "clinical_study_initial": "arrayObject",
            "clinical_study_supplement": "arrayObject",
            "irae_a": "arrayObject",
            "irae_b": "arrayObject",
        },
        "证据注册与压缩-最终": {
            "guideline_a": "arrayObject",
            "guideline_b": "arrayObject",
            "clinical_study_initial": "arrayObject",
            "clinical_study_supplement": "arrayObject",
            "irae_a": "arrayObject",
            "irae_b": "arrayObject",
        },
        "本轮审核结果归一": {
            "structure_errors": "arrayString",
            "structure_warnings": "arrayString",
        },
    }
    for node_name, bindings in runtime_bindings.items():
        node = find_node(result, node_name)
        for key, expected_type in bindings.items():
            item = find_input(node, key)
            value = item.get("value")
            if item.get("valueType") != expected_type:
                errors.append(
                    f"{node_name}.{key} must use native {expected_type} runtime input"
                )
            if value not in (None, []) and not (
                isinstance(value, list)
                and len(value) == 1
                and isinstance(value[0], list)
                and len(value[0]) == 2
                and all(isinstance(part, str) for part in value[0])
            ):
                errors.append(f"{node_name}.{key} is not a nested array reference")

    if "不依赖独立“出题计划与证据门禁”的 planning_status" not in generator_text:
        errors.append("generator planning_status bypass rule changed")
    if "成功不得减为2至4题" not in generator_text:
        errors.append("fixed-five generation contract changed")
    if "不再要求至少3道指南题" not in generator_text or "不再要求至少3道指南题" not in validator_text:
        errors.append("legacy three-guideline quota may have returned")

    return {
        "status": "PASS" if not errors else "FAIL",
        "errors": errors,
        "warnings": warnings,
        "node_count": len(result.get("nodes", [])),
        "edge_count": len(result.get("edges", [])),
        "topology_unchanged": source_ids == result_ids and source_edges == result_edges,
        "chat_config_and_global_variables_unchanged": source.get("chatConfig") == result.get("chatConfig"),
    }


def build() -> tuple[dict[str, Any], dict[str, Any]]:
    source_hash_before = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    source = load_json(SOURCE)
    result = copy.deepcopy(source)

    find_input(find_node(result, "题目生成"), "systemPrompt")["value"] = read_text(GENERATOR_PROMPT)
    find_input(find_node(result, "题目校验"), "systemPrompt")["value"] = read_text(VALIDATOR_PROMPT)
    find_input(find_node(result, "纯机械结构硬检"), "code")["value"] = read_text(MECHANICAL_CODE)

    runtime_bindings = {
        "研究线索提取": {
            "initial_studies": "arrayObject",
            "guideline_a": "arrayObject",
            "guideline_b": "arrayObject",
        },
        "证据注册与压缩-初检": {
            "guideline_a": "arrayObject",
            "guideline_b": "arrayObject",
            "clinical_study_initial": "arrayObject",
            "clinical_study_supplement": "arrayObject",
            "irae_a": "arrayObject",
            "irae_b": "arrayObject",
        },
        "证据注册与压缩-最终": {
            "guideline_a": "arrayObject",
            "guideline_b": "arrayObject",
            "clinical_study_initial": "arrayObject",
            "clinical_study_supplement": "arrayObject",
            "irae_a": "arrayObject",
            "irae_b": "arrayObject",
        },
        "本轮审核结果归一": {
            "structure_errors": "arrayString",
            "structure_warnings": "arrayString",
        },
    }
    for node_name, bindings in runtime_bindings.items():
        node = find_node(result, node_name)
        for key, value_type in bindings.items():
            normalize_runtime_array_reference(node, key, value_type)

    result["name"] = "题目生成-v1.1-FixE-数组引用形状修复-导入测试版"
    result["intro"] = (
        "基于当前41节点线上导出文件的定向测试版：保留FixC和机械复用护栏，"
        "将代码节点的Array<object>/Array<string>输入改为FastGPT原生双层引用形状；"
        "拓扑与模型配置不变。"
    )

    source_hash_after = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    if source_hash_after != source_hash_before:
        raise RuntimeError("source export changed while building")

    report = audit(source, result)
    report.update({
        "source": str(SOURCE),
        "source_sha256": source_hash_after,
        "output": str(OUTPUT),
        "import_ready": report["status"] == "PASS",
    })
    return result, report


def main() -> int:
    workflow, report = build()
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    if report["status"] == "PASS":
        OUTPUT.write_text(json.dumps(workflow, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        report["output_sha256"] = hashlib.sha256(OUTPUT.read_bytes()).hexdigest()
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["status"] == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
