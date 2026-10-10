#!/usr/bin/env python3
"""Create a fail-closed FastGPT v1.1 offline audit reference from the current export.

The source file is never modified. Every mutation is guarded by node-name,
node-type, input-key, output-key, and edge preflight checks. If a required
identity is ambiguous, no transformed reference is emitted; a report and exact
manual steps are still written. Generated JSON is never authorized for import.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Iterable


DEFAULT_INPUT = Path.home() / "Downloads" / "肿瘤大查房小工具 (AI简化) (5).json"
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parents[2] / "outputs" / "快速稳定五题-v1.1"

EVIDENCE_NODE_ID = "v11EvidenceRegistry"
EVIDENCE_POOL_OUTPUT_ID = "v11EvidencePoolJson"
EVIDENCE_STATUS_OUTPUT_ID = "v11EvidenceRegistryStatus"
EVIDENCE_REPORT_OUTPUT_ID = "v11EvidenceRegistryReport"
SELECTOR_NODE_ID = "v11SelectedEvidence"
SELECTED_EVIDENCE_OUTPUT_ID = "v11SelectedEvidenceJson"
SELECTOR_STATUS_OUTPUT_ID = "v11SelectedEvidenceStatus"
SELECTOR_REPORT_OUTPUT_ID = "v11SelectedEvidenceReport"


class MigrationError(RuntimeError):
    pass


@dataclass
class MigrationReport:
    source: str
    source_sha256: str = ""
    source_sha_note: str = "源文件只读；未覆盖 Downloads 或线上工作流"
    workflow_name_before: str = ""
    workflow_name_after: str = ""
    changes: list[str] = field(default_factory=list)
    unresolved: list[str] = field(default_factory=list)
    preflight_errors: list[str] = field(default_factory=list)
    import_ready: bool = False
    DO_NOT_IMPORT: bool = True
    output_workflow: str = ""


PURE_MECHANICAL_NORMALIZER_CODE = r'''function main({ agent_reply }) {
  const raw = String(agent_reply ?? "").trim();
  let data;

  try {
    data = JSON.parse(raw);
  } catch (error) {
    return {
      normalized_json: raw,
      normalization_status: "INVALID_JSON",
      normalization_report: `JSON.parse失败：${String(error?.message || error)}；未修改原始输出。`
    };
  }

  if (data?.generation_status !== "success") {
    return {
      normalized_json: raw,
      normalization_status: "PASSTHROUGH",
      normalization_report: "generation_status不是success；未修改原始输出。"
    };
  }

  const problems = [];
  const requiredQuestionFields = [
    "id", "type", "phase", "timepoint", "question", "options", "answer",
    "answer_text", "explain", "keyPoint", "guidelineRef"
  ];
  const referenceFields = [
    "evidence_type", "doc_id", "split_index", "type", "authority",
    "source_title", "source_version", "source_section", "source_url",
    "evidence_summary"
  ];
  const allowedEvidenceTypes = new Set(["指南", "临床研究", "病例+临床推理"]);

  if (data.schema_version !== "1.1") problems.push("schema_version必须为1.1");
  if (data.question_count !== 5) problems.push("question_count必须为5");
  if (data.difficulty !== "进阶") problems.push("difficulty必须为进阶");
  if (typeof data.case_summary !== "string" || !data.case_summary.trim()) problems.push("case_summary不能为空");
  if (!Array.isArray(data.missing_information) || data.missing_information.length !== 0) problems.push("success状态missing_information必须为空数组");
  if (data.risk_message !== "") problems.push("success状态risk_message必须为空字符串");
  if (!Array.isArray(data.questions) || data.questions.length !== 5) {
    problems.push("success状态必须恰好包含5题");
  }

  let hardCount = 0;
  let reasoningCount = 0;
  if (Array.isArray(data.questions)) {
    data.questions.forEach((question, index) => {
      const label = question?.id || `Q${index + 1}`;
      if (!question || typeof question !== "object") {
        problems.push(`${label}不是对象`);
        return;
      }
      if (question.id !== `Q${index + 1}`) problems.push(`${label}的id必须为Q${index + 1}`);
      requiredQuestionFields.forEach((field) => {
        if (!(field in question)) problems.push(`${label}缺少${field}`);
      });
      if (!Array.isArray(question.options) || question.options.length !== 4) {
        problems.push(`${label}的options必须是4项数组`);
      } else {
        if (question.options.some((option) => typeof option !== "string" || !option.trim())) {
          problems.push(`${label}存在空选项或非字符串选项`);
        }
        if (new Set(question.options.map((option) => String(option).trim())).size !== 4) {
          problems.push(`${label}存在重复选项`);
        }
      }
      if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) {
        problems.push(`${label}的answer必须是0至3整数`);
      } else if (Array.isArray(question.options) && question.answer_text !== question.options[question.answer]) {
        problems.push(`${label}的answer_text与options[answer]不一致`);
      }
      const ref = question.guidelineRef;
      if (!ref || typeof ref !== "object" || Array.isArray(ref)) {
        problems.push(`${label}的guidelineRef不是对象`);
      } else {
        const keys = Object.keys(ref).sort();
        const expected = [...referenceFields].sort();
        if (JSON.stringify(keys) !== JSON.stringify(expected)) {
          problems.push(`${label}的guidelineRef必须且只能包含10字段`);
        }
        referenceFields.forEach((field) => {
          if (field === "split_index") {
            if (!Number.isInteger(ref[field]) || ref[field] < 0) problems.push(`${label}的split_index必须为非负整数`);
          } else if (typeof ref[field] !== "string") {
            problems.push(`${label}的guidelineRef.${field}必须为字符串`);
          }
        });
        if (!allowedEvidenceTypes.has(ref.evidence_type)) {
          problems.push(`${label}的evidence_type不在v1.1枚举内`);
        } else if (ref.evidence_type === "病例+临床推理") {
          reasoningCount += 1;
        } else {
          hardCount += 1;
        }
      }
    });
  }
  if (hardCount < 2) problems.push(`硬证据题${hardCount}道，少于2道`);
  if (reasoningCount < 2) problems.push(`病例+临床推理题${reasoningCount}道，少于2道`);

  return {
    normalized_json: raw,
    normalization_status: problems.length ? "STRUCTURE_INVALID" : "VALID",
    normalization_report: problems.length
      ? `${problems.join("；")}；未重排选项、未改答案、未改医学文本。`
      : "机械结构检查通过；原始JSON逐字透传，未重排选项、未改答案、未改医学文本。"
  };
}'''


EVIDENCE_REGISTRY_CODE = r'''function main({ guideline_a, guideline_b, study_initial, study_supplement, irae_a, irae_b }) {
  function rows(value) {
    if (Array.isArray(value)) return value;
    if (value && Array.isArray(value.result)) return value.result;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.result) ? parsed.result : []);
      } catch (_) { return []; }
    }
    return [];
  }

  function clean(value) {
    return String(value ?? "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/\uFFFD/g, "")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function first(item, keys) {
    for (const key of keys) {
      if (item && item[key] !== undefined && item[key] !== null) return item[key];
    }
    return "";
  }

  function compact(item, lane) {
    const snippet = clean(first(item, ["snippet", "content", "text", "a", "q"])).slice(0, 1000);
    return {
      evidence_lane: lane,
      docId: clean(first(item, ["docId", "doc_id"])),
      splitIndex: first(item, ["splitIndex", "split_index"]),
      type: clean(first(item, ["type"])),
      authority: clean(first(item, ["authority"])),
      title: clean(first(item, ["title"])),
      dataSourceName: clean(first(item, ["dataSourceName", "sourceName"])),
      year: clean(first(item, ["year", "version"])),
      section: clean(first(item, ["section", "sourceSection", "chapter"])),
      link: clean(first(item, ["link", "url", "sourceUrl"])),
      snippet,
      score: first(item, ["score", "similarity", "relevance"])
    };
  }

  const laneSpecs = [
    ["指南A", guideline_a, 6],
    ["指南B", guideline_b, 6],
    ["临床研究初检", study_initial, 5],
    ["临床研究补检", study_supplement, 3],
    ["irAE指南A", irae_a, 4],
    ["irAE指南B", irae_b, 4]
  ];
  const seen = new Set();
  const records = [];
  const counts = {};
  let skippedWithoutLocator = 0;

  for (const [lane, value, limit] of laneSpecs) {
    counts[lane] = 0;
    for (const item of rows(value)) {
      if (counts[lane] >= limit) break;
      const normalized = compact(item, lane);
      if (!normalized.docId || normalized.splitIndex === "" || normalized.splitIndex === null || normalized.splitIndex === undefined) {
        skippedWithoutLocator += 1;
        continue;
      }
      const locator = `${normalized.docId}::${String(normalized.splitIndex)}`;
      if (seen.has(locator)) continue;
      seen.add(locator);
      records.push(normalized);
      counts[lane] += 1;
    }
  }

  const payload = {
    registry_version: "1.1",
    dedupe_key: "docId+splitIndex",
    snippet_limit_chars: 1000,
    counts,
    records
  };
  return {
    evidence_pool_json: JSON.stringify(payload),
    registry_status: records.length >= 5 ? "READY" : "POOL_LT_5",
    registry_report: JSON.stringify({ kept: records.length, skipped_without_locator: skippedWithoutLocator, counts })
  };
}'''


SELECTED_EVIDENCE_CODE = r'''function main({ normalized_json, evidence_pool_json }) {
  function parse(value) {
    if (value && typeof value === "object") return value;
    return JSON.parse(String(value ?? ""));
  }

  try {
    const questions = parse(normalized_json);
    const pool = parse(evidence_pool_json);
    const records = Array.isArray(pool?.records) ? pool.records : [];
    const index = new Map(records.map((record) => [
      `${String(record?.docId ?? "")}::${String(record?.splitIndex ?? "")}`,
      record
    ]));
    const requested = [];
    const selected = [];
    const missing = [];
    for (const question of (Array.isArray(questions?.questions) ? questions.questions : [])) {
      const ref = question?.guidelineRef || {};
      const key = `${String(ref.doc_id ?? "")}::${String(ref.split_index ?? "")}`;
      requested.push({ question_id: question?.id || "", locator: key });
      const record = index.get(key);
      if (record) selected.push({ question_id: question?.id || "", ...record });
      else missing.push({ question_id: question?.id || "", locator: key });
    }
    return {
      selected_evidence_json: JSON.stringify({ registry_version: "1.1", requested, records: selected, missing }),
      selection_status: missing.length ? "MISSING_LOCATOR" : "READY",
      selection_report: JSON.stringify({ requested: requested.length, selected: selected.length, missing })
    };
  } catch (error) {
    return {
      selected_evidence_json: JSON.stringify({ registry_version: "1.1", requested: [], records: [], missing: [] }),
      selection_status: "INVALID_INPUT",
      selection_report: String(error?.message || error)
    };
  }
}'''


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(value, dict):
        raise MigrationError("workflow export root must be an object")
    return value


def find_unique_node(workflow: dict[str, Any], name: str, flow_type: str | None = None) -> dict[str, Any]:
    matches = [node for node in workflow.get("nodes", []) if node.get("name") == name]
    if len(matches) != 1:
        raise MigrationError(f"expected exactly one node named {name!r}; found {len(matches)}")
    node = matches[0]
    if flow_type and node.get("flowNodeType") != flow_type:
        raise MigrationError(
            f"node {name!r} type mismatch: expected {flow_type!r}, found {node.get('flowNodeType')!r}"
        )
    return node


def input_by_key(node: dict[str, Any], key: str) -> dict[str, Any]:
    matches = [item for item in node.get("inputs", []) if item.get("key") == key]
    if len(matches) != 1:
        raise MigrationError(f"node {node.get('name')!r}: input {key!r} found {len(matches)} times")
    return matches[0]


def output_by_key(node: dict[str, Any], key: str) -> dict[str, Any]:
    matches = [item for item in node.get("outputs", []) if item.get("key") == key]
    if len(matches) != 1:
        raise MigrationError(f"node {node.get('name')!r}: output {key!r} found {len(matches)} times")
    return matches[0]


def variable_key(workflow: dict[str, Any], label: str) -> str:
    variables = workflow.get("chatConfig", {}).get("variables", [])
    matches = [item for item in variables if item.get("label") == label]
    if len(matches) != 1:
        raise MigrationError(f"global variable {label!r} found {len(matches)} times")
    key = matches[0].get("key")
    if not isinstance(key, str) or not key:
        raise MigrationError(f"global variable {label!r} has no stable key")
    return key


def token(node_id: str, output_id: str) -> str:
    return "{{$" + node_id + "." + output_id + "$}}"


def global_token(key: str) -> str:
    return "{{$VARIABLE_NODE_ID." + key + "$}}"


def edge_key(edge: dict[str, Any]) -> tuple[str, str]:
    return str(edge.get("source")), str(edge.get("target"))


def make_edge(source: str, target: str) -> dict[str, str]:
    return {
        "source": source,
        "target": target,
        "sourceHandle": f"{source}-source-right",
        "targetHandle": f"{target}-target-left",
    }


def add_edge(workflow: dict[str, Any], source: str, target: str) -> None:
    if any(edge_key(edge) == (source, target) for edge in workflow["edges"]):
        return
    workflow["edges"].append(make_edge(source, target))


def remove_exact_edge(workflow: dict[str, Any], source: str, target: str) -> None:
    matches = [edge for edge in workflow["edges"] if edge_key(edge) == (source, target)]
    if len(matches) != 1:
        raise MigrationError(f"expected one edge {source}->{target}; found {len(matches)}")
    workflow["edges"].remove(matches[0])


def ensure_unique_new_ids(workflow: dict[str, Any], values: Iterable[str]) -> None:
    existing: set[str] = set()
    for node in workflow.get("nodes", []):
        existing.add(str(node.get("nodeId", "")))
        existing.update(str(item.get("id", "")) for item in node.get("outputs", []))
    collisions = [value for value in values if value in existing]
    if collisions:
        raise MigrationError(f"new v1.1 IDs collide with source export: {collisions}")


def make_code_node(
    template: dict[str, Any],
    *,
    node_id: str,
    name: str,
    code: str,
    position: dict[str, float],
    parent_node_id: str | None,
    inputs: list[tuple[str, str, bool, list[str]]],
    outputs: list[tuple[str, str, str]],
) -> dict[str, Any]:
    node = copy.deepcopy(template)
    node["nodeId"] = node_id
    node["name"] = name
    node["intro"] = "v1.1 deterministic code gate"
    node["position"] = position
    if parent_node_id:
        node["parentNodeId"] = parent_node_id
    else:
        node.pop("parentNodeId", None)

    base_inputs = [copy.deepcopy(input_by_key(template, key)) for key in ("system_addInputParam", "codeType", "code")]
    input_by_key({"name": name, "inputs": base_inputs}, "code")["value"] = code
    for key, value_type, required, reference in inputs:
        base_inputs.append(
            {
                "key": key,
                "label": key,
                "valueType": value_type,
                "required": required,
                "renderTypeList": ["reference"],
                "value": reference,
                "debugLabel": "",
                "toolDescription": "",
            }
        )
    node["inputs"] = base_inputs

    base_outputs = [
        copy.deepcopy(output_by_key(template, key))
        for key in ("system_rawResponse", "error", "system_addOutputParam")
    ]
    dynamic_template = next(
        (item for item in template.get("outputs", []) if item.get("type") == "dynamic" and item.get("key") != "system_addOutputParam"),
        None,
    )
    if dynamic_template is None:
        raise MigrationError("code-node template has no dynamic output to clone")
    for output_id, key, value_type in outputs:
        item = copy.deepcopy(dynamic_template)
        item.update({"id": output_id, "key": key, "valueType": value_type, "label": key, "description": ""})
        base_outputs.append(item)
    node["outputs"] = base_outputs
    return node


def patch_research_supplement_condition(
    workflow: dict[str, Any],
    research_extractor: dict[str, Any],
    guideline_a: dict[str, Any],
    guideline_b: dict[str, Any],
    study_initial: dict[str, Any],
) -> None:
    code_input = input_by_key(research_extractor, "code")
    code = code_input.get("value")
    if not isinstance(code, str):
        raise MigrationError("研究线索提取 code is not a string")
    signature = "function main({ quotes, original_query })"
    if signature not in code:
        raise MigrationError("研究线索提取 signature changed; conditional supplement patch refused")
    old_block = """  const hasLeads = expandedTerms.length > 0;\n  const baseQuery = clean(original_query);\n\n  const expandedQuery = hasLeads\n"""
    if old_block not in code:
        raise MigrationError("研究线索提取 lead-decision block changed; conditional supplement patch refused")
    code = code.replace(
        signature,
        "function main({ quotes, original_query, initial_studies, guideline_a, guideline_b })",
        1,
    )
    new_block = """  function rowsFromResult(value) {
    if (Array.isArray(value)) return value;
    if (value && Array.isArray(value.result)) return value.result;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.result) ? parsed.result : []);
      } catch (_) { return []; }
    }
    return [];
  }

  function recordText(item) {
    try { return clean(JSON.stringify(item)); } catch (_) { return clean(item); }
  }

  function clearlyEligibleStudy(item) {
    const value = recordText(item);
    const identity = /(?:\\bNCT\\d{8}\\b|\\b[A-Z][A-Z0-9-]{2,24}\\s*(?:研究|试验|study|trial)|临床试验)/i.test(value);
    const design = /(?:随机|开放标签|单臂|双盲|前瞻性|回顾性|phase\\s*[1-4]|[ⅠⅡⅢⅣIVX]+期)/i.test(value);
    const population = /(?:入组|纳入|患者|patients?|受试者)/i.test(value);
    const intervention = /(?:治疗|方案|联合|单药|versus|\\bvs\\b|接受)/i.test(value);
    const result = /(?:主要终点|终点|PFS|OS|ORR|DFS|EFS|HR|缓解率|生存期|个月|结果)/i.test(value);
    return identity && design && population && intervention && result;
  }

  function eligibleGuidelineCount(value) {
    const seen = new Set();
    for (const item of rowsFromResult(value)) {
      if (String(item?.type || "") !== "guideline" || !clean(item?.authority)) continue;
      const doc = clean(item?.docId ?? item?.doc_id);
      const split = item?.splitIndex ?? item?.split_index;
      if (doc && split !== undefined && split !== null && split !== "") seen.add(`${doc}::${String(split)}`);
    }
    return seen.size;
  }

  const initialStudyRows = rowsFromResult(initial_studies);
  const initialHasEligibleStudy = initialStudyRows.some(clearlyEligibleStudy);
  const baseEligiblePool = eligibleGuidelineCount(guideline_a) + eligibleGuidelineCount(guideline_b) + (initialHasEligibleStudy ? 1 : 0);
  const hasCandidateLeads = expandedTerms.length > 0;
  const hasLeads = hasCandidateLeads && (!initialHasEligibleStudy || baseEligiblePool < 5);
  const baseQuery = clean(original_query);

  const expandedQuery = hasLeads
"""
    code_input["value"] = code.replace(old_block, new_block, 1)

    existing_keys = {item.get("key") for item in research_extractor.get("inputs", [])}
    for key, node in (
        ("initial_studies", study_initial),
        ("guideline_a", guideline_a),
        ("guideline_b", guideline_b),
    ):
        if key in existing_keys:
            raise MigrationError(f"研究线索提取 already has unexpected input {key!r}")
        result_output = output_by_key(node, "result")
        research_extractor["inputs"].append(
            {
                "key": key,
                "label": key,
                "valueType": "arrayObject",
                "required": False,
                "renderTypeList": ["reference"],
                "value": [node["nodeId"], result_output["id"]],
                "debugLabel": "",
                "toolDescription": "",
            }
        )
        add_edge(workflow, node["nodeId"], research_extractor["nodeId"])


def build_validation_splice(workflow: dict[str, Any], normalizer: dict[str, Any]) -> str:
    labels = [
        ("病种", "disease"),
        ("病例模式", "case_mode"),
        ("初始病例资料", "case_context"),
        ("全程诊疗时间线", "case_timeline"),
        ("病理与生物标志物", "biomarkers"),
        ("关键临床决策点", "decision_points"),
        ("治疗相关不良反应", "adverse_events"),
        ("证据与应用边界", "evidence_notes"),
        ("目标题量", "question_count"),
        ("题目难度", "difficulty"),
    ]
    case_lines = ["【本轮病例资料】"]
    for display, label in labels:
        case_lines.append(f"{display}：{global_token(variable_key(workflow, label))}")
    return "\n".join(case_lines) + "\n\n" + "\n\n".join(
        (
            "【本题组实际引用证据：来自证据注册表，包含临床研究初检与补检】\n"
            + token(SELECTOR_NODE_ID, SELECTED_EVIDENCE_OUTPUT_ID),
            "【证据选择状态】\n" + token(SELECTOR_NODE_ID, SELECTOR_STATUS_OUTPUT_ID),
            "【当前待审核题目完整JSON】\n"
            + token(normalizer["nodeId"], output_by_key(normalizer, "normalized_json")["id"]),
            "【上一轮原始题目草稿】\n" + global_token(variable_key(workflow, "question_draft")),
            "【上一轮必须落实的修订要求】\n" + global_token(variable_key(workflow, "review_feedback")),
        )
    )


def migration_manual_steps(report: MigrationReport) -> str:
    unresolved = "\n".join(f"- {item}" for item in report.unresolved) or "- 无"
    return f"""# 快速稳定五题 v1.1：人工核验步骤

> **DO_NOT_IMPORT={str(report.DO_NOT_IMPORT).lower()}**。本目录 JSON 仅用于离线审计和字段差异核对，禁止导入 FastGPT。实际改造必须先在 FastGPT 线上复制当前工作流，再逐节点修改。

## 尚未自动完成

{unresolved}

## 一次核验一个可见动作

1. **节点：** FastGPT 工作流列表中的当前线上工作流
   **字段/位置：** 更多操作 → 复制
   **动作：** 在线复制当前工作流，并将副本命名为“快速稳定五题测试版 v1.1”。不得导入本目录 JSON。
   **预期结果：** 线上副本与生产工作流并存，生产工作流未被覆盖。
   **回传材料：** 工作流列表中生产版与测试副本同时存在的截图。

2. **节点：** 证据注册与压缩
   **字段/位置：** 完整响应 → `registry_status` 与 `registry_report`
   **动作：** 使用一个脱敏病例运行节点调试。
   **预期结果：** 全局按 `docId+splitIndex` 去重；各路上限为 6/6/5/3/4/4；snippet 不超过 1000 字。
   **回传材料：** 完整 `registry_report` 和 `evidence_pool_json`。

3. **节点：** 题目结构归一化
   **字段/位置：** 代码
   **动作：** 用含固定答案顺序的五题 JSON 调试两次。
   **预期结果：** 两次 `normalized_json` 与输入逐字一致；无选项重排、无字母分布逻辑。
   **回传材料：** 两次完整输出。

4. **节点：** 校验证据按引用提取
   **字段/位置：** `selected_evidence_json`
   **动作：** 用五题草稿调试。
   **预期结果：** 只返回五题引用 locator 对应记录；临床研究补检记录可被选中；缺失 locator 明确列入 `missing`。
   **回传材料：** 完整 `selected_evidence_json`。

5. **节点：** 循环节点
   **字段/位置：** 完整运行 JSON
   **动作：** 对同一脱敏病例执行一次端到端测试。
   **预期结果：** 最多两轮；只有最终独立 `decision=PASS` 才进入输出；成功恰好五题。
   **回传材料：** 两轮全部 `customOutputs`。
"""


def migrate(
    source: dict[str, Any],
    *,
    generator_prompt: str | None = None,
    validator_prompt: str | None = None,
) -> tuple[dict[str, Any], MigrationReport]:
    workflow = copy.deepcopy(source)
    report = MigrationReport(source="<in-memory>")
    report.workflow_name_before = str(workflow.get("name") or "")
    workflow["name"] = "【禁止导入】肿瘤大查房小工具-v1.1-离线审计参考"
    workflow["intro"] = "DO_NOT_IMPORT=true；仅用于离线审计差异核对。线上必须复制当前工作流后逐节点修改。"
    report.workflow_name_after = workflow["name"]

    if not isinstance(workflow.get("nodes"), list) or not isinstance(workflow.get("edges"), list):
        raise MigrationError("workflow must contain nodes[] and edges[]")
    ensure_unique_new_ids(
        workflow,
        (
            EVIDENCE_NODE_ID,
            EVIDENCE_POOL_OUTPUT_ID,
            EVIDENCE_STATUS_OUTPUT_ID,
            EVIDENCE_REPORT_OUTPUT_ID,
            SELECTOR_NODE_ID,
            SELECTED_EVIDENCE_OUTPUT_ID,
            SELECTOR_STATUS_OUTPUT_ID,
            SELECTOR_REPORT_OUTPUT_ID,
        ),
    )

    knowledge = find_unique_node(workflow, "知识库搜索", "datasetSearchNode")
    aggregator = find_unique_node(workflow, "文本拼接#2", "textEditor")
    plan_gate = find_unique_node(workflow, "出题计划与证据门禁", "chatNode")
    initializer = find_unique_node(workflow, "初始化循环变量", "variableUpdate")
    generator = find_unique_node(workflow, "题目生成", "chatNode")
    normalizer = find_unique_node(workflow, "题目结构归一化", "code")
    validation_splice = find_unique_node(workflow, "校验输入拼接", "textEditor")
    validator = find_unique_node(workflow, "题目校验", "chatNode")
    loop = find_unique_node(workflow, "循环节点", "loopRun")
    research_extractor = find_unique_node(workflow, "研究线索提取", "code")

    guideline_a = find_unique_node(workflow, "良医汇医学数据库（指南检索）", "tool")
    guideline_b = find_unique_node(workflow, "良医汇医学数据库（指南检索B）", "tool")
    study_initial = find_unique_node(workflow, "良医汇医学数据库（临床研究检索）", "tool")
    study_supplement = find_unique_node(workflow, "良医汇医学数据库（临床研究补检）", "tool")
    irae_a = find_unique_node(workflow, "irAE正式指南检索A", "tool")
    irae_b = find_unique_node(workflow, "irAE正式指南检索B", "tool")

    limit_input = input_by_key(knowledge, "limit")
    if limit_input.get("value") != 5000:
        raise MigrationError(f"知识库搜索.limit expected 5000; found {limit_input.get('value')!r}")
    limit_input["value"] = 1500
    report.changes.append("知识库搜索.limit: 5000 → 1500")

    variables = workflow.get("chatConfig", {}).get("variables", [])
    difficulty_vars = [item for item in variables if item.get("label") == "difficulty"]
    question_count_vars = [item for item in variables if item.get("label") == "question_count"]
    if len(difficulty_vars) != 1 or len(question_count_vars) != 1:
        raise MigrationError("difficulty/question_count global variable identity is ambiguous")
    difficulty_var = difficulty_vars[0]
    difficulty_var["defaultValue"] = "进阶"
    difficulty_var["list"] = [{"label": "进阶", "value": "进阶"}]
    difficulty_var["description"] = "v1.1固定为进阶；不得降级。"
    question_count_var = question_count_vars[0]
    question_count_var.update({"defaultValue": "5", "min": 5, "max": 5})
    question_count_var["description"] = "v1.1成功发布固定为5题；不足则STOP_INSUFFICIENT。"
    report.changes.append("全局 difficulty 固定为进阶，question_count 固定为5")

    normalizer_code = input_by_key(normalizer, "code")
    old_code = normalizer_code.get("value")
    if not isinstance(old_code, str) or "answerPatterns" not in old_code or "newOptions" not in old_code:
        raise MigrationError("题目结构归一化不再匹配已知选项重排版本；拒绝盲改")
    normalizer_code["value"] = PURE_MECHANICAL_NORMALIZER_CODE
    normalizer["inputs"] = [item for item in normalizer["inputs"] if item.get("key") != "case_id"]
    report.changes.append("题目结构归一化改为纯机械 fail-closed 检查；删除选项重排/答案字母分布逻辑")

    patch_research_supplement_condition(workflow, research_extractor, guideline_a, guideline_b, study_initial)
    report.changes.append("临床研究补检改为条件触发：初检无明确合格研究或基础证据池少于5时才使用线索补检")

    code_template = normalizer
    retrieval_inputs = [
        ("guideline_a", guideline_a),
        ("guideline_b", guideline_b),
        ("study_initial", study_initial),
        ("study_supplement", study_supplement),
        ("irae_a", irae_a),
        ("irae_b", irae_b),
    ]
    registry = make_code_node(
        code_template,
        node_id=EVIDENCE_NODE_ID,
        name="证据注册与压缩",
        code=EVIDENCE_REGISTRY_CODE,
        position={"x": float(aggregator.get("position", {}).get("x", 0)) - 600, "y": float(aggregator.get("position", {}).get("y", 0))},
        parent_node_id=None,
        inputs=[
            (key, "arrayObject", False, [node["nodeId"], output_by_key(node, "result")["id"]])
            for key, node in retrieval_inputs
        ],
        outputs=[
            (EVIDENCE_POOL_OUTPUT_ID, "evidence_pool_json", "string"),
            (EVIDENCE_STATUS_OUTPUT_ID, "registry_status", "string"),
            (EVIDENCE_REPORT_OUTPUT_ID, "registry_report", "string"),
        ],
    )
    workflow["nodes"].append(registry)

    incoming_to_aggregator = [edge for edge in workflow["edges"] if edge.get("target") == aggregator["nodeId"]]
    if len(incoming_to_aggregator) < 6:
        raise MigrationError("文本拼接#2 incoming topology is unexpectedly small; evidence-registry rewire refused")
    for edge in incoming_to_aggregator:
        edge["target"] = EVIDENCE_NODE_ID
        edge["targetHandle"] = f"{EVIDENCE_NODE_ID}-target-left"
    add_edge(workflow, EVIDENCE_NODE_ID, aggregator["nodeId"])

    aggregate_input = input_by_key(aggregator, "system_textareaInput")
    aggregate_text = aggregate_input.get("value")
    if not isinstance(aggregate_text, str):
        raise MigrationError("文本拼接#2 text is not a string")
    evidence_start = aggregate_text.find("【当前病种正式指南检索结果A")
    rules_start = aggregate_text.find("【证据使用规则】")
    if evidence_start < 0 or rules_start <= evidence_start:
        raise MigrationError("文本拼接#2 evidence block markers changed; compression splice refused")
    compressed_block = (
        "【证据注册、全局去重与压缩结果】\n\n"
        + token(EVIDENCE_NODE_ID, EVIDENCE_POOL_OUTPUT_ID)
        + "\n\n"
    )
    aggregate_input["value"] = aggregate_text[:evidence_start] + compressed_block + aggregate_text[rules_start:]
    report.changes.append("新增证据注册与压缩：docId+splitIndex 全局去重，6/6/5/3/4/4限额，snippet≤1000字；生成器不再接收原始数组")

    remove_exact_edge(workflow, aggregator["nodeId"], plan_gate["nodeId"])
    remove_exact_edge(workflow, plan_gate["nodeId"], initializer["nodeId"])
    add_edge(workflow, aggregator["nodeId"], initializer["nodeId"])
    report.changes.append("旁路独立出题计划与证据门禁；保留节点但断开，不删除线上可追溯配置")

    selector = make_code_node(
        code_template,
        node_id=SELECTOR_NODE_ID,
        name="校验证据按引用提取",
        code=SELECTED_EVIDENCE_CODE,
        position={
            "x": (float(normalizer.get("position", {}).get("x", 0)) + float(validation_splice.get("position", {}).get("x", 0))) / 2,
            "y": float(normalizer.get("position", {}).get("y", 0)) + 280,
        },
        parent_node_id=loop["nodeId"],
        inputs=[
            (
                "normalized_json",
                "string",
                True,
                [normalizer["nodeId"], output_by_key(normalizer, "normalized_json")["id"]],
            ),
            ("evidence_pool_json", "string", True, [EVIDENCE_NODE_ID, EVIDENCE_POOL_OUTPUT_ID]),
        ],
        outputs=[
            (SELECTED_EVIDENCE_OUTPUT_ID, "selected_evidence_json", "string"),
            (SELECTOR_STATUS_OUTPUT_ID, "selection_status", "string"),
            (SELECTOR_REPORT_OUTPUT_ID, "selection_report", "string"),
        ],
    )
    workflow["nodes"].append(selector)
    remove_exact_edge(workflow, normalizer["nodeId"], validation_splice["nodeId"])
    add_edge(workflow, normalizer["nodeId"], SELECTOR_NODE_ID)
    add_edge(workflow, SELECTOR_NODE_ID, validation_splice["nodeId"])

    children_input = input_by_key(loop, "childrenNodeIdList")
    children = children_input.get("value")
    if not isinstance(children, list) or normalizer["nodeId"] not in children or validation_splice["nodeId"] not in children:
        raise MigrationError("循环节点 childrenNodeIdList changed; selector insertion refused")
    children.insert(children.index(validation_splice["nodeId"]), SELECTOR_NODE_ID)

    validation_input = input_by_key(validation_splice, "system_textareaInput")
    old_validation_text = validation_input.get("value")
    if not isinstance(old_validation_text, str) or "临床研究：" not in old_validation_text or "临床研究补检：" in old_validation_text:
        raise MigrationError("校验输入拼接 does not match the expected pre-v1.1 state")
    validation_input["value"] = build_validation_splice(workflow, normalizer)
    report.changes.append("校验输入改为按五题 locator 精选证据；临床研究初检/补检统一纳入注册池，不再传完整五路数组")

    if generator_prompt is not None:
        input_by_key(generator, "systemPrompt")["value"] = generator_prompt
        report.changes.append("题目生成 systemPrompt 从显式 v1.1 文件注入")
    else:
        report.unresolved.append("题目生成尚未注入经审核的 v1.1 提示词；默认 fail closed。")
    if validator_prompt is not None:
        input_by_key(validator, "systemPrompt")["value"] = validator_prompt
        report.changes.append("题目校验 systemPrompt 从显式 v1.1 文件注入")
    else:
        report.unresolved.append("题目校验尚未注入经审核的 v1.1 提示词；默认 fail closed。")

    report.unresolved.append(
        "双 irAE 锚点模型未在离线 JSON 中自动重连；请在在线复制的测试工作流中使用本地 irAE双锚点确定性拆分.js 与 irAE锚点轻量回退-systemPrompt.txt，逐节点实现‘确定性拆分 + 最多一次轻量回退’并核验连线。"
    )
    report.unresolved.append("在线测试副本切换为生产版本前，必须完成一次完整循环 JSON 审计和至少20病例 A/B 验收；本脚本 JSON 永久禁止导入。")
    # This transformer is an offline audit/reference generator only. The active
    # online workflow remains the sole authority and must be copied/edited in UI.
    report.import_ready = False
    report.DO_NOT_IMPORT = True
    return workflow, report


def write_outputs(
    output_dir: Path,
    workflow: dict[str, Any] | None,
    report: MigrationReport,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    workflow_path = output_dir / "肿瘤大查房小工具-v1.1-离线审计参考-DO_NOT_IMPORT.json"
    if workflow is not None:
        workflow_path.write_text(json.dumps(workflow, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        report.output_workflow = str(workflow_path)
    (output_dir / "migration-report.json").write_text(
        json.dumps(asdict(report), ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (output_dir / "人工核验步骤.md").write_text(migration_manual_steps(report), encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--generator-prompt-file", type=Path)
    parser.add_argument("--validator-prompt-file", type=Path)
    parser.add_argument("--check-only", action="store_true", help="Run preflight/migration in memory; write nothing")
    args = parser.parse_args(argv)

    report = MigrationReport(source=str(args.input))
    workflow: dict[str, Any] | None = None
    try:
        source = load_json(args.input)
        generator_prompt = (
            args.generator_prompt_file.read_text(encoding="utf-8-sig")
            if args.generator_prompt_file
            else None
        )
        validator_prompt = (
            args.validator_prompt_file.read_text(encoding="utf-8-sig")
            if args.validator_prompt_file
            else None
        )
        workflow, generated_report = migrate(
            source,
            generator_prompt=generator_prompt,
            validator_prompt=validator_prompt,
        )
        generated_report.source = str(args.input)
        generated_report.source_sha256 = hashlib.sha256(args.input.read_bytes()).hexdigest()
        report = generated_report
    except (OSError, json.JSONDecodeError, MigrationError) as exc:
        report.preflight_errors.append(str(exc))
        report.import_ready = False
        print(f"MIGRATION REFUSED: {exc}", file=sys.stderr)
        if not args.check_only:
            write_outputs(args.output_dir, None, report)
        return 2

    if not args.check_only:
        write_outputs(args.output_dir, workflow, report)
    print(f"OFFLINE AUDIT REFERENCE: {len(report.changes)} deterministic change(s)")
    for change in report.changes:
        print(f"CHANGED: {change}")
    for unresolved in report.unresolved:
        print(f"UNRESOLVED: {unresolved}")
    if not report.import_ready:
        print("DO_NOT_IMPORT=true: JSON is an offline audit reference only; copy and edit the online workflow in FastGPT UI")
        return 3
    return 3


if __name__ == "__main__":
    raise SystemExit(main())
