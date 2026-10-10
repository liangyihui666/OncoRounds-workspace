#!/usr/bin/env python3
"""Static release audit for the importable OncoRounds v1.2 workflow."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE = Path.home() / "Downloads" / "题目生成 Copy.json"
DEFAULT_WORKFLOW = (
    ROOT
    / "outputs"
    / "快速稳定五题-v1.2"
    / "题目生成-v1.2-Qwen显式双轮-可导入.json"
)
EXPECTED_SOURCE_SHA256 = "c8920c852baa6f68451654f167c00af14f2f55932535747291f67348e94858b1"

REQUIRED_NODES = {
    "良医汇医学数据库（指南检索）",
    "良医汇医学数据库（指南检索B）",
    "良医汇医学数据库（临床研究检索）",
    "irAE正式指南检索A",
    "irAE正式指南检索B",
    "知识库搜索",
    "研究线索提取",
    "是否需要临床研究补检",
    "是否存在合格研究线索",
    "证据注册与压缩-初检",
    "证据注册与压缩-最终",
    "题目生成-首轮",
    "候选题装配与硬检-首轮",
    "是否可独立医审-首轮",
    "题目校验-首轮",
    "审核结果合并-首轮",
    "首轮结果判断",
    "修订任务拼接",
    "题目修订-第二轮",
    "修订补丁合并",
    "候选题装配与硬检-第二轮",
    "是否可独立医审-第二轮",
    "题目校验-第二轮",
    "审核结果合并-第二轮",
    "最终发布状态归一",
    "最终结果判断",
    "输出已通过题目",
    "输出资料不足",
    "指定回复#3",
}


def load_object(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(value, dict):
        raise ValueError(f"{path} root is not an object")
    return value


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def input_value(node: dict[str, Any], key: str) -> Any:
    matches = [item for item in node.get("inputs", []) if item.get("key") == key]
    if len(matches) != 1:
        raise ValueError(f"{node.get('name')}: expected one input {key}, got {len(matches)}")
    return matches[0].get("value")


def edge_pairs(workflow: dict[str, Any], id_to_name: dict[str, str]) -> set[tuple[str, str]]:
    return {
        (id_to_name.get(str(edge.get("source")), ""), id_to_name.get(str(edge.get("target")), ""))
        for edge in workflow.get("edges", [])
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--workflow", type=Path, default=DEFAULT_WORKFLOW)
    args = parser.parse_args()

    errors: list[str] = []
    warnings: list[str] = []

    if sha256(args.source) != EXPECTED_SOURCE_SHA256:
        errors.append("唯一基底文件SHA-256与审计锁定值不一致")

    workflow = load_object(args.workflow)
    nodes = workflow.get("nodes", [])
    edges = workflow.get("edges", [])
    if not isinstance(nodes, list) or not isinstance(edges, list):
        errors.append("nodes或edges不是数组")
        nodes, edges = [], []

    ids = [str(node.get("nodeId", "")) for node in nodes]
    names = [str(node.get("name", "")) for node in nodes]
    id_set = set(ids)
    if "" in id_set or len(id_set) != len(ids):
        errors.append("节点ID为空或重复")
    missing = sorted(REQUIRED_NODES - set(names))
    if missing:
        errors.append(f"缺少必需节点：{missing}")

    dangling = [
        edge
        for edge in edges
        if str(edge.get("source", "")) not in id_set or str(edge.get("target", "")) not in id_set
    ]
    if dangling:
        errors.append(f"存在{len(dangling)}条悬空边")
    signatures = [
        (
            str(edge.get("source", "")),
            str(edge.get("sourceHandle", "")),
            str(edge.get("target", "")),
            str(edge.get("targetHandle", "")),
        )
        for edge in edges
    ]
    if len(signatures) != len(set(signatures)):
        errors.append("存在重复边")

    forbidden_types = {"loopRun", "loopRunStart", "loopRunBreak"}
    remaining_loops = [node.get("name") for node in nodes if node.get("flowNodeType") in forbidden_types]
    if remaining_loops:
        errors.append(f"仍残留循环节点：{remaining_loops}")

    system_code_keys = {"system_addInputParam", "codeType", "code"}
    unregistered: list[str] = []
    for node in nodes:
        if node.get("flowNodeType") != "code":
            continue
        for item in node.get("inputs", []):
            key = str(item.get("key", ""))
            if key and key not in system_code_keys and item.get("canEdit") is not True:
                unregistered.append(f"{node.get('name')}.{key}")
    if unregistered:
        errors.append(f"代码节点自定义输入未注册canEdit=true：{unregistered}")

    by_name = {str(node.get("name")): node for node in nodes}
    for name in ("题目生成-首轮", "题目修订-第二轮"):
        node = by_name.get(name)
        if not node:
            continue
        expected = {
            "model": "qwen3.5-plus",
            "temperature": 0.1,
            "maxToken": 8192,
            "aiChatReasoning": False,
            "aiChatResponseFormat": "json_object",
            "aiChatVision": False,
        }
        for key, value in expected.items():
            if input_value(node, key) != value:
                errors.append(f"{name}.{key}不是锁定值{value!r}")
    for name in ("题目校验-首轮", "题目校验-第二轮"):
        node = by_name.get(name)
        if not node:
            continue
        expected = {
            "model": "qwen3.5-plus",
            "temperature": 0.1,
            "maxToken": 16384,
            "aiChatReasoning": True,
            "aiChatReasoningEffort": "medium",
            "aiChatResponseFormat": "json_object",
        }
        for key, value in expected.items():
            if input_value(node, key) != value:
                errors.append(f"{name}.{key}不是锁定值{value!r}")

    knowledge = by_name.get("知识库搜索")
    if knowledge:
        try:
            if input_value(knowledge, "datasetSearchUsingExtensionQuery") is not False:
                errors.append("知识库搜索仍开启扩展问题优化")
        except ValueError as exc:
            errors.append(str(exc))

    id_to_name = {str(node.get("nodeId")): str(node.get("name")) for node in nodes}
    pairs = edge_pairs(workflow, id_to_name)
    if ("临床研究检索词拼接", "知识库搜索") in pairs:
        errors.append("知识库搜索仍由临床研究检索词无条件触发")
    required_pairs = {
        ("证据注册与压缩-初检", "是否需要临床研究补检"),
        ("是否需要临床研究补检", "知识库搜索"),
        ("研究线索提取", "是否存在合格研究线索"),
        ("是否存在合格研究线索", "良医汇医学数据库（临床研究补检）"),
        ("题目生成-首轮", "候选题装配与硬检-首轮"),
        ("题目修订-第二轮", "修订补丁合并"),
        ("修订补丁合并", "候选题装配与硬检-第二轮"),
    }
    missing_pairs = sorted(required_pairs - pairs)
    if missing_pairs:
        errors.append(f"缺少关键连线：{missing_pairs}")

    all_prompt_text = "\n".join(
        str(input_value(node, "systemPrompt"))
        for node in nodes
        if node.get("flowNodeType") == "chatNode"
        and any(item.get("key") == "systemPrompt" for item in node.get("inputs", []))
    )
    banned_prompt_phrases = ("planning_status", "弹性题量", "至少3道指南题", "Q1/Q2必须", "Q3/Q4必须")
    found_banned = [text for text in banned_prompt_phrases if text in all_prompt_text]
    if found_banned:
        errors.append(f"提示词残留旧合同：{found_banned}")
    for required_text in ("evidence_id", "clinical_reasoning", "STOP_INSUFFICIENT", "score≥75"):
        if required_text not in all_prompt_text:
            warnings.append(f"提示词未找到审计标记：{required_text}")

    result = {
        "status": "PASS" if not errors else "FAIL",
        "source": str(args.source),
        "source_sha256": sha256(args.source),
        "workflow": str(args.workflow),
        "workflow_sha256": sha256(args.workflow),
        "node_count": len(nodes),
        "edge_count": len(edges),
        "errors": errors,
        "warnings": warnings,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not errors else 2


if __name__ == "__main__":
    raise SystemExit(main())
