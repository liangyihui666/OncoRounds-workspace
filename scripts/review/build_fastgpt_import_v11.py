#!/usr/bin/env python3
"""Build an importable FastGPT OncoRounds v1.1 workflow from the supplied current export.

This builder deliberately starts from the user's current exported graph, preserves
the five medical-retrieval lanes and the two-pass loop, and then applies only the
approved v1.1 changes.  It does not overwrite the source export.
"""

from __future__ import annotations

import copy
import hashlib
import json
import re
from pathlib import Path
from typing import Any

import migrate_fastgpt_v11 as base


ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path.home() / "Downloads" / "肿瘤大查房小工具 (AI简化) (5).json"
ARTIFACTS = ROOT / "outputs" / "快速稳定五题-v1.1"
OUTPUT = ARTIFACTS / "OncoRounds-快速稳定五题-v1.1-可直接导入.json"
REPORT = ARTIFACTS / "可直接导入版-构建审计报告.json"

INITIAL_REGISTRY_ID = "v11EvidenceRegistryInitial"
FINAL_REGISTRY_ID = base.EVIDENCE_NODE_ID
IRAE_INITIAL_ID = "v11IraeSplitInitial"
IRAE_FINAL_ID = "v11IraeSplitFinal"
IRAE_FALLBACK_IF_ID = "v11IraeFallbackIf"
STRUCTURE_IF_ID = "v11StructureIf"
REVIEW_MERGE_ID = "v11ReviewMerge"


def text(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig")


def replace_node(workflow: dict[str, Any], old: dict[str, Any], new: dict[str, Any]) -> None:
    index = workflow["nodes"].index(old)
    workflow["nodes"][index] = new


def remove_edges(workflow: dict[str, Any], predicate) -> None:
    workflow["edges"] = [edge for edge in workflow["edges"] if not predicate(edge)]


def branch_edge(source: str, branch_id: str, target: str) -> dict[str, str]:
    return {
        "source": source,
        "target": target,
        "sourceHandle": f"{source}-source-{branch_id}",
        "targetHandle": f"{target}-target-left",
    }


def make_if_node(
    template: dict[str, Any],
    *,
    node_id: str,
    name: str,
    position: dict[str, float],
    parent_node_id: str | None,
    conditions: list[dict[str, Any]],
) -> dict[str, Any]:
    node = copy.deepcopy(template)
    node["nodeId"] = node_id
    node["name"] = name
    node["intro"] = "v1.1 deterministic branch gate"
    node["position"] = position
    if parent_node_id:
        node["parentNodeId"] = parent_node_id
    else:
        node.pop("parentNodeId", None)
    base.input_by_key(node, "ifElseList")["value"] = conditions
    return node


def condition(variable: list[str], value: str, branch_id: str, operator: str = "equalTo") -> dict[str, Any]:
    return {
        "condition": "AND",
        "list": [
            {
                "variable": variable,
                "condition": operator,
                "value": value,
                "valueType": "input",
            }
        ],
        "branchId": branch_id,
    }


def set_chat_config(node: dict[str, Any], *, model: str, temperature: float, max_token: int, reasoning: bool, effort: str | None, response_format: str | None) -> None:
    values = {
        "model": model,
        "temperature": temperature,
        "maxToken": max_token,
        "aiChatReasoning": reasoning,
        "aiChatReasoningEffort": effort,
        "aiChatResponseFormat": response_format,
    }
    for key, value in values.items():
        base.input_by_key(node, key)["value"] = value


def registry_outputs(prefix: str) -> list[tuple[str, str, str]]:
    return [
        (f"{prefix}PoolObject", "evidence_pool", "object"),
        (f"{prefix}PoolJson", "evidence_pool_json", "string"),
        (f"{prefix}NeedsSupplement", "needs_clinical_supplement", "boolean"),
        (f"{prefix}SupplementReason", "supplement_reason", "string"),
        (f"{prefix}InsufficientForFive", "evidence_pool_insufficient_for_five", "boolean"),
        (f"{prefix}QuestionCapacity", "estimated_question_capacity", "number"),
        (f"{prefix}HardCount", "hard_candidate_count", "number"),
        (f"{prefix}InitialStudyCount", "identifiable_initial_study_count", "number"),
        (f"{prefix}SupplementStudyCount", "identifiable_supplement_study_count", "number"),
        (f"{prefix}CompressionReport", "compression_report", "object"),
    ]


def output_id(node: dict[str, Any], key: str) -> str:
    return base.output_by_key(node, key)["id"]


def clean_generator_input(workflow: dict[str, Any], pool_node: dict[str, Any]) -> str:
    fields = [
        ("病例编号", "case_id"),
        ("病例标题", "case_title"),
        ("病种", "disease"),
        ("病例模式", "case_mode"),
        ("初始病例资料", "case_context"),
        ("全程诊疗时间线", "case_timeline"),
        ("病理与生物标志物", "biomarkers"),
        ("重点考查方向", "learning_points"),
        ("关键临床决策点", "decision_points"),
        ("治疗相关不良反应", "adverse_events"),
        ("证据与应用边界", "evidence_notes"),
        ("目标题量", "question_count"),
        ("题目难度", "difficulty"),
    ]
    blocks = [
        f"【{label}】\n{base.global_token(base.variable_key(workflow, key))}"
        for label, key in fields
    ]
    blocks.append(
        "【v1.1最终压缩证据池】\n"
        + base.token(pool_node["nodeId"], output_id(pool_node, "evidence_pool_json"))
    )
    blocks.append(
        "【输入边界】\n只使用上述脱敏病例与压缩证据池；医生文章库原始召回不属于正式证据。"
        "上一轮题目、审核意见和循环次数由系统提示词中的实时变量提供。"
    )
    return "\n\n".join(blocks)


def validation_input(workflow: dict[str, Any], structure: dict[str, Any]) -> str:
    fields = [
        ("病种", "disease"),
        ("病例模式", "case_mode"),
        ("初始病例资料", "case_context"),
        ("全程诊疗时间线", "case_timeline"),
        ("病理与生物标志物", "biomarkers"),
        ("关键临床决策点", "decision_points"),
        ("治疗相关不良反应", "adverse_events"),
        ("证据与应用边界", "evidence_notes"),
    ]
    case = ["【本轮病例资料】"]
    case.extend(
        f"{label}：{base.global_token(base.variable_key(workflow, key))}"
        for label, key in fields
    )
    sections = [
        "\n".join(case),
        "【机械结构状态】\n" + base.token(structure["nodeId"], output_id(structure, "structure_decision")),
        "【机械结构错误】\n" + base.token(structure["nodeId"], output_id(structure, "structure_errors")),
        "【五题实际引用证据】\n" + base.token(structure["nodeId"], output_id(structure, "cited_evidence_json")),
        "【当前待审核题目完整JSON】\n" + base.token(structure["nodeId"], output_id(structure, "candidate_json_passthrough")),
        "【上一轮原始题目草稿】\n" + base.global_token(base.variable_key(workflow, "question_draft")),
        "【上一轮完整审核意见】\n" + base.global_token(base.variable_key(workflow, "review_feedback")),
    ]
    return "\n\n".join(sections)


REVIEW_MERGE_CODE = r'''function main({
  structure_decision,
  structure_errors,
  structure_warnings,
  review_text,
  validator_decision,
  validator_score,
  validator_revision_instruction,
  validator_missing_information,
  validator_general_feedback
}) {
  function asArray(value) {
    if (Array.isArray(value)) return value.map(String);
    if (value === undefined || value === null || value === "") return [];
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(String) : [String(value)];
      } catch (_) { return [String(value)]; }
    }
    return [String(value)];
  }
  function parseObject(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    try {
      const text = String(value ?? "").trim();
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      return start >= 0 && end > start ? JSON.parse(text.slice(start, end + 1)) : {};
    } catch (_) { return {}; }
  }
  const structure = String(structure_decision || "FAIL");
  const errors = asArray(structure_errors);
  const warnings = asArray(structure_warnings);
  if (structure === "FAIL") {
    const feedback = {
      decision: "REVISE",
      score: 0,
      fatal_errors: errors,
      general_feedback: "机械结构硬检失败；本轮未调用独立医学校验。",
      question_checks: [],
      revision_instruction: `一次修复以下全部结构错误：${errors.join("；")}`,
      missing_information: [],
      structure_warnings: warnings
    };
    return {
      decision: "REVISE",
      score: 0,
      revision_instruction: feedback.revision_instruction,
      missing_information: "",
      general_feedback: feedback.general_feedback,
      feedback_json: JSON.stringify(feedback)
    };
  }

  const raw = parseObject(review_text);
  let decision = ["PASS", "REVISE", "STOP_INSUFFICIENT"].includes(String(validator_decision))
    ? String(validator_decision)
    : "REVISE";
  let score = Number(validator_score);
  score = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
  let forcedReason = "";
  if (structure === "INSUFFICIENT" && decision !== "STOP_INSUFFICIENT") {
    decision = "REVISE";
    forcedReason = "生成器声明证据不足，但独立校验未返回STOP_INSUFFICIENT。";
  }
  if (decision === "PASS" && (structure !== "PASS" || score < 75)) {
    decision = "REVISE";
    forcedReason = score < 75 ? "校验总分低于75，禁止PASS。" : "机械结构未PASS，禁止发布。";
  }
  const revision = forcedReason || String(validator_revision_instruction || raw.revision_instruction || "");
  const general = forcedReason || String(validator_general_feedback || raw.general_feedback || "");
  const feedback = {
    ...raw,
    decision,
    score,
    fatal_errors: Array.isArray(raw.fatal_errors) ? raw.fatal_errors : [],
    general_feedback: general,
    question_checks: Array.isArray(raw.question_checks) ? raw.question_checks : [],
    revision_instruction: revision,
    missing_information: raw.missing_information ?? validator_missing_information ?? [],
    structure_warnings: warnings
  };
  return {
    decision,
    score,
    revision_instruction: revision,
    missing_information: typeof feedback.missing_information === "string"
      ? feedback.missing_information
      : JSON.stringify(feedback.missing_information),
    general_feedback: general,
    feedback_json: JSON.stringify(feedback)
  };
}'''


def adapt_irae_merge_code(code: str) -> str:
    pattern = re.compile(
        r"function main\(\{\s*adverse_events,\s*fallback_anchor_a,\s*fallback_anchor_b\s*\}\)\s*\{",
        re.S,
    )
    replacement = r'''function main({ adverse_events, fallback_json }) {
  let fallback_anchor_a = "";
  let fallback_anchor_b = "";
  try {
    const parsed = fallback_json && typeof fallback_json === "object"
      ? fallback_json
      : JSON.parse(String(fallback_json || "{}"));
    fallback_anchor_a = String(parsed.anchor_a || "");
    fallback_anchor_b = String(parsed.anchor_b || "");
  } catch (_) {}'''
    result, count = pattern.subn(replacement, code, count=1)
    if count != 1:
        raise base.MigrationError("irAE deterministic code signature changed")
    return result


def build() -> tuple[dict[str, Any], dict[str, Any]]:
    source_hash_before = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    source = base.load_json(SOURCE)
    workflow, _ = base.migrate(
        source,
        generator_prompt=text(ROOT / "outputs" / "题目生成提示词-循证临床决策版.txt"),
        validator_prompt=text(ROOT / "outputs" / "题目校验提示词-循证临床决策版.txt"),
    )
    workflow["name"] = "OncoRounds-快速稳定五题-v1.1-导入测试版"
    workflow["intro"] = (
        "基于当前导出文件的v1.1测试工作流：固定5道进阶题，2道硬证据+2道病例临床推理，"
        "机械硬检后独立校验，最终PASS且score>=75才输出。导入后先测试，不直接覆盖生产版。"
    )

    loop = base.find_unique_node(workflow, "循环节点", "loopRun")
    start = base.find_unique_node(workflow, "流程开始", "workflowStart")
    code_template = base.find_unique_node(workflow, "题目结构归一化", "code")
    if_template = base.find_unique_node(workflow, "是否存在研究线索", "ifElseNode")
    aggregator = base.find_unique_node(workflow, "文本拼接#2", "textEditor")
    generator = base.find_unique_node(workflow, "题目生成", "chatNode")
    validation_splice = base.find_unique_node(workflow, "校验输入拼接", "textEditor")
    validator = base.find_unique_node(workflow, "题目校验", "chatNode")
    validator_extract = base.find_unique_node(workflow, "校验结果提取", "code")
    review_decision = base.find_unique_node(workflow, "审核决策判断", "ifElseNode")
    save_feedback = base.find_unique_node(workflow, "保存本轮反馈", "variableUpdate")
    final_decision = base.find_unique_node(workflow, "最终结果判断", "ifElseNode")
    research_extract = base.find_unique_node(workflow, "研究线索提取", "code")
    research_if = base.find_unique_node(workflow, "是否存在研究线索", "ifElseNode")
    guideline_a = base.find_unique_node(workflow, "良医汇医学数据库（指南检索）", "tool")
    guideline_b = base.find_unique_node(workflow, "良医汇医学数据库（指南检索B）", "tool")
    study_initial = base.find_unique_node(workflow, "良医汇医学数据库（临床研究检索）", "tool")
    study_supplement = base.find_unique_node(workflow, "良医汇医学数据库（临床研究补检）", "tool")
    irae_tool_a = base.find_unique_node(workflow, "irAE正式指南检索A", "tool")
    irae_tool_b = base.find_unique_node(workflow, "irAE正式指南检索B", "tool")
    irae_if_a = base.find_unique_node(workflow, "是否存在第一项严重irAE", "ifElseNode")
    irae_if_b = base.find_unique_node(workflow, "是否存在第二项严重irAE", "ifElseNode")
    old_anchor_a = base.find_unique_node(workflow, "严重irAE检索锚点A", "chatNode")
    old_anchor_b = base.find_unique_node(workflow, "严重irAE检索锚点B", "chatNode")

    registry_code = text(ARTIFACTS / "证据注册与压缩.js")
    registry_input_nodes = [
        ("guideline_a", guideline_a),
        ("guideline_b", guideline_b),
        ("clinical_study_initial", study_initial),
        ("clinical_study_supplement", study_supplement),
        ("irae_a", irae_tool_a),
        ("irae_b", irae_tool_b),
    ]
    final_registry_old = base.find_unique_node(workflow, "证据注册与压缩", "code")
    final_registry = base.make_code_node(
        code_template,
        node_id=FINAL_REGISTRY_ID,
        name="证据注册与压缩-最终",
        code=registry_code,
        position=final_registry_old["position"],
        parent_node_id=None,
        inputs=[
            (key, "arrayObject", False, [node["nodeId"], output_id(node, "result")])
            for key, node in registry_input_nodes
        ],
        outputs=registry_outputs("v11Final"),
    )
    replace_node(workflow, final_registry_old, final_registry)

    initial_inputs = []
    for key, node in registry_input_nodes:
        reference = [] if key == "clinical_study_supplement" else [node["nodeId"], output_id(node, "result")]
        initial_inputs.append((key, "arrayObject", False, reference))
    initial_registry = base.make_code_node(
        code_template,
        node_id=INITIAL_REGISTRY_ID,
        name="证据注册与压缩-初检",
        code=registry_code,
        position={"x": 270.0, "y": -1120.0},
        parent_node_id=None,
        inputs=initial_inputs,
        outputs=registry_outputs("v11Initial"),
    )
    workflow["nodes"].append(initial_registry)

    base_sources = {
        guideline_a["nodeId"], guideline_b["nodeId"], study_initial["nodeId"],
        irae_tool_a["nodeId"], irae_tool_b["nodeId"], irae_if_a["nodeId"], irae_if_b["nodeId"]
    }
    for edge in workflow["edges"]:
        if edge.get("target") == FINAL_REGISTRY_ID and edge.get("source") in base_sources:
            edge["target"] = INITIAL_REGISTRY_ID
            edge["targetHandle"] = f"{INITIAL_REGISTRY_ID}-target-left"
    base.add_edge(workflow, INITIAL_REGISTRY_ID, research_if["nodeId"])
    branch = base.input_by_key(research_if, "ifElseList")["value"][0]
    branch["list"] = [{
        "variable": [INITIAL_REGISTRY_ID, output_id(initial_registry, "needs_clinical_supplement")],
        "condition": "equalTo",
        "value": "true",
        "valueType": "input",
    }]

    aggregate_input = base.input_by_key(aggregator, "system_textareaInput")
    aggregate_input["value"] = clean_generator_input(workflow, final_registry)

    irae_code = text(ARTIFACTS / "irAE双锚点确定性拆分.js")
    adverse_ref = ["VARIABLE_NODE_ID", base.variable_key(workflow, "adverse_events")]
    irae_initial = base.make_code_node(
        code_template,
        node_id=IRAE_INITIAL_ID,
        name="irAE双锚点确定性拆分-初次",
        code=irae_code,
        position={"x": -2310.0, "y": 1450.0},
        parent_node_id=None,
        inputs=[("adverse_events", "any", True, adverse_ref)],
        outputs=[
            ("v11IraeInitialQueryA", "query_a", "string"),
            ("v11IraeInitialQueryB", "query_b", "string"),
            ("v11IraeInitialHasA", "has_a", "boolean"),
            ("v11IraeInitialHasB", "has_b", "boolean"),
            ("v11IraeNeedsFallback", "needs_fallback", "boolean"),
            ("v11IraeFallbackInput", "fallback_input", "string"),
            ("v11IraeInitialAudit", "unresolved_segments", "arrayObject"),
        ],
    )
    workflow["nodes"].append(irae_initial)

    fallback = old_anchor_a
    fallback["name"] = "irAE锚点轻量回退"
    fallback["intro"] = "仅在确定性拆分无法识别事件或分级时调用一次"
    fallback["position"] = {"x": -1510.0, "y": 1450.0}
    set_chat_config(
        fallback,
        model="qwen3.5-plus-nothinking",
        temperature=0,
        max_token=1200,
        reasoning=False,
        effort=None,
        response_format="json_object",
    )
    base.input_by_key(fallback, "systemPrompt")["value"] = text(ARTIFACTS / "irAE锚点轻量回退-systemPrompt.txt")
    base.input_by_key(fallback, "userChatInput")["value"] = base.token(IRAE_INITIAL_ID, "v11IraeFallbackInput")

    workflow["nodes"].remove(old_anchor_b)
    remove_edges(
        workflow,
        lambda edge: edge.get("source") in {old_anchor_a["nodeId"], old_anchor_b["nodeId"]}
        or edge.get("target") in {old_anchor_a["nodeId"], old_anchor_b["nodeId"]},
    )
    fallback_if = make_if_node(
        if_template,
        node_id=IRAE_FALLBACK_IF_ID,
        name="是否需要irAE轻量回退",
        position={"x": -1940.0, "y": 1450.0},
        parent_node_id=None,
        conditions=[condition([IRAE_INITIAL_ID, "v11IraeNeedsFallback"], "true", "v11IraeFallbackYes")],
    )
    workflow["nodes"].append(fallback_if)

    irae_final = base.make_code_node(
        code_template,
        node_id=IRAE_FINAL_ID,
        name="irAE双锚点确定性拆分-最终",
        code=adapt_irae_merge_code(irae_code),
        position={"x": -1080.0, "y": 1450.0},
        parent_node_id=None,
        inputs=[
            ("adverse_events", "any", True, adverse_ref),
            ("fallback_json", "string", False, [fallback["nodeId"], output_id(fallback, "answerText")]),
        ],
        outputs=[
            ("v11IraeFinalAnchorA", "anchor_a", "string"),
            ("v11IraeFinalAnchorB", "anchor_b", "string"),
            ("v11IraeFinalQueryA", "query_a", "string"),
            ("v11IraeFinalQueryB", "query_b", "string"),
            ("v11IraeFinalHasA", "has_a", "boolean"),
            ("v11IraeFinalHasB", "has_b", "boolean"),
            ("v11IraeFinalNeedsFallback", "needs_fallback", "boolean"),
            ("v11IraeFinalFallbackApplied", "fallback_applied", "boolean"),
            ("v11IraeFinalAudit", "unresolved_segments", "arrayObject"),
        ],
    )
    workflow["nodes"].append(irae_final)
    base.add_edge(workflow, start["nodeId"], IRAE_INITIAL_ID)
    base.add_edge(workflow, IRAE_INITIAL_ID, IRAE_FALLBACK_IF_ID)
    workflow["edges"].append(branch_edge(IRAE_FALLBACK_IF_ID, "v11IraeFallbackYes", fallback["nodeId"]))
    workflow["edges"].append(branch_edge(IRAE_FALLBACK_IF_ID, "ELSE", IRAE_FINAL_ID))
    base.add_edge(workflow, fallback["nodeId"], IRAE_FINAL_ID)
    base.add_edge(workflow, IRAE_FINAL_ID, irae_if_a["nodeId"])
    base.add_edge(workflow, IRAE_FINAL_ID, irae_if_b["nodeId"])
    base.input_by_key(irae_if_a, "ifElseList")["value"][0]["list"] = [{
        "variable": [IRAE_FINAL_ID, "v11IraeFinalHasA"], "condition": "equalTo", "value": "true", "valueType": "input"
    }]
    base.input_by_key(irae_if_b, "ifElseList")["value"][0]["list"] = [{
        "variable": [IRAE_FINAL_ID, "v11IraeFinalHasB"], "condition": "equalTo", "value": "true", "valueType": "input"
    }]
    base.input_by_key(irae_tool_a, "query")["value"] = [IRAE_FINAL_ID, "v11IraeFinalQueryA"]
    base.input_by_key(irae_tool_b, "query")["value"] = [IRAE_FINAL_ID, "v11IraeFinalQueryB"]

    selector = base.find_unique_node(workflow, "校验证据按引用提取", "code")
    workflow["nodes"].remove(selector)
    remove_edges(workflow, lambda edge: edge.get("source") == selector["nodeId"] or edge.get("target") == selector["nodeId"])

    mechanical_code = text(ARTIFACTS / "纯机械结构硬检.js")
    structure = base.make_code_node(
        code_template,
        node_id=code_template["nodeId"],
        name="纯机械结构硬检",
        code=mechanical_code,
        position=code_template["position"],
        parent_node_id=loop["nodeId"],
        inputs=[
            ("candidate_json", "string", True, [generator["nodeId"], output_id(generator, "answerText")]),
            ("evidence_pool", "object", True, [FINAL_REGISTRY_ID, output_id(final_registry, "evidence_pool")]),
        ],
        outputs=[
            ("v11StructureDecision", "structure_decision", "string"),
            ("v11StructureErrors", "structure_errors", "arrayString"),
            ("v11StructureWarnings", "structure_warnings", "arrayString"),
            ("v11CandidatePassthrough", "candidate_json_passthrough", "string"),
            ("v11CitedEvidence", "cited_evidence", "arrayObject"),
            ("v11CitedEvidenceJson", "cited_evidence_json", "string"),
            ("v11HardEvidenceCount", "hard_evidence_count", "number"),
            ("v11ReasoningCount", "clinical_reasoning_count", "number"),
        ],
    )
    replace_node(workflow, code_template, structure)

    structure_if = make_if_node(
        if_template,
        node_id=STRUCTURE_IF_ID,
        name="机械结构结果判断",
        position={"x": 5000.0, "y": -300.0},
        parent_node_id=loop["nodeId"],
        conditions=[
            condition([structure["nodeId"], "v11StructureDecision"], "PASS", "v11StructurePass"),
            condition([structure["nodeId"], "v11StructureDecision"], "INSUFFICIENT", "v11StructureInsufficient"),
        ],
    )
    workflow["nodes"].append(structure_if)
    base.input_by_key(validation_splice, "system_textareaInput")["value"] = validation_input(workflow, structure)

    review_merge = base.make_code_node(
        structure,
        node_id=REVIEW_MERGE_ID,
        name="本轮审核结果归一",
        code=REVIEW_MERGE_CODE,
        position={"x": 7350.0, "y": -880.0},
        parent_node_id=loop["nodeId"],
        inputs=[
            ("structure_decision", "string", True, [structure["nodeId"], "v11StructureDecision"]),
            ("structure_errors", "arrayString", False, [structure["nodeId"], "v11StructureErrors"]),
            ("structure_warnings", "arrayString", False, [structure["nodeId"], "v11StructureWarnings"]),
            ("review_text", "string", False, [validator["nodeId"], output_id(validator, "answerText")]),
            ("validator_decision", "string", False, [validator_extract["nodeId"], output_id(validator_extract, "decision")]),
            ("validator_score", "number", False, [validator_extract["nodeId"], output_id(validator_extract, "score")]),
            ("validator_revision_instruction", "string", False, [validator_extract["nodeId"], output_id(validator_extract, "revision_instruction")]),
            ("validator_missing_information", "string", False, [validator_extract["nodeId"], output_id(validator_extract, "missing_information")]),
            ("validator_general_feedback", "string", False, [validator_extract["nodeId"], output_id(validator_extract, "general_feedback")]),
        ],
        outputs=[
            ("v11ReviewDecision", "decision", "string"),
            ("v11ReviewScore", "score", "number"),
            ("v11ReviewRevision", "revision_instruction", "string"),
            ("v11ReviewMissing", "missing_information", "string"),
            ("v11ReviewGeneral", "general_feedback", "string"),
            ("v11ReviewFeedbackJson", "feedback_json", "string"),
        ],
    )
    workflow["nodes"].append(review_merge)

    remove_edges(
        workflow,
        lambda edge: (edge.get("source") == structure["nodeId"] and edge.get("target") == validation_splice["nodeId"])
        or (edge.get("source") == validator_extract["nodeId"] and edge.get("target") == review_decision["nodeId"]),
    )
    base.add_edge(workflow, structure["nodeId"], STRUCTURE_IF_ID)
    workflow["edges"].append(branch_edge(STRUCTURE_IF_ID, "v11StructurePass", validation_splice["nodeId"]))
    workflow["edges"].append(branch_edge(STRUCTURE_IF_ID, "v11StructureInsufficient", validation_splice["nodeId"]))
    workflow["edges"].append(branch_edge(STRUCTURE_IF_ID, "ELSE", REVIEW_MERGE_ID))
    base.add_edge(workflow, validator_extract["nodeId"], REVIEW_MERGE_ID)
    base.add_edge(workflow, REVIEW_MERGE_ID, review_decision["nodeId"])

    pass_branch = base.input_by_key(review_decision, "ifElseList")["value"][0]
    pass_branch["list"] = [
        {"variable": [REVIEW_MERGE_ID, "v11ReviewDecision"], "condition": "equalTo", "value": "PASS", "valueType": "input"},
        {"variable": [REVIEW_MERGE_ID, "v11ReviewScore"], "condition": "greaterThanOrEqualTo", "value": "75", "valueType": "input"},
    ]
    stop_branch = base.input_by_key(review_decision, "ifElseList")["value"][1]
    stop_branch["list"] = [
        {"variable": [REVIEW_MERGE_ID, "v11ReviewDecision"], "condition": "equalTo", "value": "STOP_INSUFFICIENT", "valueType": "input"}
    ]

    updates = base.input_by_key(save_feedback, "updateList")["value"]
    updates[0]["value"] = [structure["nodeId"], "v11CandidatePassthrough"]
    updates[1]["value"] = [REVIEW_MERGE_ID, "v11ReviewFeedbackJson"]

    children = base.input_by_key(loop, "childrenNodeIdList")["value"]
    children = [item for item in children if item != selector["nodeId"]]
    for item in (STRUCTURE_IF_ID, REVIEW_MERGE_ID):
        if item not in children:
            children.append(item)
    base.input_by_key(loop, "childrenNodeIdList")["value"] = children
    for key, ref in {
        "final_questions_json": [structure["nodeId"], "v11CandidatePassthrough"],
        "validation_decision": [REVIEW_MERGE_ID, "v11ReviewDecision"],
        "validation_score": [REVIEW_MERGE_ID, "v11ReviewScore"],
        "validation_feedback": [REVIEW_MERGE_ID, "v11ReviewFeedbackJson"],
        "missing_information": [REVIEW_MERGE_ID, "v11ReviewMissing"],
    }.items():
        base.input_by_key(loop, key)["value"] = ref

    final_pass = base.input_by_key(final_decision, "ifElseList")["value"][0]
    final_pass["list"] = [
        {"variable": [loop["nodeId"], "validation_decision"], "condition": "equalTo", "value": "PASS", "valueType": "input"},
        {"variable": [loop["nodeId"], "validation_score"], "condition": "greaterThanOrEqualTo", "value": "75", "valueType": "input"},
    ]

    set_chat_config(generator, model="deepseek-v4-pro", temperature=0.1, max_token=16384, reasoning=True, effort="medium", response_format="json_object")
    set_chat_config(validator, model="deepseek-v4-pro", temperature=0.1, max_token=16384, reasoning=True, effort="medium", response_format="json_object")

    # FastGPT refuses to run a graph containing a fully disconnected node.
    # The user explicitly chose deletion over reconnecting this extra LLM call.
    plan_gate = base.find_unique_node(workflow, "出题计划与证据门禁", "chatNode")
    workflow["nodes"].remove(plan_gate)
    remove_edges(
        workflow,
        lambda edge: edge.get("source") == plan_gate["nodeId"]
        or edge.get("target") == plan_gate["nodeId"],
    )

    source_hash_after = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    if source_hash_after != source_hash_before:
        raise base.MigrationError("source export changed while building")
    audit = audit_workflow(workflow)
    audit.update({
        "source": str(SOURCE),
        "source_sha256": source_hash_after,
        "output": str(OUTPUT),
        "import_ready": not audit["errors"],
        "DO_NOT_IMPORT": False,
    })
    return workflow, audit


def audit_workflow(workflow: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    nodes = workflow.get("nodes", [])
    edges = workflow.get("edges", [])
    ids = [str(node.get("nodeId", "")) for node in nodes]
    if len(ids) != len(set(ids)):
        errors.append("duplicate nodeId")
    node_by_id = {str(node.get("nodeId")): node for node in nodes}
    for edge in edges:
        if str(edge.get("source")) not in node_by_id or str(edge.get("target")) not in node_by_id:
            errors.append(f"dangling edge: {edge}")
    incoming_count = {
        node_id: sum(1 for edge in edges if str(edge.get("target")) == node_id)
        for node_id in node_by_id
    }
    outgoing_count = {
        node_id: sum(1 for edge in edges if str(edge.get("source")) == node_id)
        for node_id in node_by_id
    }
    allowed_no_incoming = {"userGuide", "workflowStart", "loopRunStart"}
    allowed_no_outgoing = {"userGuide", "loopRunBreak", "answerNode"}
    for node_id, node in node_by_id.items():
        node_type = str(node.get("flowNodeType", ""))
        node_name = str(node.get("name", ""))
        incoming = incoming_count[node_id]
        outgoing = outgoing_count[node_id]
        if incoming == 0 and node_type not in allowed_no_incoming:
            errors.append(f"node has no incoming edge: {node_name}")
        if (
            outgoing == 0
            and node_type not in allowed_no_outgoing
            and node_name != "保存本轮反馈"
        ):
            errors.append(f"node has no outgoing edge: {node_name}")
        if incoming == 0 and outgoing == 0 and node_type != "userGuide":
            errors.append(f"isolated executable node: {node_name}")
    for node in nodes:
        for item in node.get("inputs", []):
            value = item.get("value")
            if not (isinstance(value, list) and len(value) == 2 and all(isinstance(part, str) for part in value)):
                continue
            source_id, source_output = value
            if source_id == "VARIABLE_NODE_ID":
                continue
            source = node_by_id.get(source_id)
            if source is None:
                errors.append(f"{node.get('name')}.{item.get('key')} references missing node {source_id}")
                continue
            output_ids = {str(out.get("id")) for out in source.get("outputs", [])}
            if source_output not in output_ids:
                errors.append(f"{node.get('name')}.{item.get('key')} references missing output {source_id}.{source_output}")
    expected_names = [
        "证据注册与压缩-初检", "证据注册与压缩-最终", "irAE双锚点确定性拆分-初次",
        "irAE锚点轻量回退", "irAE双锚点确定性拆分-最终", "纯机械结构硬检",
        "机械结构结果判断", "本轮审核结果归一",
    ]
    for name in expected_names:
        if sum(1 for node in nodes if node.get("name") == name) != 1:
            errors.append(f"expected one node: {name}")
    if any(node.get("name") == "严重irAE检索锚点B" for node in nodes):
        errors.append("old second irAE anchor model still present")
    if any(node.get("name") == "出题计划与证据门禁" for node in nodes):
        errors.append("disconnected planning model remains in importable graph")
    for name in ("题目生成", "题目校验"):
        node = next(node for node in nodes if node.get("name") == name)
        checks = {
            "model": "deepseek-v4-pro", "temperature": 0.1, "maxToken": 16384,
            "aiChatResponseFormat": "json_object", "aiChatReasoning": True,
        }
        for key, expected in checks.items():
            actual = base.input_by_key(node, key).get("value")
            if actual != expected:
                errors.append(f"{name}.{key}={actual!r}, expected {expected!r}")
    if "DO_NOT_IMPORT" in json.dumps(workflow, ensure_ascii=False):
        errors.append("workflow still contains DO_NOT_IMPORT marker")
    if "2—5题弹性生成" in base.input_by_key(next(node for node in nodes if node.get("name") == "文本拼接#2"), "system_textareaInput").get("value", ""):
        errors.append("generator input still contains old 2-5 contract")
    if len(nodes) < 40:
        warnings.append(f"node count is unexpectedly low: {len(nodes)}")
    return {
        "status": "PASS" if not errors else "FAIL",
        "errors": errors,
        "warnings": warnings,
        "node_count": len(nodes),
        "edge_count": len(edges),
    }


def main() -> int:
    workflow, audit = build()
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    if audit["errors"]:
        REPORT.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(audit, ensure_ascii=False, indent=2))
        return 2
    OUTPUT.write_text(json.dumps(workflow, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    audit["output_sha256"] = hashlib.sha256(OUTPUT.read_bytes()).hexdigest()
    REPORT.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(audit, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
