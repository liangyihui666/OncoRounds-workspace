#!/usr/bin/env python3
"""Build FixF from the latest FastGPT re-export.

FastGPT's code-node dispatcher forwards only editable custom inputs to the
code sandbox.  The v1.1 builder-created inputs kept their references and
types, but omitted ``canEdit: true``; consequently those values were absent
at runtime.  This patch registers every custom code-node input without
changing its value, reference shape, type, required flag, code, prompts, or
workflow topology.
"""

from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path.home() / "Downloads" / "题目生成 (2).json"
ARTIFACTS = ROOT / "outputs" / "快速稳定五题-v1.1"
OUTPUT = ARTIFACTS / "题目生成-v1.1-FixF-代码输入注册修复-可导入.json"
REPORT = ARTIFACTS / "题目生成-v1.1-FixF-代码输入注册修复-构建审计报告.json"

SYSTEM_CODE_INPUTS = {"system_addInputParam", "codeType", "code"}

EXPECTED_PATCHES = {
    "纯机械结构硬检.candidate_json",
    "纯机械结构硬检.evidence_pool",
    "研究线索提取.initial_studies",
    "研究线索提取.guideline_a",
    "研究线索提取.guideline_b",
    "证据注册与压缩-最终.guideline_a",
    "证据注册与压缩-最终.guideline_b",
    "证据注册与压缩-最终.clinical_study_initial",
    "证据注册与压缩-最终.clinical_study_supplement",
    "证据注册与压缩-最终.irae_a",
    "证据注册与压缩-最终.irae_b",
    "证据注册与压缩-初检.guideline_a",
    "证据注册与压缩-初检.guideline_b",
    "证据注册与压缩-初检.clinical_study_initial",
    "证据注册与压缩-初检.clinical_study_supplement",
    "证据注册与压缩-初检.irae_a",
    "证据注册与压缩-初检.irae_b",
    "irAE双锚点确定性拆分-初次.adverse_events",
    "irAE双锚点确定性拆分-最终.adverse_events",
    "irAE双锚点确定性拆分-最终.fallback_json",
    "本轮审核结果归一.structure_decision",
    "本轮审核结果归一.structure_errors",
    "本轮审核结果归一.structure_warnings",
    "本轮审核结果归一.review_text",
    "本轮审核结果归一.validator_decision",
    "本轮审核结果归一.validator_score",
    "本轮审核结果归一.validator_revision_instruction",
    "本轮审核结果归一.validator_missing_information",
    "本轮审核结果归一.validator_general_feedback",
}


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(value, dict):
        raise ValueError(f"{path} root must be an object")
    return value


def edge_signature(edge: dict[str, Any]) -> tuple[str, str, str, str]:
    return (
        str(edge.get("source", "")),
        str(edge.get("target", "")),
        str(edge.get("sourceHandle", "")),
        str(edge.get("targetHandle", "")),
    )


def custom_code_inputs(workflow: dict[str, Any]):
    for node in workflow.get("nodes", []):
        if node.get("flowNodeType") != "code":
            continue
        for item in node.get("inputs", []):
            key = str(item.get("key", ""))
            if key and key not in SYSTEM_CODE_INPUTS:
                yield node, item, f"{node.get('name')}.{key}"


def compare_allowed_changes(
    source: dict[str, Any], result: dict[str, Any], patched: set[str]
) -> bool:
    restored = copy.deepcopy(result)
    restored["name"] = source.get("name")
    restored["intro"] = source.get("intro")

    source_lookup = {
        path: item for _node, item, path in custom_code_inputs(source)
    }
    for _node, item, path in custom_code_inputs(restored):
        if path not in patched:
            continue
        original = source_lookup[path]
        if "canEdit" in original:
            item["canEdit"] = original["canEdit"]
        else:
            item.pop("canEdit", None)
    return restored == source


def audit(
    source: dict[str, Any], result: dict[str, Any], patched: set[str]
) -> dict[str, Any]:
    errors: list[str] = []

    if len(source.get("nodes", [])) != 41 or len(source.get("edges", [])) != 54:
        errors.append("source is not the audited 41-node/54-edge re-export")
    if len(result.get("nodes", [])) != 41 or len(result.get("edges", [])) != 54:
        errors.append("result topology is not 41 nodes and 54 edges")

    source_ids = [str(node.get("nodeId")) for node in source.get("nodes", [])]
    result_ids = [str(node.get("nodeId")) for node in result.get("nodes", [])]
    source_edges = [edge_signature(edge) for edge in source.get("edges", [])]
    result_edges = [edge_signature(edge) for edge in result.get("edges", [])]
    if source_ids != result_ids:
        errors.append("node IDs or node order changed")
    if source_edges != result_edges:
        errors.append("edge list changed")
    if source.get("chatConfig") != result.get("chatConfig"):
        errors.append("chatConfig or global variables changed")

    if patched != EXPECTED_PATCHES:
        errors.append(
            "patched input set mismatch: "
            f"missing={sorted(EXPECTED_PATCHES - patched)}, "
            f"unexpected={sorted(patched - EXPECTED_PATCHES)}"
        )

    unregistered = [
        path
        for _node, item, path in custom_code_inputs(result)
        if item.get("canEdit") is not True
    ]
    if unregistered:
        errors.append(f"custom code inputs still unregistered: {unregistered}")

    if not compare_allowed_changes(source, result, patched):
        errors.append("fields other than name/intro/canEdit changed")

    node_ids = set(result_ids)
    for edge in result.get("edges", []):
        if str(edge.get("source")) not in node_ids or str(edge.get("target")) not in node_ids:
            errors.append(f"dangling edge: {edge_signature(edge)}")

    return {
        "status": "PASS" if not errors else "FAIL",
        "errors": errors,
        "warnings": [],
        "node_count": len(result.get("nodes", [])),
        "edge_count": len(result.get("edges", [])),
        "patched_input_count": len(patched),
        "patched_inputs": sorted(patched),
        "all_custom_code_inputs_registered": not unregistered,
        "only_name_intro_and_canEdit_changed": compare_allowed_changes(source, result, patched),
        "topology_unchanged": source_ids == result_ids and source_edges == result_edges,
        "chat_config_and_global_variables_unchanged": source.get("chatConfig") == result.get("chatConfig"),
    }


def build() -> tuple[dict[str, Any], dict[str, Any]]:
    source_hash_before = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    source = load_json(SOURCE)
    result = copy.deepcopy(source)

    patched: set[str] = set()
    for _node, item, path in custom_code_inputs(result):
        if item.get("canEdit") is not True:
            item["canEdit"] = True
            patched.add(path)

    result["name"] = "题目生成-v1.1-FixF-代码输入注册修复-导入测试版"
    result["intro"] = (
        "以题目生成 (2).json线上回导出为唯一基底；仅为代码节点的自定义输入"
        "补齐canEdit=true，使原有引用值实际进入代码沙箱。不改节点、连线、引用形状、"
        "数据类型、提示词、模型、循环或发布门禁。"
    )

    source_hash_after = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    if source_hash_after != source_hash_before:
        raise RuntimeError("source re-export changed while building")

    report = audit(source, result, patched)
    report.update(
        {
            "source": str(SOURCE),
            "source_sha256": source_hash_after,
            "output": str(OUTPUT),
            "import_ready": report["status"] == "PASS",
        }
    )
    return result, report


def main() -> int:
    workflow, report = build()
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    if report["status"] == "PASS":
        OUTPUT.write_text(
            json.dumps(workflow, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        report["output_sha256"] = hashlib.sha256(OUTPUT.read_bytes()).hexdigest()
    REPORT.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["status"] == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
