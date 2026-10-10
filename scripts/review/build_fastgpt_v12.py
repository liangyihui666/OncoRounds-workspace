#!/usr/bin/env python3
"""Build the importable OncoRounds v1.2 FastGPT workflow.

The only workflow base is ``C:/Users/admin/Downloads/题目生成 Copy.json``.
The source is hash-locked and never written.  This builder removes the loop
container, expands two explicit rounds, installs deterministic evidence
assembly/patch gates, and emits both the importable workflow and a build audit.
"""

from __future__ import annotations

import copy
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any, Iterable

import migrate_fastgpt_v11 as base


ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path("C:/Users/admin/Downloads/题目生成 Copy.json")
EXPECTED_SOURCE_SHA256 = "c8920c852baa6f68451654f167c00af14f2f55932535747291f67348e94858b1"
ARTIFACTS = ROOT / "outputs" / "快速稳定五题-v1.2"
OUTPUT = ARTIFACTS / "题目生成-v1.2-Qwen显式双轮-可导入.json"
STAGING_OUTPUT = ARTIFACTS / ".题目生成-v1.2-Qwen显式双轮-待验证.json"
REPORT = ARTIFACTS / "题目生成-v1.2-Qwen显式双轮-构建审计报告.json"

GENERATOR_PROMPT = ARTIFACTS / "题目生成-systemPrompt.txt"
VALIDATOR_PROMPT = ARTIFACTS / "题目校验-systemPrompt.txt"
REVISION_PROMPT = ARTIFACTS / "题目修订-systemPrompt.txt"
REGISTRY_CODE = ARTIFACTS / "证据注册与压缩-v1.2.js"
RESEARCH_EXTRACTOR_CODE = ARTIFACTS / "研究线索提取-v1.2.js"
ASSEMBLY_CODE = ARTIFACTS / "候选题装配与硬检.js"
PATCH_MERGE_CODE = ARTIFACTS / "修订补丁合并与复检.js"
CASE_PACKET_CODE_PATH = ARTIFACTS / "病例输入精确去重.js"
ASSET_SELF_TEST = ARTIFACTS / "自测-v1.2.js"
GATE_SELF_TEST = ROOT / "scripts" / "review" / "test_fastgpt_v12_gates.js"
DEPLOYMENT_README = ARTIFACTS / "README-部署说明.md"


NEED_SUPPLEMENT_ID = "v12NeedClinicalSupplement"
CASE_PACKET_ID = "v12CasePacket"
R2_INPUT_ID = "v12RevisionInput"
R2_GENERATOR_ID = "v12RevisionGenerator"
R2_PATCH_MERGE_ID = "v12PatchMerge"
R2_ASSEMBLY_ID = "v12AssemblyR2"
R2_AUDITABLE_IF_ID = "v12AuditableIfR2"
R2_VALIDATION_INPUT_ID = "v12ValidationInputR2"
R2_VALIDATOR_ID = "v12ValidatorR2"
R2_REVIEW_MERGE_ID = "v12ReviewMergeR2"
FINAL_NORMALIZE_ID = "v12FinalPublicationNormalize"
FINAL_SPLIT_ID = "v12FinalPublicationSplit"


class BuildError(RuntimeError):
    """Raised when the source no longer matches the reviewed workflow shape."""


def read_text(path: Path) -> str:
    if not path.is_file():
        raise BuildError(f"required v1.2 asset is missing: {path}")
    return path.read_text(encoding="utf-8-sig")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def find(workflow: dict[str, Any], name: str, node_type: str | None = None) -> dict[str, Any]:
    try:
        return base.find_unique_node(workflow, name, node_type)
    except base.MigrationError as exc:
        raise BuildError(str(exc)) from exc


def input_item(node: dict[str, Any], key: str) -> dict[str, Any]:
    try:
        return base.input_by_key(node, key)
    except base.MigrationError as exc:
        raise BuildError(str(exc)) from exc


def output_item(node: dict[str, Any], key: str) -> dict[str, Any]:
    try:
        return base.output_by_key(node, key)
    except base.MigrationError as exc:
        raise BuildError(str(exc)) from exc


def output_id(node: dict[str, Any], key: str) -> str:
    return str(output_item(node, key)["id"])


def global_key(workflow: dict[str, Any], label: str) -> str:
    try:
        return base.variable_key(workflow, label)
    except base.MigrationError as exc:
        raise BuildError(str(exc)) from exc


def replace_node(workflow: dict[str, Any], old: dict[str, Any], new: dict[str, Any]) -> None:
    workflow["nodes"][workflow["nodes"].index(old)] = new


def remove_nodes(workflow: dict[str, Any], nodes: Iterable[dict[str, Any]]) -> None:
    removed = {str(node["nodeId"]) for node in nodes}
    workflow["nodes"] = [node for node in workflow["nodes"] if str(node.get("nodeId")) not in removed]
    workflow["edges"] = [
        edge
        for edge in workflow["edges"]
        if str(edge.get("source")) not in removed and str(edge.get("target")) not in removed
    ]


def remove_edges(workflow: dict[str, Any], predicate) -> None:
    workflow["edges"] = [edge for edge in workflow["edges"] if not predicate(edge)]


def make_edge(source: str, target: str, branch_id: str | None = None) -> dict[str, str]:
    handle = f"{source}-source-{branch_id}" if branch_id is not None else f"{source}-source-right"
    return {
        "source": source,
        "target": target,
        "sourceHandle": handle,
        "targetHandle": f"{target}-target-left",
    }


def add_edge(workflow: dict[str, Any], source: str, target: str, branch_id: str | None = None) -> None:
    candidate = make_edge(source, target, branch_id)
    key = (candidate["source"], candidate["target"], candidate["sourceHandle"])
    if any((edge.get("source"), edge.get("target"), edge.get("sourceHandle")) == key for edge in workflow["edges"]):
        return
    workflow["edges"].append(candidate)


def condition(variable: list[str], operator: str, value: str, branch_id: str) -> dict[str, Any]:
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


def make_if_node(
    template: dict[str, Any],
    *,
    node_id: str,
    name: str,
    position: dict[str, float],
    conditions: list[dict[str, Any]],
) -> dict[str, Any]:
    node = copy.deepcopy(template)
    node.update(
        {
            "nodeId": node_id,
            "name": name,
            "intro": "OncoRounds v1.2 deterministic branch gate",
            "position": position,
        }
    )
    node.pop("parentNodeId", None)
    input_item(node, "ifElseList")["value"] = conditions
    return node


def make_code_node(
    template: dict[str, Any],
    *,
    node_id: str,
    name: str,
    code: str,
    position: dict[str, float],
    inputs: list[tuple[str, str, bool, list[str]]],
    outputs: list[tuple[str, str, str]],
) -> dict[str, Any]:
    try:
        node = base.make_code_node(
            template,
            node_id=node_id,
            name=name,
            code=code,
            position=position,
            parent_node_id=None,
            inputs=inputs,
            outputs=outputs,
        )
    except base.MigrationError as exc:
        raise BuildError(str(exc)) from exc
    node["intro"] = "OncoRounds v1.2 deterministic code gate"
    node.pop("parentNodeId", None)
    for item in node.get("inputs", []):
        if item.get("key") not in {"system_addInputParam", "codeType", "code"}:
            # FastGPT only registers copied/custom code inputs when canEdit=true.
            item["canEdit"] = True
    return node


def clone_text_node(
    template: dict[str, Any], *, node_id: str, name: str, position: dict[str, float], value: str
) -> dict[str, Any]:
    node = copy.deepcopy(template)
    node.update({"nodeId": node_id, "name": name, "position": position})
    node["intro"] = "OncoRounds v1.2 compact deterministic input"
    node.pop("parentNodeId", None)
    input_item(node, "system_textareaInput")["value"] = value
    return node


def configure_chat(
    node: dict[str, Any],
    *,
    prompt: str,
    user_input: list[str],
    reasoning: bool,
    effort: str,
    max_tokens: int,
) -> None:
    values: dict[str, Any] = {
        "model": "qwen3.5-plus",
        "temperature": 0.1,
        "maxToken": max_tokens,
        "aiChatVision": False,
        "aiChatAudio": False,
        "aiChatVideo": False,
        "aiChatExtractFiles": False,
        "aiChatReasoning": reasoning,
        "aiChatReasoningEffort": effort,
        "aiChatResponseFormat": "json_object",
        "systemPrompt": prompt,
        "userChatInput": user_input,
    }
    for key, value in values.items():
        input_item(node, key)["value"] = value
    node.pop("parentNodeId", None)


def clone_chat_node(
    template: dict[str, Any],
    *,
    node_id: str,
    name: str,
    position: dict[str, float],
    prompt: str,
    user_input: list[str],
    reasoning: bool,
    effort: str,
    max_tokens: int,
) -> dict[str, Any]:
    node = copy.deepcopy(template)
    node.update({"nodeId": node_id, "name": name, "position": position})
    node["intro"] = "OncoRounds v1.2 explicit round model"
    configure_chat(
        node,
        prompt=prompt,
        user_input=user_input,
        reasoning=reasoning,
        effort=effort,
        max_tokens=max_tokens,
    )
    return node


def registry_outputs(prefix: str) -> list[tuple[str, str, str]]:
    return [
        (f"{prefix}PoolObject", "evidence_pool", "object"),
        (f"{prefix}PoolJson", "evidence_pool_json", "string"),
        (f"{prefix}RetrievalHealthOk", "retrieval_health_ok", "boolean"),
        (f"{prefix}RetrievalHealth", "retrieval_health", "object"),
        (f"{prefix}RetrievalErrors", "retrieval_errors", "arrayObject"),
        (f"{prefix}NeedsSupplement", "needs_clinical_supplement", "boolean"),
        (f"{prefix}SupplementDecision", "supplement_decision", "string"),
        (f"{prefix}SupplementReason", "supplement_reason", "string"),
        (f"{prefix}InsufficientForFive", "evidence_pool_insufficient_for_five", "boolean"),
        (f"{prefix}QuestionCapacity", "estimated_question_capacity", "number"),
        (f"{prefix}HardCount", "hard_candidate_count", "number"),
        (f"{prefix}EligibleCount", "eligible_candidate_count", "number"),
        (f"{prefix}InitialStudyCount", "identifiable_initial_study_count", "number"),
        (f"{prefix}SupplementStudyCount", "identifiable_supplement_study_count", "number"),
        (f"{prefix}CompressionReport", "compression_report", "object"),
        (f"{prefix}CompressionReportJson", "compression_report_json", "string"),
    ]


ASSEMBLY_OUTPUTS = [
    ("v12StructureDecision", "structure_decision", "string"),
    ("v12StructureErrors", "structure_errors", "arrayString"),
    ("v12StructureWarnings", "structure_warnings", "arrayString"),
    ("v12MedicalAuditable", "medical_auditable", "boolean"),
    ("v12CandidatePublic", "candidate_json_passthrough", "string"),
    ("v12PublicReferenceMap", "public_reference_map_json", "string"),
    ("v12CandidateInternal", "internal_candidate_json", "string"),
    ("v12CitedEvidenceRecords", "cited_evidence", "arrayObject"),
    ("v12CitedEvidence", "cited_evidence_json", "string"),
    ("v12ValidatorEvidence", "validator_evidence_json", "string"),
    ("v12RepairTasks", "repair_tasks", "arrayObject"),
    ("v12RepairTasksJson", "repair_tasks_json", "string"),
    ("v12MechanicalRevisionMode", "recommended_revision_mode", "string"),
    ("v12HardCount", "hard_evidence_count", "number"),
    ("v12ReasoningCount", "clinical_reasoning_count", "number"),
]


PATCH_MERGE_OUTPUTS = [
    ("v12MergedInternal", "merged_internal_json", "string"),
    ("v12PatchDecision", "merge_decision", "string"),
    ("v12PatchErrors", "merge_errors", "arrayString"),
    ("v12ChangedIds", "changed_ids", "arrayString"),
    ("v12PreservedIds", "preserved_ids", "arrayString"),
]


REVIEW_OUTPUTS = [
    ("v12ReviewDecision", "decision", "string"),
    ("v12ReviewScore", "score", "number"),
    ("v12ReviewMode", "revision_mode", "string"),
    ("v12ReviewTasks", "repair_tasks", "arrayObject"),
    ("v12ReviewPreserve", "preserve_ids", "arrayString"),
    ("v12RepairPacket", "repair_packet_json", "string"),
    ("v12ReviewFeedback", "feedback_json", "string"),
    ("v12ReviewMissing", "missing_information", "string"),
    ("v12ReviewGeneral", "general_feedback", "string"),
    ("v12ReviewPublishable", "publishable", "boolean"),
]


def review_merge_code(*, second_round: bool) -> str:
    round_literal = "2" if second_round else "1"
    merge_guard = r'''
  const patchDecision = String(patch_merge_decision || "");
  const patchErrors = asStrings(patch_merge_errors);
  const patchPass = patchDecision === "PASS" && patchErrors.length === 0;
  const patchInsufficient = patchDecision === "INSUFFICIENT" && patchErrors.length === 0;
  const patchTransportOk = patchPass || patchInsufficient;
''' if second_round else r'''
  const patchDecision = "NOT_APPLICABLE";
  const patchErrors = [];
  const patchPass = true;
  const patchInsufficient = false;
  const patchTransportOk = true;
'''
    return r'''function main({
  structure_decision, structure_errors, structure_warnings, medical_auditable,
  mechanical_revision_mode,
  mechanical_repair_tasks, candidate_internal_json, candidate_public_json,
  review_text, patch_merge_decision, patch_merge_errors
}) {
  const ROUND = __ROUND__;
  const IDS = ["Q1", "Q2", "Q3", "Q4", "Q5"];
  const FULL_QUESTION_FIELDS = [
    "type", "phase", "timepoint", "question", "options", "answer",
    "answer_text", "explain", "keyPoint", "evidence_id", "support_mode",
    "evidence_summary"
  ];
  const FULL_FIELD_SET = new Set(FULL_QUESTION_FIELDS);
  const EVIDENCE_BINDING_FIELDS = new Set([
    "guidelineRef", "evidence_type", "doc_id", "split_index", "authority",
    "source_title", "source_version", "source_section", "source_url"
  ]);
  const ROOT_ONLY_FIELDS = new Set([
    "schema_version", "generation_status", "case_summary", "question_count",
    "questions", "difficulty", "missing_information", "risk_message", "evidence_pool"
  ]);
  function asStrings(value) {
    if (Array.isArray(value)) return value.map((item) => String(item));
    if (value === undefined || value === null || value === "") return [];
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [value];
      } catch (_) { return [value]; }
    }
    return [String(value)];
  }
  function asObjects(value) {
    if (Array.isArray(value)) return value.filter((item) => item && typeof item === "object");
    if (value && typeof value === "object") return [value];
    if (typeof value === "string" && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === "object") : [];
      } catch (_) { return []; }
    }
    return [];
  }
  function parseExact(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch (_) { return null; }
  }
  function isExactEmptyArray(value) {
    return Array.isArray(value) && value.length === 0;
  }
  function validMissingInformation(value) {
    return Array.isArray(value) && value.length > 0 &&
      value.every((item) => typeof item === "string" && item.trim().length > 0);
  }
  function validPassQuestionChecks(value) {
    if (!Array.isArray(value) || value.length !== IDS.length) return false;
    const ids = value.map((item) =>
      item && typeof item === "object" && typeof item.id === "string" ? item.id : ""
    );
    if (new Set(ids).size !== IDS.length || IDS.some((id) => !ids.includes(id))) return false;
    return value.every(
      (item) => item && typeof item === "object" &&
        typeof item.id === "string" && IDS.includes(item.id) &&
        item.passed === true &&
        Array.isArray(item?.problems) && item.problems.length === 0 &&
        typeof item.revision === "string" && item.revision === ""
    );
  }
  function normalizeCode(value, origin) {
    const fallback = origin === "mechanical" ? "STRUCTURE_ERROR" : "MEDICAL_ERROR";
    if (typeof value !== "string") return fallback;
    const normalized = value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return /^[A-Z][A-Z0-9_]*$/.test(normalized) ? normalized : fallback;
  }
  function normalizeTask(task, origin) {
    const targetIds = Array.isArray(task?.target_ids)
      ? task.target_ids.map(String).filter((id) => IDS.includes(id))
      : (IDS.includes(String(task?.id || "")) ? [String(task.id)] : []);
    const rawFields = Array.isArray(task?.fields) ? task.fields.map(String).filter(Boolean) : [];
    const rootOnly = rawFields.length > 0 && rawFields.every((field) => ROOT_ONLY_FIELDS.has(field));
    const mappedFields = rootOnly
      ? rawFields
      : rawFields.flatMap((field) => {
          if (FULL_FIELD_SET.has(field)) return [field];
          if (EVIDENCE_BINDING_FIELDS.has(field)) return [field];
          if (field === "all") return [...FULL_QUESTION_FIELDS];
          return [];
        });
    const fields = Array.from(new Set(mappedFields));
    if (fields.length === 0) fields.push(...FULL_QUESTION_FIELDS);
    const rawCodes = Array.isArray(task?.codes) && task.codes.length
      ? task.codes
      : [task?.code];
    const codes = Array.from(new Set(rawCodes.map((code) => normalizeCode(code, origin))));
    return codes.map((code) => {
      const candidateMessage = [task?.message, task?.instruction, task?.revision]
        .find((value) => typeof value === "string" && value.trim().length > 0);
      return {
        target_ids: targetIds,
        code,
        fields,
        message: candidateMessage || code,
        origin
      };
    });
  }

  const structure = String(structure_decision || "FAIL");
  const mechanicalMode = ["PATCH", "FULL"].includes(String(mechanical_revision_mode))
    ? String(mechanical_revision_mode)
    : "";
  const structureErrors = asStrings(structure_errors);
  const structureWarnings = asStrings(structure_warnings);
  const mechanical = asObjects(mechanical_repair_tasks).flatMap((task) => normalizeTask(task, "mechanical"));
  const auditable = medical_auditable === true || String(medical_auditable) === "true";
  const review = auditable ? parseExact(review_text) : null;
  const allowed = new Set(["PASS", "REVISE", "STOP_INSUFFICIENT"]);
  const decisionIsExact =
    review && typeof review.decision === "string" && allowed.has(review.decision);
  let validatorDecision = decisionIsExact ? review.decision : "REVISE";
  const rawScore = review?.score;
  const scoreIsValidInteger =
    typeof rawScore === "number" && Number.isInteger(rawScore) && rawScore >= 0 && rawScore <= 100;
  let score = scoreIsValidInteger ? rawScore : 0;
  const medical = review
    ? asObjects(review.repair_tasks).flatMap((task) => normalizeTask(task, "medical"))
    : [];
  const allTasks = [...mechanical, ...medical];
  const declaredValidatorDecision = validatorDecision;
  if (review && !scoreIsValidInteger) {
    validatorDecision = "REVISE";
    score = 0;
    allTasks.push({
      target_ids: [], code: "VALIDATOR_SCORE_INVALID", fields: [...FULL_QUESTION_FIELDS],
      message: "校验器score必须是0至100的JSON整数；非整数或越界分数不得发布。", origin: "medical"
    });
  }
  if (
    review && validatorDecision === "PASS" &&
    (
      !isExactEmptyArray(review.fatal_errors) ||
      !isExactEmptyArray(review.repair_tasks) ||
      !isExactEmptyArray(review.missing_information) ||
      typeof review.recommended_revision_mode !== "string" ||
      review.recommended_revision_mode !== "" ||
      typeof review.revision_instruction !== "string" ||
      review.revision_instruction !== "" ||
      !scoreIsValidInteger || score < 75 ||
      !validPassQuestionChecks(review.question_checks)
    )
  ) {
    validatorDecision = "REVISE";
    allTasks.push({
      target_ids: [], code: "VALIDATOR_PASS_INCONSISTENT", fields: [...FULL_QUESTION_FIELDS],
      message: "校验器声称PASS但错误、修订任务、缺失信息、修订模式或逐题检查不一致。", origin: "medical"
    });
  }
  if (
    review && validatorDecision === "STOP_INSUFFICIENT" &&
    (
      !isExactEmptyArray(review.repair_tasks) ||
      !isExactEmptyArray(review.question_checks) ||
      !validMissingInformation(review.missing_information) ||
      !Array.isArray(review.fatal_errors) ||
      typeof review.recommended_revision_mode !== "string" ||
      review.recommended_revision_mode !== "" ||
      typeof review.revision_instruction !== "string" ||
      review.revision_instruction !== ""
    )
  ) {
    validatorDecision = "REVISE";
    allTasks.push({
      target_ids: [], code: "VALIDATOR_STOP_INCONSISTENT", fields: [...FULL_QUESTION_FIELDS],
      message: "校验器的STOP_INSUFFICIENT缺少完整证据缺口或夹带了题目修订内容。", origin: "medical"
    });
  }
  if (!auditable) {
    validatorDecision = "REVISE";
    score = 0;
    if (allTasks.length === 0) {
      allTasks.push({
        target_ids: [], code: "NO_AUDITABLE_DRAFT", fields: [...FULL_QUESTION_FIELDS],
        message: "候选无法解析或完全没有可审核题目，第二轮必须FULL重建。", origin: "mechanical"
      });
    }
  } else if (!review) {
    validatorDecision = "REVISE";
    score = 0;
    allTasks.push({
      target_ids: [], code: "VALIDATOR_JSON_INVALID", fields: [...FULL_QUESTION_FIELDS],
      message: "独立医学校验未返回可直接解析的JSON。", origin: "medical"
    });
  }
__MERGE_GUARD__
  for (const message of patchErrors) {
    allTasks.push({
      target_ids: [], code: "PATCH_MERGE_FAILED", fields: [...FULL_QUESTION_FIELDS], message, origin: "mechanical"
    });
  }

  let decision = validatorDecision;
  const parsedCandidate = parseExact(candidate_internal_json);
  const candidateInsufficient = parsedCandidate?.generation_status === "insufficient";
  if (decision === "PASS" && (structure !== "PASS" || score < 75 || !patchPass)) {
    decision = "REVISE";
  }
  if (decision === "STOP_INSUFFICIENT") {
    const structureAllowsStop = structure === "INSUFFICIENT";
    const patchAllowsStop = ROUND === 1 || patchInsufficient;
    if (!candidateInsufficient || !structureAllowsStop || !patchAllowsStop) decision = "REVISE";
  }
  if (!auditable || !review || !patchTransportOk) decision = "REVISE";

  if (decision === "REVISE" && allTasks.length === 0) {
    allTasks.push({
      target_ids: [], code: "REVIEW_REVISE", fields: [...FULL_QUESTION_FIELDS],
      message: String(review?.revision_instruction || "按独立审核意见完整修订候选题。"), origin: "medical"
    });
  }
  const rootOrSetTask = allTasks.some((task) => task.target_ids.length === 0);
  const requestedMode = typeof review?.recommended_revision_mode === "string"
    ? review.recommended_revision_mode
    : "INVALID";
  const targets = Array.from(new Set(allTasks.flatMap((task) => task.target_ids))).filter((id) => IDS.includes(id));
  const revisionMode = decision === "REVISE"
    ? (
        rootOrSetTask || mechanicalMode === "FULL" || requestedMode === "FULL" || targets.length === 0
          ? "FULL"
          : "PATCH"
      )
    : "";
  const rootOnlyTask = (task) =>
    Array.isArray(task.fields) && task.fields.length > 0 &&
    task.fields.every((field) => ROOT_ONLY_FIELDS.has(field));
  const cleanTasks = allTasks.map(({ target_ids, code, fields, message }) => {
    const isRootOnly = rootOnlyTask({ fields });
    return {
      target_ids:
        revisionMode === "FULL" && target_ids.length === 0 && !isRootOnly
          ? [...IDS]
          : target_ids,
      code,
      fields,
      message
    };
  });
  const effectiveTargets = Array.from(new Set(
    cleanTasks.filter((task) => !rootOnlyTask(task)).flatMap((task) => task.target_ids)
  ));
  const existingIds = Array.isArray(parsedCandidate?.questions)
    ? Array.from(new Set(
        parsedCandidate.questions
          .map((question) => String(question?.id || ""))
          .filter((id) => IDS.includes(id))
      ))
    : [];
  const preserveIds = revisionMode
    ? existingIds.filter((id) => !effectiveTargets.includes(id))
    : [];
  const repairPacket = {
    revision_mode: revisionMode,
    repair_tasks: cleanTasks,
    preserve_ids: preserveIds
  };
  const missing = review?.missing_information ?? [];
  const general = !auditable
    ? "候选不可医审；已生成FULL修订任务。"
    : String(review?.general_feedback || (decision === "PASS" ? "独立审核通过。" : "已合并结构与医学审核。"));
  const feedback = {
    round: ROUND,
    decision,
    score,
    declared_validator_decision: declaredValidatorDecision,
    validator_decision: validatorDecision,
    structure_decision: structure,
    structure_errors: structureErrors,
    structure_warnings: structureWarnings,
    mechanical_revision_mode: mechanicalMode,
    medical_auditable: auditable,
    patch_merge_decision: patchDecision,
    patch_merge_errors: patchErrors,
    recommended_revision_mode: revisionMode,
    repair_tasks: cleanTasks,
    preserve_ids: preserveIds,
    fatal_errors: Array.isArray(review?.fatal_errors) ? review.fatal_errors : [],
    question_checks: Array.isArray(review?.question_checks) ? review.question_checks : [],
    revision_instruction: String(review?.revision_instruction || ""),
    missing_information: missing,
    general_feedback: general
  };
  return {
    decision,
    score,
    revision_mode: revisionMode,
    repair_tasks: cleanTasks,
    preserve_ids: preserveIds,
    repair_packet_json: JSON.stringify(repairPacket),
    feedback_json: JSON.stringify(feedback),
    missing_information: typeof missing === "string" ? missing : JSON.stringify(missing),
    general_feedback: general,
    publishable: decision === "PASS" && score >= 75 && structure === "PASS" && patchPass
  };
}'''.replace("__ROUND__", round_literal).replace("__MERGE_GUARD__", merge_guard)


FINAL_NORMALIZE_CODE = r'''function main({
  r1_decision, r1_score, r1_publishable, r1_candidate, r1_feedback, r1_missing,
  r2_decision, r2_score, r2_publishable, r2_candidate, r2_feedback, r2_missing
}) {
  function validDecision(value) {
    return typeof value === "string" && ["PASS", "REVISE", "STOP_INSUFFICIENT"].includes(value);
  }
  function score(value) {
    return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100
      ? value
      : 0;
  }
  function arrayValue(value) {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === "string" && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(String) : [value];
      } catch (_) { return [value]; }
    }
    return [];
  }
  function validPublicCandidate(value) {
    if (typeof value !== "string" || !value.trim()) return false;
    try {
      const parsed = JSON.parse(value);
      return parsed?.schema_version === "1.1" &&
        parsed?.generation_status === "success" &&
        parsed?.difficulty === "进阶" &&
        parsed?.question_count === 5 &&
        Array.isArray(parsed?.questions) && parsed.questions.length === 5;
    } catch (_) { return false; }
  }
  function candidateSummary(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    try {
      const parsed = JSON.parse(value);
      const summary = typeof parsed?.case_summary === "string" ? parsed.case_summary : "";
      return summary && summary.length <= 400 ? summary : "";
    } catch (_) { return ""; }
  }

  const hasRound2 = r2_decision !== undefined && r2_decision !== null && r2_decision !== "";
  const selectedDecision = hasRound2 ? r2_decision : r1_decision;
  const rawDecision = validDecision(selectedDecision) ? selectedDecision : "REVISE";
  const finalScore = score(hasRound2 ? r2_score : r1_score);
  const independentGate = hasRound2
    ? r2_publishable === true
    : r1_publishable === true;
  const candidate = String(hasRound2 ? (r2_candidate || "") : (r1_candidate || ""));
  const feedback = String(hasRound2 ? (r2_feedback || "") : (r1_feedback || ""));
  const missing = arrayValue(hasRound2 ? r2_missing : r1_missing);
  const preservedCaseSummary = candidateSummary(candidate) || candidateSummary(String(r1_candidate || ""));
  let status;
  if (hasRound2) {
    if (rawDecision === "PASS" && finalScore >= 75 && independentGate && validPublicCandidate(candidate)) {
      status = "PASS";
    } else if (rawDecision === "STOP_INSUFFICIENT") {
      status = "STOP_INSUFFICIENT";
    } else {
      status = "REVISE_EXHAUSTED";
    }
  } else if (
    rawDecision === "PASS" && finalScore >= 75 && independentGate && validPublicCandidate(candidate)
  ) {
    status = "PASS";
  } else if (rawDecision === "STOP_INSUFFICIENT") {
    status = "STOP_INSUFFICIENT";
  } else {
    status = "REVISE_EXHAUSTED";
  }
  const normalizedMissing = status === "PASS"
    ? []
    : (
        missing.length
          ? missing
          : [
              status === "STOP_INSUFFICIENT"
                ? "当前完整证据池不足以安全形成固定五题。"
                : "两轮内未通过独立医学审核，未发布候选题。"
            ]
      );
  const failure = {
    schema_version: "1.1",
    generation_status: "insufficient",
    case_summary: preservedCaseSummary,
    question_count: 0,
    difficulty: "进阶",
    questions: [],
    missing_information: normalizedMissing,
    risk_message: status === "STOP_INSUFFICIENT"
      ? "STOP_INSUFFICIENT：发布0题。"
      : "REVISE_EXHAUSTED：第二轮仍未达到独立PASS且score>=75，发布0题。"
  };
  return {
    status,
    publishable: status === "PASS",
    final_response_json: status === "PASS" ? candidate : JSON.stringify(failure),
    final_questions_json: status === "PASS" ? candidate : "",
    validation_decision: rawDecision,
    validation_score: finalScore,
    validation_feedback: feedback,
    missing_information: JSON.stringify(normalizedMissing),
    round_count: hasRound2 ? 2 : 1
  };
}'''


def compact_generator_input(case_packet: dict[str, Any], registry: dict[str, Any]) -> str:
    return "\n\n".join(
        [
            "【case_packet：仅做完全相同段落去重，未概括事实】\n"
            + base.token(case_packet["nodeId"], output_id(case_packet, "case_packet_json")),
            "【evidence_pool：带稳定evidence_id的最终压缩池】\n"
            + base.token(registry["nodeId"], output_id(registry, "evidence_pool_json")),
            "【固定内部参数】\nquestion_count=5；difficulty=进阶；case_intro_images仅兼容保留，未被模型处理。",
        ]
    )


def validation_input(
    case_packet: dict[str, Any], assembly: dict[str, Any], *,
    repair_merge: dict[str, Any] | None = None, r1_review: dict[str, Any] | None = None,
) -> str:
    sections = [
        "【case_packet】\n" + base.token(case_packet["nodeId"], output_id(case_packet, "case_packet_json")),
        "【当前内部候选题】\n" + base.token(assembly["nodeId"], output_id(assembly, "internal_candidate_json")),
        "【确定性公开证据映射：仅id与guidelineRef】\n"
        + base.token(assembly["nodeId"], output_id(assembly, "public_reference_map_json")),
        "【机械结构结论】\n" + base.token(assembly["nodeId"], output_id(assembly, "structure_decision")),
        "【机械结构错误】\n" + base.token(assembly["nodeId"], output_id(assembly, "structure_errors")),
        "【机械建议修订模式】\n" + base.token(assembly["nodeId"], output_id(assembly, "recommended_revision_mode")),
        "【机械修订任务】\n" + base.token(assembly["nodeId"], output_id(assembly, "repair_tasks_json")),
        "【校验证据】\n" + base.token(assembly["nodeId"], output_id(assembly, "validator_evidence_json")),
    ]
    if repair_merge is not None and r1_review is not None:
        sections.extend(
            [
                "【上一轮结构化审核包】\n" + base.token(r1_review["nodeId"], output_id(r1_review, "feedback_json")),
                "【第二轮补丁合并结论】\n" + base.token(repair_merge["nodeId"], output_id(repair_merge, "merge_decision")),
                "【第二轮补丁合并错误】\n" + base.token(repair_merge["nodeId"], output_id(repair_merge, "merge_errors")),
            ]
        )
    return "\n\n".join(sections)


def revision_input(
    case_packet: dict[str, Any], registry: dict[str, Any], r1_assembly: dict[str, Any], r1_review: dict[str, Any]
) -> str:
    return "\n\n".join(
        [
            "【case_packet】\n" + base.token(case_packet["nodeId"], output_id(case_packet, "case_packet_json")),
            "【evidence_pool】\n" + base.token(registry["nodeId"], output_id(registry, "evidence_pool_json")),
            "【previous_candidate】\n" + base.token(r1_assembly["nodeId"], output_id(r1_assembly, "internal_candidate_json")),
            "【repair_packet：唯一修改授权】\n" + base.token(r1_review["nodeId"], output_id(r1_review, "repair_packet_json")),
            "【review_packet：结构与医学错误全集】\n" + base.token(r1_review["nodeId"], output_id(r1_review, "feedback_json")),
        ]
    )


def output_spec(prefix: str, specs: list[tuple[str, str, str]]) -> list[tuple[str, str, str]]:
    return [(f"{prefix}{output_id_value}", key, value_type) for output_id_value, key, value_type in specs]


def patch_global_compatibility(workflow: dict[str, Any]) -> None:
    variables = workflow.get("chatConfig", {}).get("variables", [])
    by_label = {str(item.get("label")): item for item in variables}
    required = {
        "question_count", "difficulty", "question_draft", "review_feedback", "case_intro_images"
    }
    if not required.issubset(by_label):
        raise BuildError(f"missing compatibility globals: {sorted(required - set(by_label))}")

    count = by_label["question_count"]
    count.update(
        {
            "required": False,
            "defaultValue": "5",
            "min": 5,
            "max": 5,
            "description": "v1.2兼容键；工作流内部固定为5，不读取用户覆盖值。",
        }
    )
    difficulty = by_label["difficulty"]
    difficulty.update(
        {
            "required": False,
            "defaultValue": "进阶",
            "list": [{"label": "进阶", "value": "进阶"}],
            "description": "v1.2兼容键；工作流内部固定为进阶，不读取用户覆盖值。",
        }
    )
    for label in ("question_draft", "review_feedback"):
        item = by_label[label]
        item.update(
            {
                "type": "internal",
                "required": False,
                "defaultValue": "",
                "description": "v1.2兼容键；显式双轮数据流不读取此字段。",
            }
        )
    images = by_label["case_intro_images"]
    images.update(
        {
            "required": False,
            "description": "可选兼容输入；v1.2题目工作流不读取、不识别，也不传给模型。",
        }
    )


def patch_research_extractor(extractor: dict[str, Any]) -> None:
    code_input = input_item(extractor, "code")
    code = code_input.get("value")
    if not isinstance(code, str):
        raise BuildError("研究线索提取.code is not a string")
    old_decision = (
        "const hasLeads = hasCandidateLeads && "
        "(!initialHasEligibleStudy || baseEligiblePool < 5);"
    )
    if old_decision not in code:
        raise BuildError("研究线索提取 has_leads block no longer matches reviewed source")
    code = code.replace(old_decision, "const hasLeads = hasCandidateLeads;", 1)
    old_excluded_tail = (
        '    "ASCO", "ESMO", "WCLC", "AATS", "AACR", "NEJM", "CTRC", "FDA"\n'
        "  ]);"
    )
    new_excluded_tail = (
        '    "ASCO", "ESMO", "WCLC", "AATS", "AACR", "NEJM", "CTRC", "FDA",\n'
        '    "CTDNA", "MRD"\n'
        "  ]);"
    )
    if old_excluded_tail not in code:
        raise BuildError("研究线索提取排除词表不再匹配审核基底")
    code = code.replace(old_excluded_tail, new_excluded_tail, 1)
    old_quote_shape = '''    const title = clean(item && (item.sourceName || item.title || item.q));
    const body = clean(item && (item.a || item.content || item.text));
    const combined = `${title} ${body}`;'''
    new_quote_shape = '''    const title = clean(
      item && (item.title || item.sourceTitle || item.sourceName)
    );
    // FastGPT datasetQuote在不同版本中可能把正文放在q或a；sourceName通常只是文件名。
    // 同时纳入所有正文候选，不能因sourceName存在就忽略q中的研究名称/注册号。
    const body = [
      item && item.q,
      item && item.a,
      item && item.content,
      item && item.text,
      item && item.pageContent
    ].map(clean).filter(Boolean).join(" ");
    const combined = `${title} ${body}`;
    // 标题已经明确给出研究名时只信标题，避免把正文中的国家名、对照研究或延伸讨论误作当前研究。
    // 标题没有研究身份时，有限扫描正文开头，以识别“综述/访谈标题 + 开头明确介绍主研究”的资料。
    const rawQ = String((item && item.q) || "");
    const embeddedTitleMatch = rawQ.match(/标题:\\[([^\\]]{1,300})\\]/);
    const embeddedTitle = clean(embeddedTitleMatch ? embeddedTitleMatch[1] : "");
    const titleHasStudyIdentity = /\\b[A-Z][A-Z0-9-]{2,24}(?:\\s+\\d{2,5})?\\s*(?=研究|试验|(?:中国)?数据|study\\b|trial\\b)/i.test(embeddedTitle);
    const primaryIdentityText = titleHasStudyIdentity
      ? embeddedTitle
      : `${embeddedTitle || title} ${body.slice(0, 1000)}`;'''
    if old_quote_shape not in code:
        raise BuildError("研究线索提取 datasetQuote正文读取块不再匹配审核基底")
    code = code.replace(old_quote_shape, new_quote_shape, 1)
    old_study_pattern = (
        r"const studyPattern = /\b([A-Z][A-Z0-9-]{2,24})\s*"
        r"(?=研究|试验|study\b|trial\b)/gi;"
    )
    new_study_pattern = (
        r"const studyPattern = /\b([A-Z][A-Z0-9-]{2,24}(?:\s+\d{2,5})?)\s*"
        r"(?=研究|试验|(?:中国)?数据|study\b|trial\b)/gi;"
    )
    if old_study_pattern not in code:
        raise BuildError("研究线索提取研究简称正则不再匹配审核基底")
    code = code.replace(old_study_pattern, new_study_pattern, 1)
    old_study_scan = "while ((match = studyPattern.exec(combined)) !== null) {"
    new_study_scan = "while ((match = studyPattern.exec(primaryIdentityText)) !== null) {"
    if old_study_scan not in code:
        raise BuildError("研究线索提取研究简称扫描范围不再匹配审核基底")
    code = code.replace(old_study_scan, new_study_scan, 1)
    old_name_normalize = 'const name = String(match[1] || "").toUpperCase();'
    new_name_normalize = (
        'const name = String(match[1] || "").replace(/\\s+/g, " ").trim().toUpperCase();'
    )
    if old_name_normalize not in code:
        raise BuildError("研究线索提取研究简称规范化代码不再匹配审核基底")
    code = code.replace(old_name_normalize, new_name_normalize, 1)
    normalized_names_sentinel = '''    const normalizedNames = unique(studyNames).slice(0, 5);'''
    parenthetical_study_scan = '''    // 兼容“Ⅱ期研究（LORIN）”这类研究简称置于括号内的标题写法。
    const parentheticalStudyPattern = /(?:研究|试验)\\s*[（(]\\s*([A-Z][A-Z0-9-]{2,24}(?:\\s+\\d{2,5})?)\\s*[）)]/gi;
    while ((match = parentheticalStudyPattern.exec(primaryIdentityText)) !== null) {
      const name = String(match[1] || "").replace(/\\s+/g, " ").trim().toUpperCase();
      if (!excluded.has(name) && !/^\\d+$/.test(name)) {
        studyNames.push(name);
      }
    }

    const normalizedNames = unique(studyNames).slice(0, 5);'''
    if normalized_names_sentinel not in code:
        raise BuildError("研究线索提取规范化简称位置不再匹配审核基底")
    code = code.replace(normalized_names_sentinel, parenthetical_study_scan, 1)
    sentinel = ': "NO_ELIGIBLE_STUDY_LEADS";'
    if sentinel not in code:
        raise BuildError("研究线索提取 NO_ELIGIBLE_STUDY_LEADS sentinel not found")
    code_input["value"] = code.replace(sentinel, ': "";', 1)


def clone_answer(
    template: dict[str, Any], *, node_id: str, name: str, position: dict[str, float], response_ref: list[str]
) -> dict[str, Any]:
    node = copy.deepcopy(template)
    node.update({"nodeId": node_id, "name": name, "position": position})
    node.pop("parentNodeId", None)
    input_item(node, "text")["value"] = response_ref
    return node


def build() -> tuple[dict[str, Any], dict[str, Any]]:
    if not SOURCE.is_file():
        raise BuildError(f"source export not found: {SOURCE}")
    source_hash_before = sha256(SOURCE)
    if source_hash_before.lower() != EXPECTED_SOURCE_SHA256:
        raise BuildError(
            "source SHA-256 changed; reviewed base expected "
            f"{EXPECTED_SOURCE_SHA256}, found {source_hash_before}"
        )

    generator_prompt = read_text(GENERATOR_PROMPT)
    validator_prompt = read_text(VALIDATOR_PROMPT)
    revision_prompt = read_text(REVISION_PROMPT)
    registry_code = read_text(REGISTRY_CODE)
    assembly_code = read_text(ASSEMBLY_CODE)
    patch_merge_code = read_text(PATCH_MERGE_CODE)
    case_packet_code = read_text(CASE_PACKET_CODE_PATH)
    read_text(ASSET_SELF_TEST)
    read_text(GATE_SELF_TEST)
    read_text(DEPLOYMENT_README)

    try:
        source = base.load_json(SOURCE)
    except (OSError, json.JSONDecodeError, base.MigrationError) as exc:
        raise BuildError(str(exc)) from exc
    workflow = copy.deepcopy(source)
    if not isinstance(workflow.get("nodes"), list) or not isinstance(workflow.get("edges"), list):
        raise BuildError("workflow root must contain nodes[] and edges[]")

    workflow["name"] = "OncoRounds-快速稳定五题-v1.2-Qwen显式双轮-测试版"
    workflow["intro"] = (
        "基于题目生成 Copy.json的v1.2测试副本：五路初检，按容量条件研究补检，"
        "稳定evidence_id确定性装配，Qwen3.5-Plus显式两轮，最终独立PASS且score>=75才发布。"
    )
    patch_global_compatibility(workflow)

    start = find(workflow, "流程开始", "workflowStart")
    initial_registry_old = find(workflow, "证据注册与压缩-初检", "code")
    final_registry_old = find(workflow, "证据注册与压缩-最终", "code")
    knowledge = find(workflow, "知识库搜索", "datasetSearchNode")
    extractor = find(workflow, "研究线索提取", "code")
    leads_if = find(workflow, "是否存在研究线索", "ifElseNode")
    supplement = find(workflow, "良医汇医学数据库（临床研究补检）", "tool")
    aggregator = find(workflow, "文本拼接#2", "textEditor")

    guideline_a = find(workflow, "良医汇医学数据库（指南检索）", "tool")
    guideline_b = find(workflow, "良医汇医学数据库（指南检索B）", "tool")
    study_initial = find(workflow, "良医汇医学数据库（临床研究检索）", "tool")
    irae_a = find(workflow, "irAE正式指南检索A", "tool")
    irae_b = find(workflow, "irAE正式指南检索B", "tool")

    loop = find(workflow, "循环节点", "loopRun")
    loop_start = find(workflow, "循环开始", "loopRunStart")
    loop_break = find(workflow, "循环终止", "loopRunBreak")
    initializer = find(workflow, "初始化循环变量", "variableUpdate")
    save_feedback = find(workflow, "保存本轮反馈", "variableUpdate")
    retry_if = find(workflow, "重试次数判断", "ifElseNode")
    validator_extract = find(workflow, "校验结果提取", "code")

    r1_generator_old = find(workflow, "题目生成", "chatNode")
    r1_assembly_old = find(workflow, "纯机械结构硬检", "code")
    r1_auditable_old = find(workflow, "机械结构结果判断", "ifElseNode")
    r1_validation_input_old = find(workflow, "校验输入拼接", "textEditor")
    r1_validator_old = find(workflow, "题目校验", "chatNode")
    r1_review_old = find(workflow, "本轮审核结果归一", "code")
    r1_decision_old = find(workflow, "审核决策判断", "ifElseNode")
    r2_final_old = find(workflow, "最终结果判断", "ifElseNode")
    pass_answer_old = find(workflow, "输出已通过题目", "answerNode")
    stop_answer_old = find(workflow, "输出资料不足", "answerNode")
    exhausted_answer_old = find(workflow, "指定回复#3", "answerNode")

    code_template = copy.deepcopy(r1_assembly_old)
    if_template = copy.deepcopy(leads_if)
    text_template = copy.deepcopy(r1_validation_input_old)
    chat_template = copy.deepcopy(r1_generator_old)
    answer_template = copy.deepcopy(pass_answer_old)

    remove_nodes(
        workflow,
        [loop, loop_start, loop_break, initializer, save_feedback, retry_if, validator_extract],
    )

    # Rebuild both registries with stable evidence_id metadata and identical code.
    retrieval_specs = [
        ("guideline_a", guideline_a),
        ("guideline_b", guideline_b),
        ("clinical_study_initial", study_initial),
        ("clinical_study_supplement", supplement),
        ("irae_a", irae_a),
        ("irae_b", irae_b),
    ]
    retrieval_error_specs = [
        ("guideline_a_error", guideline_a),
        ("guideline_b_error", guideline_b),
        ("clinical_study_initial_error", study_initial),
        ("clinical_study_supplement_error", supplement),
        ("irae_a_error", irae_a),
        ("irae_b_error", irae_b),
    ]
    retrieval_system_error_specs = [
        ("guideline_a_system_error", guideline_a),
        ("guideline_b_system_error", guideline_b),
        ("clinical_study_initial_system_error", study_initial),
        ("clinical_study_supplement_system_error", supplement),
        ("irae_a_system_error", irae_a),
        ("irae_b_system_error", irae_b),
    ]
    initial_registry_inputs = [
        (
            key,
            "arrayObject",
            False,
            [] if key == "clinical_study_supplement" else [node["nodeId"], output_id(node, "result")],
        )
        for key, node in retrieval_specs
    ] + [
        (
            key,
            "string",
            False,
            []
            if key == "clinical_study_supplement_error"
            else [node["nodeId"], output_id(node, "error")],
        )
        for key, node in retrieval_error_specs
    ] + [
        (
            key,
            "string",
            False,
            []
            if key == "clinical_study_supplement_system_error"
            else [node["nodeId"], output_id(node, "system_error_text")],
        )
        for key, node in retrieval_system_error_specs
    ] + [("knowledge_search_error", "string", False, [])]
    final_registry_inputs = [
        (key, "arrayObject", False, [node["nodeId"], output_id(node, "result")])
        for key, node in retrieval_specs
    ] + [
        (key, "string", False, [node["nodeId"], output_id(node, "error")])
        for key, node in retrieval_error_specs
    ] + [
        (key, "string", False, [node["nodeId"], output_id(node, "system_error_text")])
        for key, node in retrieval_system_error_specs
    ] + [
        (
            "knowledge_search_error",
            "string",
            False,
            [knowledge["nodeId"], output_id(knowledge, "system_error_text")],
        )
    ]
    initial_registry = make_code_node(
        code_template,
        node_id=initial_registry_old["nodeId"],
        name="证据注册与压缩-初检",
        code=registry_code,
        position={"x": -2850.0, "y": -1650.0},
        inputs=initial_registry_inputs,
        outputs=registry_outputs("v12Initial"),
    )
    final_registry = make_code_node(
        code_template,
        node_id=final_registry_old["nodeId"],
        name="证据注册与压缩-最终",
        code=registry_code,
        position={"x": -250.0, "y": -350.0},
        inputs=final_registry_inputs,
        outputs=registry_outputs("v12Final"),
    )
    replace_node(workflow, initial_registry_old, initial_registry)
    replace_node(workflow, final_registry_old, final_registry)

    # Healthy retrievals always enter the lightweight lead-discovery lane. The
    # downstream has-leads gate still prevents a formal supplement call when no
    # identifiable study name/registry number was found. Capacity alone cannot
    # tell whether an otherwise valid study matches the case's exact phase.
    need_if = make_if_node(
        if_template,
        node_id=NEED_SUPPLEMENT_ID,
        name="是否需要临床研究补检",
        position={"x": -2250.0, "y": -1250.0},
        conditions=[
            condition(
                [initial_registry["nodeId"], output_id(initial_registry, "retrieval_health_ok")],
                "equalTo",
                "true",
                "v12NeedSupplement",
            )
        ],
    )
    workflow["nodes"].append(need_if)
    leads_if["name"] = "是否存在合格研究线索"
    leads_if["intro"] = "仅has_leads=true时调用医学数据库补检；false直接形成最终证据池。"
    leads_if["position"] = {"x": -1150.0, "y": -1250.0}
    leads_if.pop("parentNodeId", None)
    input_item(leads_if, "ifElseList")["value"] = [
        condition(
            [extractor["nodeId"], output_id(extractor, "has_leads")],
            "equalTo",
            "true",
            "v12HasEligibleLeads",
        )
    ]
    # Only runs after the deterministic capacity gate. Built-in query optimization
    # is retained here because it extracts drug + treatment-stage terms from long
    # longitudinal decision lists; without it the ALK regression case misses ALNEO.
    input_item(knowledge, "datasetSearchUsingExtensionQuery")["value"] = True
    input_item(knowledge, "datasetSearchExtensionModel")["value"] = None
    input_item(knowledge, "datasetSearchExtensionBg")["value"] = ""
    patch_research_extractor(extractor)

    # Remove every old control entry to the supplement path, then add the reviewed gate chain.
    supplement_path_ids = {
        knowledge["nodeId"], extractor["nodeId"], leads_if["nodeId"], supplement["nodeId"],
        initial_registry["nodeId"], final_registry["nodeId"], NEED_SUPPLEMENT_ID,
    }
    remove_edges(
        workflow,
        lambda edge: (
            edge.get("source") in supplement_path_ids or edge.get("target") in supplement_path_ids
        ),
    )
    # The five initial lanes converge on the initial registry. Conditional irAE ELSE
    # edges already target the registry and are reconstructed below from source semantics.
    for retrieval in (guideline_a, guideline_b, study_initial, irae_a, irae_b):
        add_edge(workflow, retrieval["nodeId"], initial_registry["nodeId"])
    irae_if_a = find(workflow, "是否存在第一项严重irAE", "ifElseNode")
    irae_if_b = find(workflow, "是否存在第二项严重irAE", "ifElseNode")
    add_edge(workflow, irae_if_a["nodeId"], initial_registry["nodeId"], "ELSE")
    add_edge(workflow, irae_if_b["nodeId"], initial_registry["nodeId"], "ELSE")
    add_edge(workflow, initial_registry["nodeId"], need_if["nodeId"])
    add_edge(workflow, need_if["nodeId"], knowledge["nodeId"], "v12NeedSupplement")
    add_edge(workflow, need_if["nodeId"], final_registry["nodeId"], "ELSE")
    add_edge(workflow, knowledge["nodeId"], extractor["nodeId"])
    add_edge(workflow, extractor["nodeId"], leads_if["nodeId"])
    add_edge(workflow, leads_if["nodeId"], supplement["nodeId"], "v12HasEligibleLeads")
    add_edge(workflow, leads_if["nodeId"], final_registry["nodeId"], "ELSE")
    add_edge(workflow, supplement["nodeId"], final_registry["nodeId"])

    # Deterministic case packet: exact duplicate paragraphs only, no summary/OCR/images.
    case_inputs = [
        (label, "string", False, ["VARIABLE_NODE_ID", global_key(workflow, label)])
        for label in (
            "case_id", "case_title", "disease", "case_mode", "case_context", "case_timeline",
            "biomarkers", "learning_points", "decision_points", "adverse_events", "evidence_notes",
        )
    ]
    case_packet = make_code_node(
        code_template,
        node_id=CASE_PACKET_ID,
        name="病例输入精确去重",
        code=case_packet_code,
        position={"x": -250.0, "y": 600.0},
        inputs=case_inputs,
        outputs=[
            ("v12CasePacketObject", "case_packet", "object"),
            ("v12CasePacketJson", "case_packet_json", "string"),
            ("v12CasePacketText", "case_packet_text", "string"),
            ("v12CaseDedupeReport", "dedupe_report", "object"),
        ],
    )
    workflow["nodes"].append(case_packet)
    add_edge(workflow, start["nodeId"], case_packet["nodeId"])

    # Remove all old loop/downstream edges; the same source nodes are reused as R1.
    downstream_ids = {
        aggregator["nodeId"], r1_generator_old["nodeId"], r1_assembly_old["nodeId"],
        r1_auditable_old["nodeId"], r1_validation_input_old["nodeId"], r1_validator_old["nodeId"],
        r1_review_old["nodeId"], r1_decision_old["nodeId"], r2_final_old["nodeId"],
        pass_answer_old["nodeId"], stop_answer_old["nodeId"], exhausted_answer_old["nodeId"],
    }
    remove_edges(
        workflow,
        lambda edge: edge.get("source") in downstream_ids or edge.get("target") in downstream_ids,
    )

    aggregator["name"] = "生成输入拼接-首轮"
    aggregator["intro"] = "仅传去重病例包、固定参数与最终压缩证据池。"
    aggregator["position"] = {"x": 750.0, "y": 50.0}
    aggregator.pop("parentNodeId", None)
    input_item(aggregator, "system_textareaInput")["value"] = compact_generator_input(case_packet, final_registry)

    r1_generator = r1_generator_old
    r1_generator["name"] = "题目生成-首轮"
    r1_generator["position"] = {"x": 1750.0, "y": 50.0}
    configure_chat(
        r1_generator,
        prompt=generator_prompt,
        user_input=[aggregator["nodeId"], output_id(aggregator, "system_text")],
        reasoning=False,
        effort="",
        max_tokens=8192,
    )

    r1_assembly = make_code_node(
        code_template,
        node_id=r1_assembly_old["nodeId"],
        name="候选题装配与硬检-首轮",
        code=assembly_code,
        position={"x": 2750.0, "y": 50.0},
        inputs=[
            ("candidate_json", "string", False, [r1_generator["nodeId"], output_id(r1_generator, "answerText")]),
            ("evidence_pool", "object", True, [final_registry["nodeId"], output_id(final_registry, "evidence_pool")]),
        ],
        outputs=ASSEMBLY_OUTPUTS,
    )
    replace_node(workflow, r1_assembly_old, r1_assembly)

    r1_auditable = make_if_node(
        if_template,
        node_id=r1_auditable_old["nodeId"],
        name="是否可独立医审-首轮",
        position={"x": 3750.0, "y": 50.0},
        conditions=[
            condition(
                [r1_assembly["nodeId"], output_id(r1_assembly, "medical_auditable")],
                "equalTo", "true", "v12R1Auditable",
            )
        ],
    )
    replace_node(workflow, r1_auditable_old, r1_auditable)

    r1_validation_input = clone_text_node(
        text_template,
        node_id=r1_validation_input_old["nodeId"],
        name="校验输入拼接-首轮",
        position={"x": 4550.0, "y": -450.0},
        value=validation_input(case_packet, r1_assembly),
    )
    replace_node(workflow, r1_validation_input_old, r1_validation_input)

    r1_validator = r1_validator_old
    r1_validator["name"] = "题目校验-首轮"
    r1_validator["position"] = {"x": 5550.0, "y": -450.0}
    configure_chat(
        r1_validator,
        prompt=validator_prompt,
        user_input=[r1_validation_input["nodeId"], output_id(r1_validation_input, "system_text")],
        reasoning=True,
        effort="medium",
        max_tokens=16384,
    )

    r1_review = make_code_node(
        code_template,
        node_id=r1_review_old["nodeId"],
        name="审核结果合并-首轮",
        code=review_merge_code(second_round=False),
        position={"x": 6550.0, "y": 50.0},
        inputs=[
            ("structure_decision", "string", True, [r1_assembly["nodeId"], output_id(r1_assembly, "structure_decision")]),
            ("structure_errors", "arrayString", False, [r1_assembly["nodeId"], output_id(r1_assembly, "structure_errors")]),
            ("structure_warnings", "arrayString", False, [r1_assembly["nodeId"], output_id(r1_assembly, "structure_warnings")]),
            ("medical_auditable", "boolean", True, [r1_assembly["nodeId"], output_id(r1_assembly, "medical_auditable")]),
            ("mechanical_revision_mode", "string", False, [r1_assembly["nodeId"], output_id(r1_assembly, "recommended_revision_mode")]),
            ("mechanical_repair_tasks", "arrayObject", False, [r1_assembly["nodeId"], output_id(r1_assembly, "repair_tasks")]),
            ("candidate_internal_json", "string", False, [r1_assembly["nodeId"], output_id(r1_assembly, "internal_candidate_json")]),
            ("candidate_public_json", "string", False, [r1_assembly["nodeId"], output_id(r1_assembly, "candidate_json_passthrough")]),
            ("review_text", "string", False, [r1_validator["nodeId"], output_id(r1_validator, "answerText")]),
        ],
        outputs=REVIEW_OUTPUTS,
    )
    replace_node(workflow, r1_review_old, r1_review)

    r1_decision = make_if_node(
        if_template,
        node_id=r1_decision_old["nodeId"],
        name="首轮结果判断",
        position={"x": 7550.0, "y": 50.0},
        conditions=[
            {
                "condition": "AND",
                "list": [
                    {"variable": [r1_review["nodeId"], output_id(r1_review, "decision")], "condition": "equalTo", "value": "PASS", "valueType": "input"},
                    {"variable": [r1_review["nodeId"], output_id(r1_review, "score")], "condition": "greaterThanOrEqualTo", "value": "75", "valueType": "input"},
                    {"variable": [r1_review["nodeId"], output_id(r1_review, "publishable")], "condition": "equalTo", "value": "true", "valueType": "input"},
                ],
                "branchId": "v12R1Pass",
            },
            condition(
                [r1_review["nodeId"], output_id(r1_review, "decision")],
                "equalTo", "STOP_INSUFFICIENT", "v12R1Stop",
            ),
        ],
    )
    replace_node(workflow, r1_decision_old, r1_decision)

    add_edge(workflow, final_registry["nodeId"], aggregator["nodeId"])
    add_edge(workflow, case_packet["nodeId"], aggregator["nodeId"])
    add_edge(workflow, aggregator["nodeId"], r1_generator["nodeId"])
    add_edge(workflow, r1_generator["nodeId"], r1_assembly["nodeId"])
    add_edge(workflow, r1_assembly["nodeId"], r1_auditable["nodeId"])
    add_edge(workflow, r1_auditable["nodeId"], r1_validation_input["nodeId"], "v12R1Auditable")
    add_edge(workflow, r1_auditable["nodeId"], r1_review["nodeId"], "ELSE")
    add_edge(workflow, r1_validation_input["nodeId"], r1_validator["nodeId"])
    add_edge(workflow, r1_validator["nodeId"], r1_review["nodeId"])
    add_edge(workflow, r1_review["nodeId"], r1_decision["nodeId"])

    # Explicit round 2: only the R1 REVISE (ELSE) branch reaches this chain.
    r2_input = clone_text_node(
        text_template,
        node_id=R2_INPUT_ID,
        name="修订任务拼接",
        position={"x": 8550.0, "y": 650.0},
        value=revision_input(case_packet, final_registry, r1_assembly, r1_review),
    )
    r2_generator = clone_chat_node(
        chat_template,
        node_id=R2_GENERATOR_ID,
        name="题目修订-第二轮",
        position={"x": 9550.0, "y": 650.0},
        prompt=revision_prompt,
        user_input=[r2_input["nodeId"], output_id(r2_input, "system_text")],
        reasoning=False,
        effort="",
        max_tokens=8192,
    )
    r2_patch_merge = make_code_node(
        code_template,
        node_id=R2_PATCH_MERGE_ID,
        name="修订补丁合并",
        code=patch_merge_code,
        position={"x": 10550.0, "y": 650.0},
        inputs=[
            ("previous_internal_json", "string", False, [r1_assembly["nodeId"], output_id(r1_assembly, "internal_candidate_json")]),
            ("repair_packet", "string", True, [r1_review["nodeId"], output_id(r1_review, "repair_packet_json")]),
            ("patch_json", "string", False, [r2_generator["nodeId"], output_id(r2_generator, "answerText")]),
        ],
        outputs=PATCH_MERGE_OUTPUTS,
    )
    r2_assembly = make_code_node(
        code_template,
        node_id=R2_ASSEMBLY_ID,
        name="候选题装配与硬检-第二轮",
        code=assembly_code,
        position={"x": 11550.0, "y": 650.0},
        inputs=[
            ("candidate_json", "string", False, [r2_patch_merge["nodeId"], output_id(r2_patch_merge, "merged_internal_json")]),
            ("evidence_pool", "object", True, [final_registry["nodeId"], output_id(final_registry, "evidence_pool")]),
        ],
        outputs=ASSEMBLY_OUTPUTS,
    )
    r2_auditable = make_if_node(
        if_template,
        node_id=R2_AUDITABLE_IF_ID,
        name="是否可独立医审-第二轮",
        position={"x": 12550.0, "y": 650.0},
        conditions=[
            condition(
                [r2_assembly["nodeId"], output_id(r2_assembly, "medical_auditable")],
                "equalTo", "true", "v12R2Auditable",
            )
        ],
    )
    r2_validation_input = clone_text_node(
        text_template,
        node_id=R2_VALIDATION_INPUT_ID,
        name="校验输入拼接-第二轮",
        position={"x": 13550.0, "y": 150.0},
        value=validation_input(
            case_packet,
            r2_assembly,
            repair_merge=r2_patch_merge,
            r1_review=r1_review,
        ),
    )
    r2_validator = clone_chat_node(
        chat_template,
        node_id=R2_VALIDATOR_ID,
        name="题目校验-第二轮",
        position={"x": 14550.0, "y": 150.0},
        prompt=validator_prompt,
        user_input=[r2_validation_input["nodeId"], output_id(r2_validation_input, "system_text")],
        reasoning=True,
        effort="medium",
        max_tokens=16384,
    )
    r2_review = make_code_node(
        code_template,
        node_id=R2_REVIEW_MERGE_ID,
        name="审核结果合并-第二轮",
        code=review_merge_code(second_round=True),
        position={"x": 15550.0, "y": 650.0},
        inputs=[
            ("structure_decision", "string", True, [r2_assembly["nodeId"], output_id(r2_assembly, "structure_decision")]),
            ("structure_errors", "arrayString", False, [r2_assembly["nodeId"], output_id(r2_assembly, "structure_errors")]),
            ("structure_warnings", "arrayString", False, [r2_assembly["nodeId"], output_id(r2_assembly, "structure_warnings")]),
            ("medical_auditable", "boolean", True, [r2_assembly["nodeId"], output_id(r2_assembly, "medical_auditable")]),
            ("mechanical_revision_mode", "string", False, [r2_assembly["nodeId"], output_id(r2_assembly, "recommended_revision_mode")]),
            ("mechanical_repair_tasks", "arrayObject", False, [r2_assembly["nodeId"], output_id(r2_assembly, "repair_tasks")]),
            ("candidate_internal_json", "string", False, [r2_assembly["nodeId"], output_id(r2_assembly, "internal_candidate_json")]),
            ("candidate_public_json", "string", False, [r2_assembly["nodeId"], output_id(r2_assembly, "candidate_json_passthrough")]),
            ("review_text", "string", False, [r2_validator["nodeId"], output_id(r2_validator, "answerText")]),
            ("patch_merge_decision", "string", True, [r2_patch_merge["nodeId"], output_id(r2_patch_merge, "merge_decision")]),
            ("patch_merge_errors", "arrayString", False, [r2_patch_merge["nodeId"], output_id(r2_patch_merge, "merge_errors")]),
        ],
        outputs=REVIEW_OUTPUTS,
    )
    r2_final = make_if_node(
        if_template,
        node_id=r2_final_old["nodeId"],
        name="最终结果判断",
        position={"x": 16550.0, "y": 650.0},
        conditions=[
            {
                "condition": "AND",
                "list": [
                    {"variable": [r2_review["nodeId"], output_id(r2_review, "decision")], "condition": "equalTo", "value": "PASS", "valueType": "input"},
                    {"variable": [r2_review["nodeId"], output_id(r2_review, "score")], "condition": "greaterThanOrEqualTo", "value": "75", "valueType": "input"},
                    {"variable": [r2_review["nodeId"], output_id(r2_review, "publishable")], "condition": "equalTo", "value": "true", "valueType": "input"},
                ],
                "branchId": "v12R2Pass",
            }
        ],
    )
    replace_node(workflow, r2_final_old, r2_final)

    workflow["nodes"].extend(
        [
            r2_input, r2_generator, r2_patch_merge, r2_assembly, r2_auditable,
            r2_validation_input, r2_validator, r2_review,
        ]
    )
    add_edge(workflow, r1_decision["nodeId"], r2_input["nodeId"], "ELSE")
    add_edge(workflow, r2_input["nodeId"], r2_generator["nodeId"])
    add_edge(workflow, r2_generator["nodeId"], r2_patch_merge["nodeId"])
    add_edge(workflow, r2_patch_merge["nodeId"], r2_assembly["nodeId"])
    add_edge(workflow, r2_assembly["nodeId"], r2_auditable["nodeId"])
    add_edge(workflow, r2_auditable["nodeId"], r2_validation_input["nodeId"], "v12R2Auditable")
    add_edge(workflow, r2_auditable["nodeId"], r2_review["nodeId"], "ELSE")
    add_edge(workflow, r2_validation_input["nodeId"], r2_validator["nodeId"])
    add_edge(workflow, r2_validator["nodeId"], r2_review["nodeId"])
    add_edge(workflow, r2_review["nodeId"], r2_final["nodeId"])

    # One deterministic final state owns every response and removes branch-variable ambiguity.
    final_normalize = make_code_node(
        code_template,
        node_id=FINAL_NORMALIZE_ID,
        name="最终发布状态归一",
        code=FINAL_NORMALIZE_CODE,
        position={"x": 17600.0, "y": 50.0},
        inputs=[
            ("r1_decision", "string", False, [r1_review["nodeId"], output_id(r1_review, "decision")]),
            ("r1_score", "number", False, [r1_review["nodeId"], output_id(r1_review, "score")]),
            ("r1_publishable", "boolean", False, [r1_review["nodeId"], output_id(r1_review, "publishable")]),
            ("r1_candidate", "string", False, [r1_assembly["nodeId"], output_id(r1_assembly, "candidate_json_passthrough")]),
            ("r1_feedback", "string", False, [r1_review["nodeId"], output_id(r1_review, "feedback_json")]),
            ("r1_missing", "string", False, [r1_review["nodeId"], output_id(r1_review, "missing_information")]),
            ("r2_decision", "string", False, [r2_review["nodeId"], output_id(r2_review, "decision")]),
            ("r2_score", "number", False, [r2_review["nodeId"], output_id(r2_review, "score")]),
            ("r2_publishable", "boolean", False, [r2_review["nodeId"], output_id(r2_review, "publishable")]),
            ("r2_candidate", "string", False, [r2_assembly["nodeId"], output_id(r2_assembly, "candidate_json_passthrough")]),
            ("r2_feedback", "string", False, [r2_review["nodeId"], output_id(r2_review, "feedback_json")]),
            ("r2_missing", "string", False, [r2_review["nodeId"], output_id(r2_review, "missing_information")]),
        ],
        outputs=[
            ("v12FinalStatus", "status", "string"),
            ("v12FinalPublishable", "publishable", "boolean"),
            ("v12FinalResponse", "final_response_json", "string"),
            ("v12FinalQuestions", "final_questions_json", "string"),
            ("v12FinalDecision", "validation_decision", "string"),
            ("v12FinalScore", "validation_score", "number"),
            ("v12FinalFeedback", "validation_feedback", "string"),
            ("v12FinalMissing", "missing_information", "string"),
            ("v12FinalRoundCount", "round_count", "number"),
        ],
    )
    final_split = make_if_node(
        if_template,
        node_id=FINAL_SPLIT_ID,
        name="最终发布分流",
        position={"x": 18600.0, "y": 50.0},
        conditions=[
            condition([final_normalize["nodeId"], output_id(final_normalize, "status")], "equalTo", "PASS", "v12FinalPass"),
            condition([final_normalize["nodeId"], output_id(final_normalize, "status")], "equalTo", "STOP_INSUFFICIENT", "v12FinalStop"),
        ],
    )
    workflow["nodes"].extend([final_normalize, final_split])

    pass_answer = clone_answer(
        answer_template,
        node_id=pass_answer_old["nodeId"],
        name="输出已通过题目",
        position={"x": 19600.0, "y": -500.0},
        response_ref=[final_normalize["nodeId"], output_id(final_normalize, "final_response_json")],
    )
    stop_answer = clone_answer(
        answer_template,
        node_id=stop_answer_old["nodeId"],
        name="输出资料不足",
        position={"x": 19600.0, "y": 50.0},
        response_ref=[final_normalize["nodeId"], output_id(final_normalize, "final_response_json")],
    )
    exhausted_answer = clone_answer(
        answer_template,
        node_id=exhausted_answer_old["nodeId"],
        name="指定回复#3",
        position={"x": 19600.0, "y": 600.0},
        response_ref=[final_normalize["nodeId"], output_id(final_normalize, "final_response_json")],
    )
    replace_node(workflow, pass_answer_old, pass_answer)
    replace_node(workflow, stop_answer_old, stop_answer)
    replace_node(workflow, exhausted_answer_old, exhausted_answer)

    add_edge(workflow, r1_decision["nodeId"], final_normalize["nodeId"], "v12R1Pass")
    add_edge(workflow, r1_decision["nodeId"], final_normalize["nodeId"], "v12R1Stop")
    add_edge(workflow, r2_final["nodeId"], final_normalize["nodeId"], "v12R2Pass")
    add_edge(workflow, r2_final["nodeId"], final_normalize["nodeId"], "ELSE")
    add_edge(workflow, final_normalize["nodeId"], final_split["nodeId"])
    add_edge(workflow, final_split["nodeId"], pass_answer["nodeId"], "v12FinalPass")
    add_edge(workflow, final_split["nodeId"], stop_answer["nodeId"], "v12FinalStop")
    add_edge(workflow, final_split["nodeId"], exhausted_answer["nodeId"], "ELSE")

    # Defensive cleanup: explicit v1.2 has no loop parent and no old state references.
    for node in workflow["nodes"]:
        if node.get("parentNodeId") in {loop["nodeId"]}:
            node.pop("parentNodeId", None)

    source_hash_after = sha256(SOURCE)
    if source_hash_after != source_hash_before:
        raise BuildError("source export changed while building")

    audit = audit_workflow(
        workflow,
        source_hash=source_hash_after,
        asset_paths=[
            GENERATOR_PROMPT, VALIDATOR_PROMPT, REVISION_PROMPT,
            REGISTRY_CODE, ASSEMBLY_CODE, PATCH_MERGE_CODE, CASE_PACKET_CODE_PATH,
            ASSET_SELF_TEST, GATE_SELF_TEST, DEPLOYMENT_README, Path(__file__).resolve(),
        ],
    )
    return workflow, audit


def audit_workflow(
    workflow: dict[str, Any], *, source_hash: str, asset_paths: list[Path]
) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    nodes = workflow.get("nodes", [])
    edges = workflow.get("edges", [])
    if not isinstance(nodes, list) or not isinstance(edges, list):
        return {
            "status": "FAIL",
            "errors": ["workflow root nodes/edges must be arrays"],
            "warnings": [],
            "import_ready": False,
        }

    node_ids = [str(node.get("nodeId", "")) for node in nodes]
    if any(not value for value in node_ids):
        errors.append("one or more nodes have an empty nodeId")
    if len(node_ids) != len(set(node_ids)):
        errors.append("duplicate nodeId")
    node_by_id = {str(node.get("nodeId")): node for node in nodes}

    edge_keys: set[tuple[str, str, str]] = set()
    for edge in edges:
        source = str(edge.get("source", ""))
        target = str(edge.get("target", ""))
        handle = str(edge.get("sourceHandle", ""))
        if source not in node_by_id or target not in node_by_id:
            errors.append(f"dangling edge {source}->{target}")
        key = (source, target, handle)
        if key in edge_keys:
            errors.append(f"duplicate edge {key}")
        edge_keys.add(key)

    global_variables = workflow.get("chatConfig", {}).get("variables", [])
    global_keys = {str(item.get("key")) for item in global_variables}

    def check_ref(owner: str, value: Any) -> None:
        if not (
            isinstance(value, list)
            and len(value) == 2
            and all(isinstance(part, str) for part in value)
        ):
            return
        source_id, source_output = value
        if source_id == "VARIABLE_NODE_ID":
            if source_output not in global_keys:
                errors.append(f"{owner} references missing global {source_output}")
            return
        source_node = node_by_id.get(source_id)
        if source_node is None:
            errors.append(f"{owner} references missing node {source_id}")
            return
        output_ids = {str(item.get("id")) for item in source_node.get("outputs", [])}
        if source_output not in output_ids:
            errors.append(f"{owner} references missing output {source_id}.{source_output}")

    token_pattern = re.compile(r"\{\{\$([^.]+)\.([^$]+)\$\}\}")
    for node in nodes:
        name = str(node.get("name", node.get("nodeId", "")))
        parent = node.get("parentNodeId")
        if parent and str(parent) not in node_by_id:
            errors.append(f"{name} has missing parentNodeId {parent}")
        for item in node.get("inputs", []):
            key = str(item.get("key", ""))
            value = item.get("value")
            check_ref(f"{name}.{key}", value)
            if key == "ifElseList":
                branches = value if isinstance(value, list) else [value]
                for branch in branches:
                    if not isinstance(branch, dict):
                        continue
                    for expression in branch.get("list", []):
                        if isinstance(expression, dict):
                            check_ref(f"{name}.ifElseList", expression.get("variable"))
            if isinstance(value, str):
                for source_id, source_output in token_pattern.findall(value):
                    check_ref(f"{name}.{key} token", [source_id, source_output])

    # Every executable node must be reachable from workflow start in the static graph.
    start_nodes = [node for node in nodes if node.get("flowNodeType") == "workflowStart"]
    if len(start_nodes) != 1:
        errors.append(f"expected one workflowStart, found {len(start_nodes)}")
        reachable: set[str] = set()
    else:
        reachable = {str(start_nodes[0]["nodeId"])}
        changed = True
        while changed:
            changed = False
            for edge in edges:
                source = str(edge.get("source"))
                target = str(edge.get("target"))
                if source in reachable and target not in reachable:
                    reachable.add(target)
                    changed = True
    for node in nodes:
        node_id = str(node.get("nodeId"))
        node_type = str(node.get("flowNodeType", ""))
        if node_type != "userGuide" and node_id not in reachable:
            errors.append(f"unreachable executable node: {node.get('name')}")

    loop_types = {"loopRun", "loopRunStart", "loopRunBreak"}
    loop_nodes = [node.get("name") for node in nodes if node.get("flowNodeType") in loop_types]
    if loop_nodes:
        errors.append(f"explicit v1.2 must not contain loop nodes: {loop_nodes}")
    forbidden_names = {"初始化循环变量", "保存本轮反馈", "重试次数判断", "校验结果提取"}
    present_forbidden = [node.get("name") for node in nodes if node.get("name") in forbidden_names]
    if present_forbidden:
        errors.append(f"old loop/persistence nodes remain: {present_forbidden}")

    expected_names = [
        "证据注册与压缩-初检",
        "是否需要临床研究补检",
        "知识库搜索",
        "研究线索提取",
        "是否存在合格研究线索",
        "良医汇医学数据库（临床研究补检）",
        "证据注册与压缩-最终",
        "病例输入精确去重",
        "题目生成-首轮",
        "候选题装配与硬检-首轮",
        "是否可独立医审-首轮",
        "校验输入拼接-首轮",
        "题目校验-首轮",
        "审核结果合并-首轮",
        "首轮结果判断",
        "修订任务拼接",
        "题目修订-第二轮",
        "修订补丁合并",
        "候选题装配与硬检-第二轮",
        "是否可独立医审-第二轮",
        "校验输入拼接-第二轮",
        "题目校验-第二轮",
        "审核结果合并-第二轮",
        "最终结果判断",
        "最终发布状态归一",
        "最终发布分流",
        "输出已通过题目",
        "输出资料不足",
        "指定回复#3",
    ]
    name_counts = {name: sum(1 for node in nodes if node.get("name") == name) for name in expected_names}
    for name, count in name_counts.items():
        if count != 1:
            errors.append(f"expected exactly one node named {name!r}, found {count}")

    def unique_by_name(name: str) -> dict[str, Any] | None:
        matches = [node for node in nodes if node.get("name") == name]
        return matches[0] if len(matches) == 1 else None

    initial = unique_by_name("证据注册与压缩-初检")
    need = unique_by_name("是否需要临床研究补检")
    knowledge = unique_by_name("知识库搜索")
    extractor = unique_by_name("研究线索提取")
    leads = unique_by_name("是否存在合格研究线索")
    supplement = unique_by_name("良医汇医学数据库（临床研究补检）")
    final_registry = unique_by_name("证据注册与压缩-最终")

    def has_edge(source: dict[str, Any] | None, target: dict[str, Any] | None, branch: str | None = None) -> bool:
        if source is None or target is None:
            return False
        expected_handle = (
            f"{source['nodeId']}-source-{branch}" if branch is not None else f"{source['nodeId']}-source-right"
        )
        return any(
            edge.get("source") == source["nodeId"]
            and edge.get("target") == target["nodeId"]
            and edge.get("sourceHandle") == expected_handle
            for edge in edges
        )

    supplement_edges = [
        (initial, need, None, "initial registry -> need gate"),
        (need, knowledge, "v12NeedSupplement", "need=true -> knowledge search"),
        (need, final_registry, "ELSE", "need=false -> final registry"),
        (knowledge, extractor, None, "knowledge -> lead extraction"),
        (extractor, leads, None, "extractor -> has_leads gate"),
        (leads, supplement, "v12HasEligibleLeads", "has_leads=true -> medical supplement"),
        (leads, final_registry, "ELSE", "has_leads=false -> final registry"),
        (supplement, final_registry, None, "supplement -> final registry"),
    ]
    for source_node, target_node, branch, label in supplement_edges:
        if not has_edge(source_node, target_node, branch):
            errors.append(f"missing supplement control edge: {label}")
    if knowledge is not None:
        incoming = [edge for edge in edges if edge.get("target") == knowledge.get("nodeId")]
        if len(incoming) != 1 or incoming[0].get("source") != (need or {}).get("nodeId"):
            errors.append("知识库搜索 must have exactly one incoming edge from 是否需要临床研究补检")
        try:
            if input_item(knowledge, "datasetSearchUsingExtensionQuery").get("value") is not True:
                errors.append("知识库搜索 conditional query optimization is not enabled")
        except BuildError as exc:
            errors.append(str(exc))
    if supplement is not None:
        incoming = [edge for edge in edges if edge.get("target") == supplement.get("nodeId")]
        if len(incoming) != 1 or incoming[0].get("source") != (leads or {}).get("nodeId"):
            errors.append("临床研究补检 must have exactly one incoming edge from 是否存在合格研究线索")

    retrieval_nodes = {
        "guideline_a_error": unique_by_name("良医汇医学数据库（指南检索）"),
        "guideline_a_system_error": unique_by_name("良医汇医学数据库（指南检索）"),
        "guideline_b_error": unique_by_name("良医汇医学数据库（指南检索B）"),
        "guideline_b_system_error": unique_by_name("良医汇医学数据库（指南检索B）"),
        "clinical_study_initial_error": unique_by_name("良医汇医学数据库（临床研究检索）"),
        "clinical_study_initial_system_error": unique_by_name("良医汇医学数据库（临床研究检索）"),
        "clinical_study_supplement_error": supplement,
        "clinical_study_supplement_system_error": supplement,
        "irae_a_error": unique_by_name("irAE正式指南检索A"),
        "irae_a_system_error": unique_by_name("irAE正式指南检索A"),
        "irae_b_error": unique_by_name("irAE正式指南检索B"),
        "irae_b_system_error": unique_by_name("irAE正式指南检索B"),
    }
    retrieval_health_wiring: dict[str, Any] = {}
    for registry_name, registry_node, is_initial in (
        ("证据注册与压缩-初检", initial, True),
        ("证据注册与压缩-最终", final_registry, False),
    ):
        if registry_node is None:
            continue
        for key, retrieval_node in retrieval_nodes.items():
            try:
                item = input_item(registry_node, key)
            except BuildError as exc:
                errors.append(str(exc))
                continue
            expected = (
                []
                if is_initial and key in {
                    "clinical_study_supplement_error",
                    "clinical_study_supplement_system_error",
                }
                else (
                    [
                        retrieval_node["nodeId"],
                        output_id(
                            retrieval_node,
                            "system_error_text" if key.endswith("_system_error") else "error",
                        ),
                    ]
                    if retrieval_node is not None
                    else None
                )
            )
            actual = item.get("value")
            exact = actual == expected and item.get("required") is False
            retrieval_health_wiring[f"{registry_name}.{key}"] = {
                "value": actual,
                "required": item.get("required"),
                "exact_match": exact,
            }
            if expected is None or not exact:
                errors.append(f"{registry_name}.{key} retrieval error wiring is invalid")
        try:
            knowledge_error = input_item(registry_node, "knowledge_search_error")
            expected_knowledge = (
                []
                if is_initial
                else [knowledge["nodeId"], output_id(knowledge, "system_error_text")]
            ) if knowledge is not None else None
            actual_knowledge = knowledge_error.get("value")
            exact_knowledge = (
                expected_knowledge is not None
                and actual_knowledge == expected_knowledge
                and knowledge_error.get("required") is False
            )
            retrieval_health_wiring[f"{registry_name}.knowledge_search_error"] = {
                "value": actual_knowledge,
                "required": knowledge_error.get("required"),
                "exact_match": exact_knowledge,
            }
            if not exact_knowledge:
                errors.append(f"{registry_name}.knowledge_search_error wiring is invalid")
        except BuildError as exc:
            errors.append(str(exc))
        for output_key in ("retrieval_health_ok", "retrieval_health", "retrieval_errors"):
            try:
                output_item(registry_node, output_key)
            except BuildError as exc:
                errors.append(str(exc))

    workflow_text = json.dumps(workflow, ensure_ascii=False)
    if "NO_ELIGIBLE_STUDY_LEADS" in workflow_text:
        errors.append("NO_ELIGIBLE_STUDY_LEADS sentinel remains in executable workflow")

    # Fixed Qwen settings and prompt assets.
    model_expectations = {
        "题目生成-首轮": (False, "", 8192, GENERATOR_PROMPT),
        "题目修订-第二轮": (False, "", 8192, REVISION_PROMPT),
        "题目校验-首轮": (True, "medium", 16384, VALIDATOR_PROMPT),
        "题目校验-第二轮": (True, "medium", 16384, VALIDATOR_PROMPT),
    }
    model_audit: dict[str, Any] = {}
    embedded_prompt_audit: dict[str, Any] = {}
    for name, (reasoning, effort, max_tokens, prompt_path) in model_expectations.items():
        node = unique_by_name(name)
        if node is None:
            continue
        expected = {
            "model": "qwen3.5-plus",
            "temperature": 0.1,
            "maxToken": max_tokens,
            "aiChatVision": False,
            "aiChatReasoning": reasoning,
            "aiChatReasoningEffort": effort,
            "aiChatResponseFormat": "json_object",
        }
        actual: dict[str, Any] = {}
        for key, expected_value in expected.items():
            try:
                actual_value = input_item(node, key).get("value")
            except BuildError as exc:
                errors.append(str(exc))
                continue
            actual[key] = actual_value
            if actual_value != expected_value:
                errors.append(f"{name}.{key}={actual_value!r}; expected {expected_value!r}")
        try:
            installed_prompt = str(input_item(node, "systemPrompt").get("value", ""))
            installed_prompt_hash = hashlib.sha256(installed_prompt.encode("utf-8")).hexdigest()
            asset_prompt_hash = hashlib.sha256(read_text(prompt_path).encode("utf-8")).hexdigest()
            prompt_exact = installed_prompt_hash == asset_prompt_hash
            embedded_prompt_audit[name] = {
                "asset": prompt_path.name,
                "embedded_text_sha256": installed_prompt_hash,
                "asset_text_sha256": asset_prompt_hash,
                "exact_match": prompt_exact,
            }
            if not prompt_exact:
                errors.append(f"{name} prompt does not exactly match {prompt_path.name}")
        except BuildError as exc:
            errors.append(str(exc))
        model_audit[name] = actual

    # Every deterministic production asset must be embedded byte-for-byte after
    # UTF-8 decoding; asset hashes alone cannot detect a stale exported node.
    code_expectations = {
        "证据注册与压缩-初检": REGISTRY_CODE,
        "证据注册与压缩-最终": REGISTRY_CODE,
        "候选题装配与硬检-首轮": ASSEMBLY_CODE,
        "候选题装配与硬检-第二轮": ASSEMBLY_CODE,
        "修订补丁合并": PATCH_MERGE_CODE,
        "病例输入精确去重": CASE_PACKET_CODE_PATH,
    }
    embedded_asset_audit: dict[str, Any] = {}
    for name, asset_path in code_expectations.items():
        node = unique_by_name(name)
        if node is None:
            continue
        try:
            installed = str(input_item(node, "code").get("value", ""))
            expected_text = read_text(asset_path)
        except BuildError as exc:
            errors.append(str(exc))
            continue
        installed_hash = hashlib.sha256(installed.encode("utf-8")).hexdigest()
        asset_text_hash = hashlib.sha256(expected_text.encode("utf-8")).hexdigest()
        exact = installed_hash == asset_text_hash
        embedded_asset_audit[name] = {
            "asset": asset_path.name,
            "embedded_text_sha256": installed_hash,
            "asset_text_sha256": asset_text_hash,
            "exact_match": exact,
        }
        if not exact:
            errors.append(f"{name}.code does not exactly match {asset_path.name}")

    # Blank/truncated model output must enter deterministic fail-closed code,
    # instead of failing at FastGPT's required-input transport layer.
    optional_fail_closed_inputs = (
        ("候选题装配与硬检-首轮", "candidate_json"),
        ("修订补丁合并", "previous_internal_json"),
        ("修订补丁合并", "patch_json"),
        ("候选题装配与硬检-第二轮", "candidate_json"),
    )
    fail_closed_input_audit: dict[str, bool] = {}
    for name, key in optional_fail_closed_inputs:
        node = unique_by_name(name)
        if node is None:
            continue
        try:
            is_optional = input_item(node, key).get("required") is False
        except BuildError as exc:
            errors.append(str(exc))
            continue
        fail_closed_input_audit[f"{name}.{key}"] = is_optional
        if not is_optional:
            errors.append(f"{name}.{key} must be optional for fail-closed handling")

    validation_payload_audit: dict[str, Any] = {}
    for input_name, assembly_name, second_round in (
        ("校验输入拼接-首轮", "候选题装配与硬检-首轮", False),
        ("校验输入拼接-第二轮", "候选题装配与硬检-第二轮", True),
    ):
        text_node = unique_by_name(input_name)
        assembly_node = unique_by_name(assembly_name)
        if text_node is None or assembly_node is None:
            continue
        try:
            text_value = str(input_item(text_node, "system_textareaInput").get("value", ""))
            reference_token = base.token(
                assembly_node["nodeId"], output_id(assembly_node, "public_reference_map_json")
            )
            duplicated_public_token = base.token(
                assembly_node["nodeId"], output_id(assembly_node, "candidate_json_passthrough")
            )
            r1_assembly_node = unique_by_name("候选题装配与硬检-首轮")
            previous_full_token = (
                base.token(
                    r1_assembly_node["nodeId"],
                    output_id(r1_assembly_node, "internal_candidate_json"),
                )
                if second_round and r1_assembly_node is not None
                else ""
            )
        except BuildError as exc:
            errors.append(str(exc))
            continue
        compact = (
            reference_token in text_value
            and duplicated_public_token not in text_value
            and (not second_round or previous_full_token not in text_value)
        )
        validation_payload_audit[input_name] = {
            "uses_public_reference_map": reference_token in text_value,
            "duplicates_public_candidate": duplicated_public_token in text_value,
            "duplicates_previous_full_candidate": bool(
                second_round and previous_full_token and previous_full_token in text_value
            ),
            "compact": compact,
        }
        if not compact:
            errors.append(f"{input_name} does not use the compact validation payload contract")

    # Compatibility globals remain addressable but are not read by any node.
    by_label = {str(item.get("label")): item for item in global_variables}
    compatibility_keys = {
        label: str(by_label.get(label, {}).get("key", ""))
        for label in ("question_count", "difficulty", "question_draft", "review_feedback", "case_intro_images")
    }
    serialized_inputs = json.dumps(
        [{"node": node.get("nodeId"), "inputs": node.get("inputs", [])} for node in nodes],
        ensure_ascii=False,
    )
    for label in ("question_draft", "review_feedback", "case_intro_images"):
        key = compatibility_keys.get(label, "")
        if key and (
            f'"VARIABLE_NODE_ID", "{key}"' in serialized_inputs
            or f"{{$VARIABLE_NODE_ID.{key}$}}" in serialized_inputs
        ):
            errors.append(f"compatibility global {label} is still read by an executable node")
    for label in ("question_count", "difficulty"):
        key = compatibility_keys.get(label, "")
        if key and (
            f'"VARIABLE_NODE_ID", "{key}"' in serialized_inputs
            or f"{{$VARIABLE_NODE_ID.{key}$}}" in serialized_inputs
        ):
            errors.append(f"fixed global {label} is still read instead of internal constant")

    # The three answer nodes may only read final publication normalization.
    final_normalizer = unique_by_name("最终发布状态归一")
    final_split = unique_by_name("最终发布分流")
    answer_names = ["输出已通过题目", "输出资料不足", "指定回复#3"]
    for name in answer_names:
        node = unique_by_name(name)
        if node is None or final_normalizer is None or final_split is None:
            continue
        try:
            value = input_item(node, "text").get("value")
        except BuildError as exc:
            errors.append(str(exc))
            continue
        expected_ref = [final_normalizer["nodeId"], output_id(final_normalizer, "final_response_json")]
        if value != expected_ref:
            errors.append(f"{name} does not exclusively read 最终发布状态归一.final_response_json")
        incoming = [edge for edge in edges if edge.get("target") == node.get("nodeId")]
        if len(incoming) != 1 or incoming[0].get("source") != final_split.get("nodeId"):
            errors.append(f"{name} has a publication bypass or ambiguous incoming edge")

    # Explicit double-round gates must exist and medical validators are bypassed only through auditable=false ELSE.
    r1_auditable = unique_by_name("是否可独立医审-首轮")
    r2_auditable = unique_by_name("是否可独立医审-第二轮")
    r1_validator = unique_by_name("题目校验-首轮")
    r2_validator = unique_by_name("题目校验-第二轮")
    r1_review = unique_by_name("审核结果合并-首轮")
    r2_review = unique_by_name("审核结果合并-第二轮")
    for gate, validator, review, branch, label in (
        (r1_auditable, r1_validator, r1_review, "v12R1Auditable", "首轮"),
        (r2_auditable, r2_validator, r2_review, "v12R2Auditable", "第二轮"),
    ):
        if gate is None or validator is None or review is None:
            continue
        validator_inputs = [edge for edge in edges if edge.get("target") == validator.get("nodeId")]
        if len(validator_inputs) != 1:
            errors.append(f"{label}题目校验 must have exactly one gated input")
        if not has_edge(gate, review, "ELSE"):
            errors.append(f"{label} medical-audit skip does not converge on 审核结果合并")
        gate_edges = [edge for edge in edges if edge.get("source") == gate.get("nodeId")]
        allowed_handles = {f"{gate['nodeId']}-source-{branch}", f"{gate['nodeId']}-source-ELSE"}
        if {edge.get("sourceHandle") for edge in gate_edges} != allowed_handles:
            errors.append(f"{label} medical auditable gate has unexpected branches")

    # Contract markers in deterministic code.
    required_markers = {
        "证据注册与压缩-最终": [
            "evidence_id", "dataSourceName", "hard_candidate_count", "retrieval_health",
        ],
        "候选题装配与硬检-首轮": [
            "clinical_reasoning", "guidelineRef", "validator_evidence_json",
            "medical_auditable", "RETRIEVAL_FAILURE",
        ],
        "修订补丁合并": ["preserve_ids", "merge_decision", "changed_ids"],
        "审核结果合并-首轮": [
            "VALIDATOR_PASS_INCONSISTENT", "FULL_QUESTION_FIELDS", "validPassQuestionChecks",
        ],
        "审核结果合并-第二轮": [
            "patchInsufficient", "structureAllowsStop", "patchTransportOk",
        ],
        "最终发布状态归一": [
            "REVISE_EXHAUSTED", 'schema_version: "1.1"', "finalScore >= 75",
            "independentGate", "normalizedMissing", "candidateSummary",
        ],
    }
    for name, markers in required_markers.items():
        node = unique_by_name(name)
        if node is None:
            continue
        try:
            code = str(input_item(node, "code").get("value", ""))
        except BuildError as exc:
            errors.append(str(exc))
            continue
        for marker in markers:
            if marker not in code:
                errors.append(f"{name}.code missing required marker {marker!r}")
        if name.startswith("审核结果合并-"):
            if "patchOk" in code:
                errors.append(f"{name}.code retains undefined patchOk")
            if "fields: []" in code:
                errors.append(f"{name}.code retains empty fallback repair task fields")
            if "candidate_internal_json: String" in code or "candidate_public_json: String" in code:
                errors.append(f"{name}.feedback_json duplicates full candidate payloads")

    if "DO_NOT_IMPORT" in workflow_text:
        errors.append("workflow contains DO_NOT_IMPORT marker")

    asset_hashes = {path.name: sha256(path) for path in asset_paths if path.is_file()}
    unresolved_runtime_validation = [
        "尚未在FastGPT测试副本执行导入；需确认当前服务版本接受全部动态输出类型、条件分支与可选未执行引用。",
        "尚未运行ALK连续3次及至少20病例的新旧流程各3次A/B；耗时、token、PASS率和医学错误目标均需线上实测。",
        "离线构建不能证明数据库召回质量、证据适用性或医学结论正确；最终仍以两轮独立校验和人工抽查为准。",
        "case_intro_images兼容输入被明确保留但不接入模型；需要图片理解时应由独立上游人工确认流程处理。",
    ]
    return {
        "status": "PASS" if not errors else "FAIL",
        "workflow_version": "1.2",
        "public_schema_version": "1.1",
        "source": str(SOURCE),
        "source_sha256": source_hash,
        "source_expected_sha256": EXPECTED_SOURCE_SHA256,
        "source_unchanged": source_hash.lower() == EXPECTED_SOURCE_SHA256,
        "output": str(OUTPUT),
        "report": str(REPORT),
        "import_ready": not errors,
        "DO_NOT_IMPORT": False,
        "node_count": len(nodes),
        "edge_count": len(edges),
        "reachable_executable_nodes": len(reachable),
        "errors": errors,
        "warnings": warnings,
        "unresolved_schema_issues": [],
        "unresolved_runtime_validation": unresolved_runtime_validation,
        "asset_sha256": asset_hashes,
        "embedded_prompt_text": embedded_prompt_audit,
        "embedded_asset_text": embedded_asset_audit,
        "retrieval_health_wiring": retrieval_health_wiring,
        "fail_closed_optional_inputs": fail_closed_input_audit,
        "validation_payload": validation_payload_audit,
        "model_configuration": model_audit,
        "compatibility_global_keys": compatibility_keys,
        "checks": {
            "json_root_shape": isinstance(nodes, list) and isinstance(edges, list),
            "unique_node_ids": len(node_ids) == len(set(node_ids)),
            "no_dangling_edges_or_refs": not any("missing" in item or "dangling" in item for item in errors),
            "five_lane_nodes_preserved": all(
                unique_by_name(name) is not None
                for name in (
                    "良医汇医学数据库（指南检索）",
                    "良医汇医学数据库（指南检索B）",
                    "良医汇医学数据库（临床研究检索）",
                    "irAE正式指南检索A",
                    "irAE正式指南检索B",
                )
            ),
            "conditional_study_supplement": not any("supplement" in item.lower() or "知识库搜索" in item for item in errors),
            "explicit_two_rounds_no_loop": not loop_nodes and not present_forbidden,
            "single_final_publication_owner": all(
                unique_by_name(name) is not None for name in ("最终发布状态归一", "最终发布分流")
            ),
            "public_release_requires_independent_pass_score_75": "finalScore >= 75" in FINAL_NORMALIZE_CODE,
        },
    }


def run_behavioral_self_tests(workflow_path: Path) -> dict[str, Any]:
    commands = [
        ("deterministic_assets", ["node", str(ASSET_SELF_TEST)]),
        ("embedded_gate_matrix", ["node", str(GATE_SELF_TEST), str(workflow_path)]),
    ]
    results: list[dict[str, Any]] = []
    for name, command in commands:
        entry: dict[str, Any] = {"name": name, "command": command}
        try:
            completed = subprocess.run(
                command,
                cwd=ROOT,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=60,
                check=False,
            )
            entry["exit_code"] = completed.returncode
            entry["stderr"] = completed.stderr.strip()
            try:
                parsed = json.loads(completed.stdout)
            except json.JSONDecodeError:
                parsed = None
                entry["stdout"] = completed.stdout.strip()
            if isinstance(parsed, dict):
                entry["reported_status"] = parsed.get("status")
                if "assertions" in parsed:
                    entry["assertions"] = parsed["assertions"]
                if "matrix" in parsed:
                    entry["matrix"] = parsed["matrix"]
            entry["passed"] = (
                completed.returncode == 0
                and isinstance(parsed, dict)
                and parsed.get("status") == "PASS"
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            entry.update(
                {
                    "exit_code": None,
                    "stderr": str(exc),
                    "passed": False,
                }
            )
        results.append(entry)
    passed = all(item.get("passed") is True for item in results)
    return {"status": "PASS" if passed else "FAIL", "commands": results}


def main() -> int:
    try:
        workflow, audit = build()
    except (BuildError, OSError, json.JSONDecodeError) as exc:
        ARTIFACTS.mkdir(parents=True, exist_ok=True)
        removed_stale_output = OUTPUT.exists()
        OUTPUT.unlink(missing_ok=True)
        STAGING_OUTPUT.unlink(missing_ok=True)
        failure = {
            "status": "FAIL",
            "workflow_version": "1.2",
            "source": str(SOURCE),
            "output": str(OUTPUT),
            "report": str(REPORT),
            "import_ready": False,
            "DO_NOT_IMPORT": True,
            "output_removed_on_failure": removed_stale_output,
            "errors": [str(exc)],
            "unresolved_schema_issues": ["构建前置条件失败，未生成可导入工作流。"],
        }
        REPORT.write_text(json.dumps(failure, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(failure, ensure_ascii=False, indent=2), file=sys.stderr)
        return 2

    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    if audit["errors"]:
        removed_stale_output = OUTPUT.exists()
        OUTPUT.unlink(missing_ok=True)
        STAGING_OUTPUT.unlink(missing_ok=True)
        audit["status"] = "FAIL"
        audit["import_ready"] = False
        audit["DO_NOT_IMPORT"] = True
        audit["output_replaced"] = False
        audit["output_removed_on_failure"] = removed_stale_output
        REPORT.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(audit, ensure_ascii=False, indent=2), file=sys.stderr)
        return 2

    STAGING_OUTPUT.unlink(missing_ok=True)
    STAGING_OUTPUT.write_text(
        json.dumps(workflow, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    behavioral = run_behavioral_self_tests(STAGING_OUTPUT)
    audit["behavioral_self_test"] = behavioral
    if behavioral["status"] != "PASS":
        audit["errors"].append("behavioral self-test failed; generated workflow is not import-ready")
        audit["status"] = "FAIL"
        audit["import_ready"] = False
        audit["DO_NOT_IMPORT"] = True
        audit["output_replaced"] = False
        removed_stale_output = OUTPUT.exists()
        OUTPUT.unlink(missing_ok=True)
        STAGING_OUTPUT.unlink(missing_ok=True)
        audit["output_removed_on_failure"] = removed_stale_output
    else:
        STAGING_OUTPUT.replace(OUTPUT)
        extractor = find(workflow, "研究线索提取", "code")
        RESEARCH_EXTRACTOR_CODE.write_text(
            str(input_item(extractor, "code").get("value") or "") + "\n",
            encoding="utf-8",
        )
        audit["status"] = "PASS"
        audit["import_ready"] = True
        audit["DO_NOT_IMPORT"] = False
        audit["output_replaced"] = True
        audit["output_sha256"] = sha256(OUTPUT)
        audit["output_size_bytes"] = OUTPUT.stat().st_size
    REPORT.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    stream = sys.stdout if audit["import_ready"] else sys.stderr
    print(json.dumps(audit, ensure_ascii=False, indent=2), file=stream)
    return 0 if audit["import_ready"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
