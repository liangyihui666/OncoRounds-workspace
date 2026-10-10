#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..", "..");
const WORKFLOW = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(
      ROOT,
      "outputs",
      "快速稳定五题-v1.2",
      "题目生成-v1.2-Qwen显式双轮-可导入.json"
    );
const IDS = ["Q1", "Q2", "Q3", "Q4", "Q5"];
const FULL_FIELDS = [
  "type",
  "phase",
  "timepoint",
  "question",
  "options",
  "answer",
  "answer_text",
  "explain",
  "keyPoint",
  "evidence_id",
  "support_mode",
  "evidence_summary"
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadMain(workflow, nodeName) {
  const matches = workflow.nodes.filter((node) => node.name === nodeName);
  assert(matches.length === 1, `${nodeName}: expected exactly one node`);
  const codeInputs = matches[0].inputs.filter((item) => item.key === "code");
  assert(codeInputs.length === 1 && typeof codeInputs[0].value === "string", `${nodeName}: code missing`);
  return vm.runInNewContext(`${codeInputs[0].value}\n;main`, {});
}

function nodeInput(workflow, nodeName, key) {
  const node = workflow.nodes.find((item) => item.name === nodeName);
  assert(node, `${nodeName}: node missing`);
  const matches = node.inputs.filter((item) => item.key === key);
  assert(matches.length === 1, `${nodeName}.${key}: expected exactly one input`);
  return matches[0];
}

function successInternal() {
  return JSON.stringify({
    schema_version: "1.1",
    generation_status: "success",
    case_summary: "测试病例",
    question_count: 5,
    difficulty: "进阶",
    questions: IDS.map((id) => ({ id })),
    missing_information: [],
    risk_message: ""
  });
}

function insufficientInternal() {
  return JSON.stringify({
    schema_version: "1.1",
    generation_status: "insufficient",
    case_summary: "测试病例",
    question_count: 0,
    difficulty: "进阶",
    questions: [],
    missing_information: ["缺少符合人群与阶段的硬证据"],
    risk_message: "不安全生成固定五题"
  });
}

function publicSuccess() {
  return JSON.stringify({
    schema_version: "1.1",
    generation_status: "success",
    case_summary: "测试病例",
    question_count: 5,
    difficulty: "进阶",
    questions: IDS.map((id) => ({ id })),
    missing_information: [],
    risk_message: ""
  });
}

function passReview(overrides = {}) {
  return {
    decision: "PASS",
    score: 88,
    recommended_revision_mode: "",
    fatal_errors: [],
    general_feedback: "独立审核通过",
    question_checks: IDS.map((id) => ({ id, passed: true, problems: [], revision: "" })),
    repair_tasks: [],
    revision_instruction: "",
    missing_information: [],
    ...overrides
  };
}

function reviewInputs(review, overrides = {}) {
  return {
    structure_decision: "PASS",
    structure_errors: [],
    structure_warnings: [],
    medical_auditable: true,
    mechanical_revision_mode: "",
    mechanical_repair_tasks: [],
    candidate_internal_json: successInternal(),
    candidate_public_json: publicSuccess(),
    review_text: JSON.stringify(review),
    patch_merge_decision: "PASS",
    patch_merge_errors: [],
    ...overrides
  };
}

const workflow = JSON.parse(fs.readFileSync(WORKFLOW, "utf8"));
const researchExtractor = loadMain(workflow, "研究线索提取");
const registry = loadMain(workflow, "证据注册与压缩-初检");
const assembleR1 = loadMain(workflow, "候选题装配与硬检-首轮");
const mergeR1 = loadMain(workflow, "审核结果合并-首轮");
const mergeR2 = loadMain(workflow, "审核结果合并-第二轮");
const patchMerge = loadMain(workflow, "修订补丁合并");
const normalize = loadMain(workflow, "最终发布状态归一");
const matrix = {};

const datasetQuoteQShape = researchExtractor({
  quotes: [{
    sourceName: "20260204_162809.txt",
    q: "正式资料正文提及PROFILE 1014研究和PROFILE 1029研究的入组人群、方案及结果。"
  }],
  original_query: "ALK阳性NSCLC临床研究",
  initial_studies: [],
  guideline_a: [],
  guideline_b: []
});
assert(datasetQuoteQShape.has_leads === true, "datasetQuote.q中的研究线索被sourceName遮蔽");
assert(
  datasetQuoteQShape.expanded_query.includes("PROFILE 1014") &&
    datasetQuoteQShape.expanded_query.includes("PROFILE 1029"),
  "英文研究简称加数字后缀未进入expanded_query"
);
const primaryArticleIdentityOnly = researchExtractor({
  quotes: [
    {
      sourceName: "20250527_148961.txt",
      q: "# ID:[148961]\\标题:[2025 ASCO | ALNEO研究达到主要终点]\\创建时间:[2025-05-26]\\n## 正文\\n作者来自ITALY研究背景部分提及其他资料。注册号2020-003432-25。"
    },
    {
      sourceName: "20250925_155802.txt",
      q: "# ID:[155802]\\标题:[2025 WCLC | NAUTIKA1研究结果解读]\\创建时间:[2025-09-25]\\n## 正文\\n后文仅把NEOADAURA研究作为跨靶点比较。"
    }
  ],
  original_query: "ALK阳性NSCLC临床研究",
  initial_studies: [],
  guideline_a: [],
  guideline_b: []
});
assert(primaryArticleIdentityOnly.has_leads === true, "文章标题中的主研究线索未识别");
assert(
  primaryArticleIdentityOnly.expanded_terms.includes("ALNEO") &&
    primaryArticleIdentityOnly.expanded_terms.includes("NAUTIKA1") &&
    primaryArticleIdentityOnly.expanded_terms.includes("2020-003432-25"),
  "主研究简称或注册号未完整保留"
);
assert(
  !primaryArticleIdentityOnly.expanded_terms.includes("ITALY") &&
    !primaryArticleIdentityOnly.expanded_terms.includes("NEOADAURA"),
  "正文中的国家名或对照研究被误识别为主研究线索"
);
const genericTitleOpeningStudy = researchExtractor({
  quotes: [{
    sourceName: "20231223_123730.txt",
    q: "# ID:[123730]\\标题:[张晓凯教授：双‘A’齐丰收，2023年非小细胞肺癌围术期靶向治疗重磅研究回顾]\\创建时间:[2023-12-22]\\n## 正文\\nALK-TKI：ALINA研究是一项国际多中心、开放标签、III期随机对照临床研究，已报告DFS结果。"
  }],
  original_query: "ALK阳性NSCLC围术期研究",
  initial_studies: [],
  guideline_a: [],
  guideline_b: []
});
assert(
  genericTitleOpeningStudy.has_leads === true &&
    genericTitleOpeningStudy.expanded_terms.includes("ALINA"),
  "通用文章标题下正文开头的主研究未被识别"
);
const titleDataIdentityBeatsBodyTypo = researchExtractor({
  quotes: [{
    sourceName: "20251029_157336.txt",
    q: "# ID:[157336]\\标题:[【肺长TALK】赵成岭教授：从CROWN中国数据到长生存策略]\\创建时间:[2025-10-29]\\n## 摘要\\n正文误写为CRWON研究报告了结果。"
  }],
  original_query: "ALK阳性NSCLC临床研究",
  initial_studies: [],
  guideline_a: [],
  guideline_b: []
});
assert(
  titleDataIdentityBeatsBodyTypo.expanded_terms.includes("CROWN") &&
    !titleDataIdentityBeatsBodyTypo.expanded_terms.includes("CRWON"),
  "标题中的研究数据身份未能覆盖正文错别字"
);
const biomarkerNotStudyName = researchExtractor({
  quotes: [{
    sourceName: "20260829_179925.txt",
    q: "# ID:[179925]\\标题:[围术期ctDNA研究进展]\\创建时间:[2026-08-29]\\n## 正文\\n注册号NCT04302025。"
  }],
  original_query: "ALK阳性NSCLC围术期研究",
  initial_studies: [],
  guideline_a: [],
  guideline_b: []
});
assert(
  !biomarkerNotStudyName.expanded_terms.includes("CTDNA") &&
    biomarkerNotStudyName.expanded_terms.includes("NCT04302025"),
  "生物标志物缩写被误作研究名称，或有效注册号被误删"
);
const parentheticalStudyIdentity = researchExtractor({
  quotes: [{
    sourceName: "20260523_167985.txt",
    q: "# ID:[167985]\\标题:[2026 ASCO 中国之声｜洛拉替尼新辅助治疗III期ALK融合阳性NSCLC的II期研究（LORIN）]\\创建时间:[2026-05-23]\\n## 正文\\n已报告客观缓解率、R0切除率、pCR和MPR结果。"
  }],
  original_query: "ALK阳性NSCLC围手术期研究",
  initial_studies: [],
  guideline_a: [],
  guideline_b: []
});
assert(
  parentheticalStudyIdentity.has_leads === true &&
    parentheticalStudyIdentity.expanded_terms.includes("LORIN"),
  "研究简称置于括号内时未被识别"
);
const noDatasetLead = researchExtractor({
  quotes: [{ sourceName: "20260204_no_lead.txt", q: "仅为一般治疗背景，无研究简称或注册号。" }],
  original_query: "测试检索",
  initial_studies: [],
  guideline_a: [],
  guideline_b: []
});
assert(
  noDatasetLead.has_leads === false && noDatasetLead.expanded_query === "",
  "无研究线索时未安全跳过补检"
);
matrix.dataset_quote_q_lead_extraction = "PASS";

for (const [nodeName, key] of [
  ["候选题装配与硬检-首轮", "candidate_json"],
  ["修订补丁合并", "previous_internal_json"],
  ["修订补丁合并", "patch_json"],
  ["候选题装配与硬检-第二轮", "candidate_json"]
]) {
  assert(nodeInput(workflow, nodeName, key).required === false, `${nodeName}.${key} is not optional`);
}
matrix.blank_output_fail_closed_transport = "PASS";

const duplicateRootQuestions = successInternal().replace(
  "{",
  `{"questions":[{"id":"Q1"},{"id":"Q2","question":"UNREPAIRED_MEDICAL_Q2"},{"id":"Q3"},{"id":"Q4"},{"id":"Q5"}],`
);
const duplicateAssembly = assembleR1({
  candidate_json: duplicateRootQuestions,
  evidence_pool: { records: [] }
});
assert(
  duplicateAssembly.structure_decision === "FAIL" &&
    duplicateAssembly.structure_errors.some((item) => item.includes("重复键") && item.includes("questions")),
  "duplicate root questions escaped deterministic assembly"
);
const duplicatePatch = patchMerge({
  previous_internal_json: duplicateRootQuestions,
  repair_packet: {
    revision_mode: "PATCH",
    repair_tasks: [
      {
        target_ids: ["Q2"],
        code: "WRONG_ANSWER",
        fields: ["question"],
        message: "修复Q2"
      }
    ],
    preserve_ids: ["Q1", "Q3", "Q4", "Q5"]
  },
  patch_json: {
    revision_mode: "PATCH",
    replacements: [{ id: "Q2", question: "REPAIRED_Q2" }],
    generation_status: "success",
    missing_information: [],
    risk_message: ""
  }
});
assert(
  duplicatePatch.merge_decision === "FAIL" && duplicatePatch.merged_internal_json === "",
  "duplicate root questions escaped PATCH merge"
);
matrix.duplicate_root_key_fail_closed = "PASS";

const unhealthyPool = registry({
  guideline_a: [],
  guideline_b: [],
  clinical_study_initial: [],
  clinical_study_supplement: [],
  irae_a: [],
  irae_b: [],
  guideline_a_error: "",
  guideline_a_system_error: "upstream timeout",
  guideline_b_error: "",
  clinical_study_initial_error: "",
  clinical_study_supplement_error: "",
  irae_a_error: "",
  irae_b_error: "",
  knowledge_search_error: ""
});
assert(unhealthyPool.retrieval_health_ok === false, "retrieval error was not registered");
assert(unhealthyPool.needs_clinical_supplement === false, "technical failure triggered research supplement");
assert(unhealthyPool.supplement_decision === "BLOCKED_TECHNICAL", "technical failure was mislabeled");
const unhealthyAssembly = assembleR1({
  candidate_json: insufficientInternal(),
  evidence_pool: unhealthyPool.evidence_pool
});
assert(unhealthyAssembly.structure_decision === "FAIL", "unhealthy pool did not fail mechanical review");
assert(
  unhealthyAssembly.repair_tasks.some((task) => task.code === "RETRIEVAL_FAILURE"),
  "unhealthy pool lacks RETRIEVAL_FAILURE report"
);
matrix.retrieval_health_fail_closed = "PASS";

const esmoResultsHeadingStudy = registry({
  guideline_a: [],
  guideline_b: [],
  clinical_study_initial: [],
  clinical_study_supplement: [{
    databaseCode: "DEFAULT",
    docId: "alina-esmo-2023",
    splitIndex: 1,
    title: "LBA2 - ALINA: Efficacy and safety of adjuvant alectinib versus chemotherapy in patients with early-stage ALK+ NSCLC",
    dataSourceName: "ESMO",
    year: "2023",
    type: "meeting",
    snippet: "Background\nALINA (NCT03456076) is a global, phase III, open-label, randomised trial in adults with completely resected stage IB-IIIA ALK+ NSCLC.\nMethods\nPatients were randomised 1:1 to alectinib 600 mg twice daily for up to 24 months or platinum-based chemotherapy. The primary endpoint was investigator-assessed DFS.\nResults\nA total of 257 patients were randomised. A significant DFS benefit was observed with alectinib versus chemotherapy (HR 0.24; 95% CI 0.13-0.43; p<0.0001).\nConclusions\nAdjuvant alectinib significantly improved DFS."
  }],
  irae_a: [],
  irae_b: [],
  guideline_a_error: "",
  guideline_b_error: "",
  clinical_study_initial_error: "",
  clinical_study_supplement_error: "",
  irae_a_error: "",
  irae_b_error: "",
  knowledge_search_error: ""
});
assert(
  esmoResultsHeadingStudy.identifiable_supplement_study_count === 1,
  "独立Results换行标题下的正式会议研究摘要被误删"
);
assert(
  esmoResultsHeadingStudy.evidence_pool.records.some(
    (record) => record.doc_id === "alina-esmo-2023" && record.hard_evidence_type === "临床研究"
  ),
  "ALINA正式会议摘要未进入临床研究硬证据池"
);
matrix.esmo_results_heading_study = "PASS";

const validPass = mergeR1(reviewInputs(passReview()));
assert(validPass.decision === "PASS" && validPass.publishable === true, "valid R1 PASS rejected");
matrix.r1_consistent_pass = "PASS";

const inconsistentVariants = {
  fatal_errors: { fatal_errors: ["存在硬错误"] },
  repair_tasks: {
    repair_tasks: [
      { target_ids: ["Q1"], code: "WRONG_ANSWER", fields: ["answer"], message: "修正答案" }
    ]
  },
  missing_information: { missing_information: ["证据缺口"] },
  revision_mode: { recommended_revision_mode: "FULL" },
  question_checks: {
    question_checks: IDS.slice(0, 4).map((id) => ({ id, passed: true, problems: [], revision: "" }))
  },
  missing_problems_array: {
    question_checks: IDS.map((id) => ({ id, passed: true, revision: "" }))
  },
  nonempty_revision: {
    question_checks: IDS.map((id) => ({
      id,
      passed: true,
      problems: [],
      revision: id === "Q3" ? "尚需修订" : ""
    }))
  },
  revision_mode_wrong_type: { recommended_revision_mode: [] },
  revision_instruction_wrong_type: { revision_instruction: [] },
  question_id_wrong_type: {
    question_checks: IDS.map((id) => ({
      id: id === "Q1" ? ["Q1"] : id,
      passed: true,
      problems: [],
      revision: ""
    }))
  },
  question_revision_wrong_type: {
    question_checks: IDS.map((id) => ({ id, passed: true, problems: [], revision: [] }))
  }
};
for (const [label, override] of Object.entries(inconsistentVariants)) {
  const result = mergeR1(reviewInputs(passReview(override)));
  assert(result.decision === "REVISE" && result.publishable === false, `inconsistent PASS escaped: ${label}`);
  assert(
    result.repair_tasks.every((task) => Array.isArray(task.fields) && task.fields.length > 0),
    `empty repair fields after inconsistent PASS: ${label}`
  );
}
matrix.pass_internal_consistency_guard = "PASS";

const fractionalPass = mergeR1(reviewInputs(passReview({ score: 74.6 })));
assert(
  fractionalPass.decision === "REVISE" &&
    fractionalPass.score === 0 &&
    fractionalPass.publishable === false &&
    fractionalPass.repair_tasks.some((task) => task.code === "VALIDATOR_SCORE_INVALID"),
  "fractional validator score was rounded into publication"
);
const fractionalFinal = normalize({
  r1_decision: "PASS",
  r1_score: 74.6,
  r1_publishable: true,
  r1_candidate: publicSuccess(),
  r1_feedback: "{}",
  r1_missing: "[]"
});
assert(
  fractionalFinal.status === "REVISE_EXHAUSTED" && fractionalFinal.validation_score === 0,
  "final normalizer rounded fractional score into publication"
);
matrix.integer_score_fail_closed = "PASS";

const stringScore = mergeR1(reviewInputs(passReview({ score: "88" })));
assert(
  stringScore.decision === "REVISE" &&
    stringScore.score === 0 &&
    stringScore.repair_tasks.some((task) => task.code === "VALIDATOR_SCORE_INVALID"),
  "string score escaped JSON-number guard"
);
const decisionArray = mergeR1(reviewInputs(passReview({ decision: ["PASS"] })));
assert(decisionArray.decision === "REVISE" && decisionArray.publishable === false, "decision array published");
const normalizedCode = mergeR1(
  reviewInputs({
    ...passReview(),
    decision: "REVISE",
    score: 60,
    recommended_revision_mode: "PATCH",
    question_checks: IDS.map((id) => ({
      id,
      passed: id !== "Q2",
      problems: id === "Q2" ? ["人群错配"] : [],
      revision: id === "Q2" ? "修订" : ""
    })),
    repair_tasks: [
      { target_ids: ["Q2"], code: "人群错配", fields: ["question"], message: "修正人群" }
    ],
    revision_instruction: "修正Q2"
  })
);
assert(
  normalizedCode.repair_tasks.some((task) => task.code === "MEDICAL_ERROR") &&
    normalizedCode.repair_tasks.every((task) => /^[A-Z][A-Z0-9_]*$/.test(task.code)),
  "repair task code was not normalized to merger-safe uppercase ASCII"
);
const metadataRemovalTask = mergeR1(
  reviewInputs({
    ...passReview(),
    decision: "REVISE",
    score: 60,
    recommended_revision_mode: "PATCH",
    repair_tasks: [
      {
        target_ids: ["Q2"],
        code: "MODEL_SUPPLIED_EVIDENCE_METADATA",
        fields: ["guidelineRef"],
        message: "删除模型手写的来源元数据"
      }
    ],
    revision_instruction: "只删除Q2的非授权来源元数据"
  })
);
assert(
  metadataRemovalTask.repair_tasks.some(
    (task) => task.code === "MODEL_SUPPLIED_EVIDENCE_METADATA" && task.fields.includes("guidelineRef")
  ),
  "review merge lost deterministic metadata-removal field"
);
matrix.strict_json_types_and_code_normalization = "PASS";

const noDraft = mergeR1(
  reviewInputs({}, {
    structure_decision: "FAIL",
    medical_auditable: false,
    candidate_internal_json: "not-json",
    review_text: ""
  })
);
assert(noDraft.decision === "REVISE" && noDraft.revision_mode === "FULL", "no-draft path is not FULL");
assert(noDraft.repair_tasks.length > 0, "no-draft path lacks repair task");
assert(noDraft.preserve_ids.length === 0, "invalid prior draft invented preserve_ids");
assert(
  noDraft.repair_tasks.every(
    (task) =>
      JSON.stringify(task.fields) === JSON.stringify(FULL_FIELDS) &&
      JSON.stringify(task.target_ids) === JSON.stringify(IDS)
  ),
  "fallback FULL task does not authorize complete internal question fields"
);
matrix.fallback_full_fields = "PASS";

function completeQuestion(id, index) {
  return {
    id,
    type: "治疗决策",
    phase: `阶段${index + 1}`,
    timepoint: `T${index + 1}`,
    question: `测试问题${index + 1}`,
    options: [`答案${index + 1}`, `干扰A${index + 1}`, `干扰B${index + 1}`, `干扰C${index + 1}`],
    answer: 0,
    answer_text: `答案${index + 1}`,
    explain: `解析${index + 1}`,
    keyPoint: `要点${index + 1}`,
    evidence_id: index < 2 ? `GA0${index + 1}` : `GB0${index}`,
    support_mode: index < 2 ? "hard" : "clinical_reasoning",
    evidence_summary: `证据摘要${index + 1}`
  };
}
const recoveredPatch = patchMerge({
  previous_internal_json: "",
  repair_packet: noDraft.repair_packet_json,
  patch_json: JSON.stringify({
    revision_mode: "FULL",
    generation_status: "success",
    case_summary: "从原始病例包重建的忠实摘要",
    replacements: IDS.map(completeQuestion),
    missing_information: [],
    risk_message: ""
  })
});
assert(recoveredPatch.merge_decision === "PASS", `empty-draft FULL recovery failed: ${recoveredPatch.merge_errors}`);
const recoveredCandidate = JSON.parse(recoveredPatch.merged_internal_json);
assert(
  recoveredCandidate.generation_status === "success" && recoveredCandidate.questions.length === 5,
  "empty-draft FULL recovery did not produce five questions"
);
matrix.empty_r1_full_r2_recovery = "PASS";

const rootOnly = mergeR1(
  reviewInputs(
    {
      decision: "REVISE",
      score: 60,
      recommended_revision_mode: "FULL",
      fatal_errors: ["摘要超长"],
      general_feedback: "仅修复根字段",
      question_checks: IDS.map((id) => ({ id, passed: true, problems: [], revision: "" })),
      repair_tasks: [],
      revision_instruction: "修复摘要",
      missing_information: []
    },
    {
      structure_decision: "FAIL",
      mechanical_revision_mode: "FULL",
      mechanical_repair_tasks: [
        { target_ids: [], code: "CASE_SUMMARY_LENGTH", fields: ["case_summary"], message: "压缩摘要" }
      ]
    }
  )
);
assert(JSON.stringify(rootOnly.preserve_ids) === JSON.stringify(IDS), "root-only FULL did not preserve all questions");
assert(rootOnly.repair_tasks[0].target_ids.length === 0, "root-only task gained question authorization");
matrix.root_only_preservation = "PASS";

const validStopReview = {
  decision: "STOP_INSUFFICIENT",
  score: 0,
  recommended_revision_mode: "",
  fatal_errors: [],
  general_feedback: "完整池仍不足",
  question_checks: [],
  repair_tasks: [],
  revision_instruction: "",
  missing_information: ["缺少符合人群与阶段的硬证据"]
};
const r2Stop = mergeR2(
  reviewInputs(validStopReview, {
    structure_decision: "INSUFFICIENT",
    candidate_internal_json: insufficientInternal(),
    candidate_public_json: insufficientInternal(),
    patch_merge_decision: "INSUFFICIENT",
    patch_merge_errors: []
  })
);
assert(r2Stop.decision === "STOP_INSUFFICIENT", "R2 insufficient patch did not remain STOP");
matrix.r2_insufficient_independent_stop = "PASS";

const r1Stop = mergeR1(
  reviewInputs(validStopReview, {
    structure_decision: "INSUFFICIENT",
    candidate_internal_json: insufficientInternal(),
    candidate_public_json: insufficientInternal()
  })
);
assert(r1Stop.decision === "STOP_INSUFFICIENT", "R1 independently confirmed insufficiency did not STOP");
const normalizedR1Stop = normalize({
  r1_decision: r1Stop.decision,
  r1_score: r1Stop.score,
  r1_publishable: r1Stop.publishable,
  r1_candidate: insufficientInternal(),
  r1_feedback: r1Stop.feedback_json,
  r1_missing: r1Stop.missing_information
});
assert(normalizedR1Stop.status === "STOP_INSUFFICIENT", "R1 STOP was not preserved");
matrix.r1_independent_stop_preserved = "PASS";

const r2Pass = mergeR2(reviewInputs(passReview()));
assert(r2Pass.decision === "PASS" && r2Pass.publishable === true, "valid R2 PASS rejected");
const normalizedR2Pass = normalize({
  r1_decision: "REVISE",
  r1_score: 60,
  r1_publishable: false,
  r1_candidate: publicSuccess(),
  r1_feedback: "{}",
  r1_missing: "[]",
  r2_decision: r2Pass.decision,
  r2_score: r2Pass.score,
  r2_publishable: r2Pass.publishable,
  r2_candidate: publicSuccess(),
  r2_feedback: r2Pass.feedback_json,
  r2_missing: r2Pass.missing_information
});
assert(normalizedR2Pass.status === "PASS", "valid R2 independent PASS was not published");
matrix.r2_consistent_pass = "PASS";

const invalidStop = mergeR2(
  reviewInputs(validStopReview, {
    structure_decision: "FAIL",
    structure_errors: ["EVIDENCE_POOL_INVALID"],
    candidate_internal_json: insufficientInternal(),
    candidate_public_json: insufficientInternal(),
    patch_merge_decision: "INSUFFICIENT",
    patch_merge_errors: []
  })
);
assert(invalidStop.decision === "REVISE", "technical/structure failure escaped as STOP_INSUFFICIENT");
const malformedStop = mergeR2(
  reviewInputs({ ...validStopReview, missing_information: "缺少证据" }, {
    structure_decision: "INSUFFICIENT",
    candidate_internal_json: insufficientInternal(),
    candidate_public_json: insufficientInternal(),
    patch_merge_decision: "INSUFFICIENT",
    patch_merge_errors: []
  })
);
assert(malformedStop.decision === "REVISE", "malformed STOP contract escaped independent gate");
matrix.stop_requires_valid_pool_and_exact_contract = "PASS";

const deniedR1 = normalize({
  r1_decision: "PASS",
  r1_score: 88,
  r1_publishable: false,
  r1_candidate: publicSuccess(),
  r1_feedback: "{}",
  r1_missing: "[]"
});
assert(deniedR1.status === "REVISE_EXHAUSTED", "R1 PASS ignored false independent publishable gate");
const allowedR1 = normalize({
  r1_decision: "PASS",
  r1_score: 88,
  r1_publishable: true,
  r1_candidate: publicSuccess(),
  r1_feedback: "{}",
  r1_missing: "[]"
});
assert(allowedR1.status === "PASS", "valid R1 independent PASS rejected");
assert(allowedR1.missing_information === "[]", "PASS leaked fallback missing_information");
matrix.r1_publishable_gate_and_clean_pass = "PASS";

const deniedR2 = normalize({
  r1_decision: "REVISE",
  r1_score: 60,
  r1_publishable: false,
  r1_candidate: "",
  r1_feedback: "{}",
  r1_missing: "[]",
  r2_decision: "PASS",
  r2_score: 88,
  r2_publishable: false,
  r2_candidate: publicSuccess(),
  r2_feedback: "{}",
  r2_missing: "[]"
});
assert(deniedR2.status === "REVISE_EXHAUSTED", "R2 PASS ignored false independent publishable gate");
matrix.r2_publishable_gate = "PASS";

const invalidR2Decision = normalize({
  r1_decision: "PASS",
  r1_score: 88,
  r1_publishable: true,
  r1_candidate: publicSuccess(),
  r1_feedback: "{}",
  r1_missing: "[]",
  r2_decision: ["PASS"],
  r2_score: 88,
  r2_publishable: true,
  r2_candidate: publicSuccess(),
  r2_feedback: "{}",
  r2_missing: "[]"
});
assert(invalidR2Decision.status === "REVISE_EXHAUSTED", "invalid R2 decision fell back to R1 PASS");
const summaryFallback = normalize({
  r1_decision: "REVISE",
  r1_score: 60,
  r1_publishable: false,
  r1_candidate: publicSuccess(),
  r1_feedback: "{}",
  r1_missing: "[]",
  r2_decision: "REVISE",
  r2_score: 60,
  r2_publishable: false,
  r2_candidate: "",
  r2_feedback: "{}",
  r2_missing: "[]"
});
assert(
  JSON.parse(summaryFallback.final_response_json).case_summary === "测试病例",
  "failure response did not preserve safe R1 case_summary"
);
matrix.invalid_r2_fail_closed_and_summary_fallback = "PASS";

const normalizedStop = normalize({
  r1_decision: "REVISE",
  r1_score: 60,
  r1_publishable: false,
  r1_candidate: "",
  r1_feedback: "{}",
  r1_missing: "[]",
  r2_decision: r2Stop.decision,
  r2_score: r2Stop.score,
  r2_publishable: r2Stop.publishable,
  r2_candidate: insufficientInternal(),
  r2_feedback: r2Stop.feedback_json,
  r2_missing: r2Stop.missing_information
});
assert(normalizedStop.status === "STOP_INSUFFICIENT", "R2 STOP normalized to exhausted");
matrix.final_r2_stop_preserved = "PASS";

console.log(JSON.stringify({ status: "PASS", matrix }, null, 2));
