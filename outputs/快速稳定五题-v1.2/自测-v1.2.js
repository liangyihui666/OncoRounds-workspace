const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadMain(fileName) {
  const code = fs.readFileSync(path.join(__dirname, fileName), "utf8");
  const context = {};
  vm.createContext(context);
  vm.runInContext(code, context, { filename: fileName });
  assert.equal(typeof context.main, "function", `${fileName}未暴露main`);
  return context.main;
}

function guideline(docId, splitIndex, formalTitle, chunkTitle, content) {
  return {
    score: 0.95,
    metadata: {
      docId,
      splitIndex,
      type: "guideline",
      authority: "测试医学会",
      dataSourceName: formalTitle,
      title: chunkTitle,
      version: "2026",
      url: "https://example.test/guideline"
    },
    content
  };
}

function clinicalStudy() {
  return {
    metadata: {
      docId: "STUDY-1",
      splitIndex: 3,
      type: "journal",
      authority: "测试期刊",
      dataSourceName: "NCT12345678 phase III randomized trial",
      title: "主要研究结果",
      version: "2026",
      url: "https://example.test/study"
    },
    content:
      "NCT12345678为III期随机对照研究，入组患者接受方案甲 versus 方案乙，以PFS为主要终点。Results: enrolled 120 patients; median PFS was 18.0 versus 9.0 months, HR=0.50。"
  };
}

function eligibleSecondaryReview() {
  return {
    metadata: {
      docId: "REVIEW-1",
      splitIndex: 9,
      type: "systematic_review",
      authority: "测试学会循证中心",
      dataSourceName: "治疗策略系统综述",
      title: "动态决策原则",
      version: "2026"
    },
    content: "系统综述总结了多因素动态管理所需的核心原则。"
  };
}

function clinicalLungCancerStudy() {
  return {
    docId: "ALNEO-REAL-SHAPE",
    splitIndex: 6,
    type: "journal",
    authority: null,
    dataSourceName: "Clinical Lung Cancer",
    title: "ALNEO研究结果分块",
    metaData: {
      journal_name: "Clinical Lung Cancer",
      title: "ALNEO: A Phase II Study of Alectinib in RET-Rearranged NSCLC",
      year: "2025"
    },
    snippet:
      "ALNEO为II期单臂研究，入组RET重排非小细胞肺癌患者接受alectinib，以ORR为主要终点。Results: enrolled 50 patients; ORR was 70%。"
  };
}

function makeQuestion(index, evidenceId, supportMode) {
  return {
    id: `Q${index}`,
    type: [
      "诊断与分期",
      "治疗决策",
      "疗效复评与局部治疗",
      "耐药与后线管理",
      "不良反应管理"
    ][index - 1],
    phase: `阶段${index}`,
    timepoint: `时间点${index}`,
    question: `综合病例中的三个决策因素，第${index}个时间点最合理的处理是什么？`,
    options: [
      `正确处理${index}`,
      `条件不符的处理甲${index}`,
      `条件不符的处理乙${index}`,
      `条件不符的处理丙${index}`
    ],
    answer: 0,
    answer_text: `正确处理${index}`,
    explain: `当前病例条件与绑定证据共同支持处理${index}，并需保留适用边界。`,
    keyPoint: `在时间点${index}整合风险、分期与治疗目的。`,
    evidence_id: evidenceId,
    support_mode: supportMode,
    evidence_summary: `绑定记录直接支持第${index}题的核心处理原则。`
  };
}

function makeCandidate() {
  return {
    schema_version: "1.1",
    generation_status: "success",
    case_summary: "这是脱敏病例摘要，保留所有不确定性。",
    question_count: 5,
    difficulty: "进阶",
    questions: [
      makeQuestion(1, "GA01", "clinical_reasoning"),
      makeQuestion(2, "CS01", "hard"),
      makeQuestion(3, "GB01", "hard"),
      makeQuestion(4, "IR01", "clinical_reasoning"),
      makeQuestion(5, "GA02", "hard")
    ],
    missing_information: [],
    risk_message: ""
  };
}

function makePrettyRaw(candidate) {
  const questionText = candidate.questions
    .map((question) => JSON.stringify(question, null, 4))
    .join(",\n        ");
  return [
    "{",
    '  "schema_version": "1.1",',
    '  "generation_status": "success",',
    `  "case_summary": ${JSON.stringify(candidate.case_summary)},`,
    '  "question_count": 5,',
    '  "difficulty": "进阶",',
    '  "questions": [',
    `        ${questionText}`,
    "  ],",
    '  "missing_information": [],',
    '  "risk_message": ""',
    "}"
  ].join("\n");
}

function exactTask(targetIds, code, fields, message) {
  return { target_ids: targetIds, code, fields, message };
}

const registerEvidence = loadMain("证据注册与压缩-v1.2.js");
const assemble = loadMain("候选题装配与硬检.js");
const mergePatch = loadMain("修订补丁合并与复检.js");
const dedupeCase = loadMain("病例输入精确去重.js");

// 补检不得再由“初检没有临床研究”单独触发；容量只基于可机械确认的可引用证据。
const noStudyButEnough = registerEvidence({
  guideline_a: [
    guideline(" G-A ", 7, "正式指南A", "A章", "小活检需要进行病理鉴别诊断。"),
    guideline("G-B", 1, "正式指南B", "B章", "推荐进行ALK融合检测。")
  ],
  guideline_b: [
    guideline("G-C", 2, "正式指南C", "C章", "符合人群应选择一线系统治疗。"),
    guideline("G-D", 3, "正式指南D", "D章", "经MDT评估可切除性和R0切除机会。"),
    guideline("G-E", 4, "正式指南E", "E章", "寡进展时评估局部治疗与后线管理。")
  ],
  clinical_study_initial: [],
  clinical_study_supplement: [],
  irae_a: [],
  irae_b: []
});
assert.equal(noStudyButEnough.identifiable_initial_study_count, 0);
assert.equal(noStudyButEnough.hard_candidate_count, 5);
assert.equal(noStudyButEnough.estimated_question_capacity, 5);
assert.equal(
  noStudyButEnough.supplement_decision,
  "SKIP",
  "无临床研究本身不得触发补检"
);
assert.equal(noStudyButEnough.evidence_pool.records[0].evidence_id, "GA01");

const technicalRetrievalFailure = registerEvidence({
  guideline_a: [],
  guideline_b: [],
  clinical_study_initial: [],
  clinical_study_supplement: [],
  irae_a: [],
  irae_b: [],
  guideline_a_error: "upstream timeout"
});
assert.equal(technicalRetrievalFailure.retrieval_health_ok, false);
assert.equal(technicalRetrievalFailure.retrieval_errors.length, 1);
assert.equal(technicalRetrievalFailure.evidence_pool.retrieval_health.ok, false);
assert.equal(technicalRetrievalFailure.needs_clinical_supplement, false);
assert.equal(technicalRetrievalFailure.supplement_decision, "BLOCKED_TECHNICAL");
assert.equal(noStudyButEnough.evidence_pool.records[1].evidence_id, "GA02");
assert.equal(noStudyButEnough.evidence_pool.records[2].evidence_id, "GB01");
assert.equal(
  noStudyButEnough.evidence_pool.records[0].doc_id,
  " G-A ",
  "doc_id必须逐值保留"
);
assert.equal(
  noStudyButEnough.evidence_pool.records[0].split_index,
  7,
  "split_index必须原样保留为来源中的非负整数"
);
assert.equal(noStudyButEnough.evidence_pool.records[0].source_title, "正式指南A");
assert.equal(
  noStudyButEnough.evidence_pool.records[0].source_section,
  "A章",
  "chunk title应进入source_section"
);

const reasoningCapacityCounts = registerEvidence({
  guideline_a: [
    guideline("CAP-G1", 0, "容量指南甲", "甲", "小活检需要进行病理鉴别诊断。"),
    guideline("CAP-G2", 1, "容量指南乙", "乙", "推荐进行ALK融合检测。")
  ],
  guideline_b: [eligibleSecondaryReview()],
  clinical_study_initial: [],
  clinical_study_supplement: [],
  irae_a: [],
  irae_b: []
});
assert.equal(reasoningCapacityCounts.hard_candidate_count, 2);
assert.equal(reasoningCapacityCounts.eligible_candidate_count, 3);
assert.equal(reasoningCapacityCounts.estimated_question_capacity, 3);
assert.equal(
  reasoningCapacityCounts.supplement_decision,
  "TRIGGER",
  "身份合格的二级资料可计入容量，但不得按locator复用规则虚增为两题"
);

const tooSmall = registerEvidence({
  guideline_a: [guideline("ONLY-1", 0, "唯一指南", "一章", "仅一条原则。")],
  guideline_b: [],
  clinical_study_initial: [],
  clinical_study_supplement: [],
  irae_a: [],
  irae_b: []
});
assert.equal(tooSmall.supplement_decision, "TRIGGER");
assert.equal(tooSmall.hard_candidate_count, 1);
assert.equal(tooSmall.estimated_question_capacity, 1);

const terseGuidelineTitle = registerEvidence({
  guideline_a: [
    {
      docId: "CACA-LUNG-1",
      splitIndex: 0,
      type: "guideline",
      authority: "CACA",
      dataSourceName: "肺癌",
      title: "系统治疗",
      snippet: "符合当前人群时应结合分期与治疗目的选择方案。"
    }
  ],
  guideline_b: [],
  clinical_study_initial: [],
  clinical_study_supplement: [],
  irae_a: [],
  irae_b: []
});
assert.equal(
  terseGuidelineTitle.hard_candidate_count,
  1,
  "type=guideline、authority与source_title非空即为机械硬候选，不得用标题关键词错杀"
);
assert.equal(
  terseGuidelineTitle.evidence_pool.records[0].hard_evidence_type,
  "指南"
);

const ineligibleDoesNotBlockLocator = registerEvidence({
  guideline_a: [
    {
      docId: "SHARED-LOCATOR",
      splitIndex: 11,
      type: "lyhdoc",
      authority: "媒体账号",
      dataSourceName: "医生病例分享新闻",
      title: "会议报道",
      snippet: "一篇病例分享宣称某处理有效。"
    },
    {
      docId: "SHARED-LOCATOR",
      splitIndex: 11,
      type: "guideline",
      authority: "CACA",
      dataSourceName: "肺癌",
      title: "正式管理原则",
      snippet: "符合当前人群时应结合分期与治疗目的进行管理。"
    }
  ],
  guideline_b: [],
  clinical_study_initial: [],
  clinical_study_supplement: [],
  irae_a: [],
  irae_b: []
});
assert.equal(ineligibleDoesNotBlockLocator.evidence_pool.records.length, 1);
assert.equal(
  ineligibleDoesNotBlockLocator.evidence_pool.records[0].evidence_id,
  "GA01",
  "不合格首条不得占稳定编号"
);
assert.equal(
  ineligibleDoesNotBlockLocator.evidence_pool.records[0].type,
  "guideline",
  "不合格首条不得阻塞同locator的后续合格来源"
);
assert.ok(
  ineligibleDoesNotBlockLocator.compression_report.dropped.some(
    (item) => item.reason === "INELIGIBLE_SOURCE"
  )
);
assert.equal(
  ineligibleDoesNotBlockLocator.evidence_pool.lanes.guideline_a.length,
  1,
  "媒体/病例分享不得进入模型可见lane"
);

const clinicalTitleMapping = registerEvidence({
  guideline_a: [],
  guideline_b: [],
  clinical_study_initial: [
    clinicalLungCancerStudy(),
    {
      docId: "CASE-REPORT-WITH-NCT",
      splitIndex: 7,
      type: "journal",
      authority: "Clinical Lung Cancer",
      dataSourceName: "Clinical Lung Cancer",
      title: "Case report with trial discussion",
      metaData: {
        title: "Case report: response after enrollment in NCT87654321"
      },
      snippet:
        "病例报告：患者参加NCT87654321。文中提到II期单臂研究入组患者接受方案甲，以ORR为主要终点，结果显示缓解率提高。"
    },
    {
      docId: "DESIGN-ONLY",
      splitIndex: 8,
      type: "journal",
      authority: null,
      dataSourceName: "Clinical Lung Cancer",
      title: "Phase II Study to Assess Alectinib: Trial Design",
      metaData: {
        journal_name: "Clinical Lung Cancer",
        title: "Phase II Study to Assess Alectinib: Rationale and Study Design"
      },
      snippet:
        "Background: prior studies showed favorable results. Patients will be enrolled and will receive alectinib; the primary endpoint is ORR."
    },
    {
      docId: "LONG-ABSTRACT-RESULTS",
      splitIndex: 9,
      type: "journal",
      authority: "Journal of Test Oncology",
      dataSourceName: "Journal of Test Oncology",
      title: "NCT23456789 phase III randomized trial",
      metaData: {
        title: "NCT23456789 phase III randomized trial of regimen A versus B"
      },
      snippet:
        "Background: " +
        "long methods context for the randomized cohort. ".repeat(35) +
        "Patients with advanced test cancer were randomized to receive regimen A versus regimen B; the primary endpoint was PFS. " +
        "Results: enrolled 240 patients; median PFS was 20.0 versus 10.0 months, HR=0.50. Conclusion: regimen A improved PFS in the enrolled population."
    },
    {
      docId: "PRIOR-RESULTS-PROTOCOL",
      splitIndex: 10,
      type: "journal",
      authority: "Journal of Test Oncology",
      dataSourceName: "Journal of Test Oncology",
      title: "ABC Trial Protocol",
      metaData: { title: "ABC Trial Protocol: phase III randomized study design" },
      snippet:
        "Results: the prior XYZ study reported median PFS 12.0 months. " +
        "ABC is a phase III randomized trial protocol that will enroll 500 patients who will receive regimen A versus B; the primary endpoint is PFS. " +
        "No ABC outcomes are available."
    },
    {
      docId: "CHINESE-RESULTS-NO-COLON",
      splitIndex: 11,
      type: "journal",
      authority: "测试肿瘤学期刊",
      dataSourceName: "测试肿瘤学期刊",
      title: "C-TRIAL随机研究",
      metaData: { title: "C-TRIAL III期随机研究" },
      snippet:
        "C-TRIAL为III期随机对照研究，纳入晚期患者接受方案甲 versus 方案乙，主要终点为PFS。" +
        "结果显示共纳入180例，ORR为60%，中位PFS为15个月。"
    },
    {
      docId: "PLANNED-PRIOR-RESULTS",
      splitIndex: 12,
      type: "journal",
      authority: "测试期刊",
      dataSourceName: "测试期刊",
      title: "ABC: a phase III randomized study",
      snippet:
        "Results: the previous XYZ trial enrolled 200 patients and median PFS was 12.0 months. " +
        "The ABC study is planned to enroll 500 patients receiving regimen A versus B; the primary endpoint is PFS."
    },
    {
      docId: "EXPECTED-PRIOR-RESULTS",
      splitIndex: 13,
      type: "journal",
      authority: "测试期刊",
      dataSourceName: "测试期刊",
      title: "ABC: a phase III randomized study",
      snippet:
        "Results: the prior XYZ trial included 200 patients; ORR was 60%. " +
        "ABC is expected to recruit 500 patients who are assigned to regimen A versus regimen B; the primary endpoint is PFS."
    },
    {
      docId: "AIMS-PRIOR-RESULTS",
      splitIndex: 14,
      type: "journal",
      authority: "测试期刊",
      dataSourceName: "测试期刊",
      title: "ABC: a phase III randomized study",
      snippet:
        "Results: the earlier XYZ study randomized 200 patients and reported HR=0.70. " +
        "Methods: ABC aims to recruit patients to receive regimen A versus B; the primary endpoint is PFS."
    }
  ],
  clinical_study_supplement: [],
  irae_a: [],
  irae_b: []
});
assert.equal(clinicalTitleMapping.evidence_pool.records.length, 3);
assert.equal(
  clinicalTitleMapping.evidence_pool.records[0].source_title,
  "ALNEO: A Phase II Study of Alectinib in RET-Rearranged NSCLC",
  "临床研究source_title应优先metaData.title而不是期刊dataSourceName"
);
assert.equal(
  clinicalTitleMapping.evidence_pool.records[0].source_section,
  "ALNEO研究结果分块",
  "record.title必须同时保留为source_section"
);
assert.equal(
  clinicalTitleMapping.evidence_pool.records[0].authority,
  "Clinical Lung Cancer",
  "临床研究authority缺失时应从journal_name/dataSourceName直接回填来源载体"
);
assert.equal(
  clinicalTitleMapping.evidence_pool.records[0].hard_evidence_type,
  "临床研究"
);
assert.ok(
  clinicalTitleMapping.compression_report.dropped.some(
    (item) =>
      item.index === 1 && item.reason === "INELIGIBLE_SOURCE"
  ),
  "含NCT字样的case report仍必须被隔离"
);
assert.ok(
  clinicalTitleMapping.compression_report.dropped.some(
    (item) => item.index === 2 && item.reason === "INELIGIBLE_SOURCE"
  ),
  "只有未来时入组方案且无本研究结果的protocol/design记录不得标为hard"
);
assert.equal(
  clinicalTitleMapping.evidence_pool.records[1].hard_evidence_type,
  "临床研究",
  "Results位于1000字后的长摘要仍应使用未截断全文完成身份判定"
);
assert.match(
  clinicalTitleMapping.evidence_pool.records[1].snippet,
  /Results:/,
  "长摘要压缩后必须保留可定位的本研究结果段"
);
assert.ok(
  clinicalTitleMapping.compression_report.dropped.some(
    (item) => item.index === 4 && item.reason === "INELIGIBLE_SOURCE"
  ),
  "protocol不得用Results标签下的既往研究定量结果冒充本研究结果"
);
assert.equal(
  clinicalTitleMapping.evidence_pool.records[2].hard_evidence_type,
  "临床研究",
  "中文结果标题无冒号但以“结果显示”开头时不应被误丢"
);
for (const index of [6, 7, 8]) {
  assert.ok(
    clinicalTitleMapping.compression_report.dropped.some(
      (item) => item.index === index && item.reason === "INELIGIBLE_SOURCE"
    ),
    `design-only变体${index}不得借用既往研究结果进入hard证据池`
  );
}

const englishTreatmentKeywordStudy = registerEvidence({
  guideline_a: [],
  guideline_b: [],
  clinical_study_initial: [],
  clinical_study_supplement: [
    {
      docId: "ALNEO-FINAL",
      splitIndex: 1,
      type: "meeting",
      authority: null,
      dataSourceName: "ASCO",
      title:
        "Alectinib as neoadjuvant treatment in potentially resectable stage III ALK-positive NSCLC: Final analysis of ALNEO phase II trial.",
      metaData: { meeting_name: "ASCO" },
      snippet:
        "Results: A total of 33 patients were registered and 28 underwent surgery. " +
        "R0 was achieved in 86%; MPR was 46% and pCR was 12%. " +
        "Conclusions: neoadjuvant alectinib was a feasible peri-operative option."
    }
  ],
  irae_a: [],
  irae_b: []
});
assert.equal(
  englishTreatmentKeywordStudy.identifiable_supplement_study_count,
  1,
  "英文摘要仅用treatment/therapy描述干预且以MPR/pCR为终点时仍应识别正式结果"
);
assert.equal(
  englishTreatmentKeywordStudy.evidence_pool.records[0].authority,
  "ASCO"
);

const stringSplitRejected = registerEvidence({
  guideline_a: [
    guideline("STRING-SPLIT", "7", "字符串定位指南", "定位", "不应静默改型。")
  ],
  guideline_b: [],
  clinical_study_initial: [],
  clinical_study_supplement: [],
  irae_a: [],
  irae_b: []
});
assert.equal(stringSplitRejected.evidence_pool.records.length, 0);
assert.ok(
  stringSplitRejected.compression_report.dropped.some(
    (item) => item.reason === "INVALID_SPLIT_INDEX"
  ),
  "数字字符串split_index必须拒绝而不是静默改型"
);

const registered = registerEvidence({
  guideline_a: [
    guideline("DOC-GA-1", 0, "正式指南甲", "初始治疗", "符合人群时推荐初始处理甲。重复句。重复句。"),
    guideline("DOC-GA-2", 1, "正式指南乙", "随访管理", "符合人群时推荐管理乙。")
  ],
  guideline_b: [
    guideline("DOC-GB-1", 2, "正式指南丙", "进展处理", "进展阶段应综合分期与治疗目的。")
  ],
  clinical_study_initial: [clinicalStudy()],
  clinical_study_supplement: [],
  irae_a: [
    guideline("DOC-IR-1", 4, "正式毒性指南", "鉴别与管理", "毒性与感染可能并存，应并行评估。")
  ],
  irae_b: []
});
assert.equal(registered.evidence_pool.records[3].evidence_id, "CS01");
assert.equal(registered.evidence_pool.records[4].evidence_id, "IR01");
assert.equal(registered.hard_candidate_count, 5);

const candidate = makeCandidate();
const candidateRaw = JSON.stringify(candidate);
const assembled = assemble({
  candidate_json: candidateRaw,
  evidence_pool: registered.evidence_pool
});
assert.equal(assembled.structure_decision, "PASS");
assert.equal(assembled.medical_auditable, true);
assert.equal(assembled.internal_candidate_json, candidateRaw);
assert.equal(assembled.hard_evidence_count, 3);
assert.equal(assembled.clinical_reasoning_count, 2);
assert.equal(JSON.parse(assembled.cited_evidence_json).length, 5);
assert.equal(JSON.parse(assembled.validator_evidence_json).length, 5);
assert.equal(JSON.parse(assembled.public_reference_map_json).length, 5);

const publicCandidate = JSON.parse(assembled.candidate_json_passthrough);
assert.equal(publicCandidate.schema_version, "1.1");
assert.equal(publicCandidate.questions[0].question, candidate.questions[0].question);
assert.equal(
  JSON.stringify(publicCandidate.questions[0].options),
  JSON.stringify(candidate.questions[0].options),
  "装配不得改写选项"
);
assert.equal(
  publicCandidate.questions[0].guidelineRef.evidence_type,
  "病例+临床推理"
);
assert.equal(publicCandidate.questions[1].guidelineRef.evidence_type, "临床研究");
assert.equal(publicCandidate.questions[2].guidelineRef.evidence_type, "指南");
assert.equal(publicCandidate.questions[2].guidelineRef.source_title, "正式指南丙");
assert.equal(
  Object.keys(publicCandidate.questions[0].guidelineRef).sort().join("|"),
  [
    "evidence_type",
    "doc_id",
    "split_index",
    "type",
    "authority",
    "source_title",
    "source_version",
    "source_section",
    "source_url",
    "evidence_summary"
  ]
    .sort()
    .join("|"),
  "guidelineRef必须恰好十字段"
);
assert.equal("evidence_id" in publicCandidate.questions[0], false);
assert.equal("support_mode" in publicCandidate.questions[0], false);
assert.deepEqual(
  JSON.parse(assembled.public_reference_map_json)[0],
  { id: "Q1", guidelineRef: publicCandidate.questions[0].guidelineRef },
  "医审只需接收紧凑公开证据映射，避免重复传输整套题干"
);

const retrievalFailurePool = JSON.parse(JSON.stringify(registered.evidence_pool));
retrievalFailurePool.retrieval_health = {
  ok: false,
  errors: [{ lane: "guideline_a", message: "upstream timeout" }]
};
const retrievalFailureResult = assemble({
  candidate_json: candidateRaw,
  evidence_pool: retrievalFailurePool
});
assert.equal(retrievalFailureResult.structure_decision, "FAIL");
assert.equal(retrievalFailureResult.medical_auditable, true);
assert.ok(
  retrievalFailureResult.repair_tasks.some((task) => task.code === "RETRIEVAL_FAILURE"),
  "检索技术错误必须阻止发布，不能伪装成医学证据不足"
);

const blankSummaryCandidate = makeCandidate();
blankSummaryCandidate.case_summary = "   ";
const blankSummaryResult = assemble({
  candidate_json: JSON.stringify(blankSummaryCandidate),
  evidence_pool: registered.evidence_pool
});
assert.equal(blankSummaryResult.structure_decision, "FAIL");
assert.equal(blankSummaryResult.medical_auditable, true);
assert.ok(
  blankSummaryResult.repair_tasks.some((task) => task.code === "CASE_SUMMARY_EMPTY"),
  "空case_summary必须生成根字段FULL修订任务"
);

// 可解析结构错误仍必须进入医学审核，并一次列出多个机械错误。
const structurallyBroken = makeCandidate();
structurallyBroken.questions[0].options[1] = structurallyBroken.questions[0].options[0];
structurallyBroken.questions[0].answer_text = "不在选项中的答案";
const brokenResult = assemble({
  candidate_json: JSON.stringify(structurallyBroken),
  evidence_pool: registered.evidence_pool
});
assert.equal(brokenResult.structure_decision, "FAIL");
assert.equal(brokenResult.medical_auditable, true);
assert.ok(brokenResult.structure_errors.some((item) => item.includes("重复选项")));
assert.ok(
  brokenResult.structure_errors.some((item) => item.includes("answer_text与options[answer]"))
);
assert.ok(brokenResult.repair_tasks.length >= 2);
for (const task of brokenResult.repair_tasks) {
  assert.equal(
    Object.keys(task).sort().join("|"),
    ["target_ids", "code", "fields", "message"].sort().join("|")
  );
}
assert.equal(JSON.parse(brokenResult.candidate_json_passthrough).questions.length, 5);

const unparsable = assemble({
  candidate_json: "{not-json",
  evidence_pool: registered.evidence_pool
});
assert.equal(unparsable.structure_decision, "FAIL");
assert.equal(unparsable.medical_auditable, false);

const insufficientCandidate = {
  schema_version: "1.1",
  generation_status: "insufficient",
  case_summary: "脱敏摘要",
  question_count: 0,
  difficulty: "进阶",
  questions: [],
  missing_information: ["缺少足以支持固定五题的独立硬证据"],
  risk_message: "继续生成会造成证据外推。"
};
const insufficientResult = assemble({
  candidate_json: JSON.stringify(insufficientCandidate),
  evidence_pool: registered.evidence_pool
});
assert.equal(insufficientResult.structure_decision, "INSUFFICIENT");
assert.equal(insufficientResult.medical_auditable, true);
const insuffEvidence = JSON.parse(insufficientResult.validator_evidence_json);
assert.equal(insuffEvidence.audit_mode, "FULL_POOL_FOR_INSUFFICIENCY");
assert.equal(insuffEvidence.records.length, registered.evidence_pool.records.length);
assert.ok(insuffEvidence.lanes.guideline_a.length > 0);
assert.equal(
  insuffEvidence.capacity_report.hard_candidate_count,
  registered.hard_candidate_count
);
assert.ok(insuffEvidence.compression_report.kept_total > 0);

// PATCH只替换授权题，原始JSON中的其他题对象逐字节保持不变。
const previousCandidate = makeCandidate();
const previousRaw = makePrettyRaw(previousCandidate);
const q1Raw = JSON.stringify(previousCandidate.questions[0], null, 4);
const q3Raw = JSON.stringify(previousCandidate.questions[2], null, 4);
const replacementQ2 = JSON.parse(JSON.stringify(previousCandidate.questions[1]));
replacementQ2.question = "修订后：综合三项当前已知因素，此时最合理的治疗决策是什么？";
const patchPacket = {
  revision_mode: "PATCH",
  repair_tasks: [
    exactTask(["Q2"], "POPULATION_MISMATCH", ["question"], "修复人群与阶段错配")
  ],
  preserve_ids: ["Q1", "Q3", "Q4", "Q5"]
};
const patchOutput = {
  revision_mode: "PATCH",
  replacements: [replacementQ2],
  generation_status: "success",
  missing_information: [],
  risk_message: ""
};
const merged = mergePatch({
  previous_internal_json: previousRaw,
  repair_packet: JSON.stringify(patchPacket),
  patch_json: JSON.stringify(patchOutput, null, 2)
});
assert.equal(merged.merge_decision, "PASS", merged.merge_errors.join("；"));
assert.equal(merged.changed_ids.join(","), "Q2");
assert.equal(merged.preserved_ids.join(","), "Q1,Q3,Q4,Q5");
assert.ok(merged.merged_internal_json.includes(q1Raw));
assert.ok(merged.merged_internal_json.includes(q3Raw));
assert.equal(
  JSON.parse(merged.merged_internal_json).questions[1].question,
  replacementQ2.question
);

// 根级重复键会让原始切片扫描与JSON.parse观察到不同questions，必须在装配和PATCH入口失败关闭。
const shadowQuestions = JSON.parse(JSON.stringify(previousCandidate.questions));
shadowQuestions[1].question = "UNREPAIRED_MEDICAL_Q2";
const duplicateQuestionsRaw = previousRaw.replace(
  "{\n",
  `{\n  "questions": ${JSON.stringify(shadowQuestions)},\n`
);
const duplicateQuestionsAssembly = assemble({
  candidate_json: duplicateQuestionsRaw,
  evidence_pool: registered.evidence_pool
});
assert.equal(duplicateQuestionsAssembly.structure_decision, "FAIL");
assert.ok(
  duplicateQuestionsAssembly.structure_errors.some(
    (item) => item.includes("重复键") && item.includes("questions")
  ),
  "装配节点必须明确拒绝重复根questions"
);
const duplicateQuestionsPatch = mergePatch({
  previous_internal_json: duplicateQuestionsRaw,
  repair_packet: JSON.stringify(patchPacket),
  patch_json: JSON.stringify(patchOutput)
});
assert.equal(duplicateQuestionsPatch.merge_decision, "FAIL");
assert.equal(duplicateQuestionsPatch.merged_internal_json, "");

const missingAuthorizedMode = mergePatch({
  previous_internal_json: previousRaw,
  repair_packet: { repair_tasks: patchPacket.repair_tasks, preserve_ids: patchPacket.preserve_ids },
  patch_json: patchOutput
});
assert.equal(missingAuthorizedMode.merge_decision, "FAIL");
assert.ok(
  missingAuthorizedMode.merge_errors.some((item) => item.includes("repair_packet.revision_mode")),
  "模型patch_json不得替repair_packet选择修订模式"
);

const legacyTaskFallback = mergePatch({
  previous_internal_json: previousRaw,
  repair_packet: {
    revision_mode: "PATCH",
    repair_tasks_json: JSON.stringify(patchPacket.repair_tasks),
    preserve_ids: patchPacket.preserve_ids
  },
  patch_json: patchOutput
});
assert.equal(legacyTaskFallback.merge_decision, "FAIL");
assert.ok(
  legacyTaskFallback.merge_errors.some((item) => item.includes("repair_packet.repair_tasks")),
  "不得从旧repair_tasks_json静默回退"
);

const patchWithSummary = mergePatch({
  previous_internal_json: previousRaw,
  repair_packet: patchPacket,
  patch_json: { ...patchOutput, case_summary: "不得由PATCH改写" }
});
assert.equal(patchWithSummary.merge_decision, "FAIL");
assert.ok(
  patchWithSummary.merge_errors.some((item) => item.includes("PATCH不得输出case_summary"))
);

const unauthorizedQ4 = JSON.parse(JSON.stringify(previousCandidate.questions[3]));
unauthorizedQ4.question += "（越权修改）";
const unauthorizedPatch = {
  ...patchOutput,
  replacements: [replacementQ2, unauthorizedQ4]
};
const unauthorizedResult = mergePatch({
  previous_internal_json: previousRaw,
  repair_packet: patchPacket,
  patch_json: unauthorizedPatch
});
assert.equal(unauthorizedResult.merge_decision, "FAIL");
assert.ok(unauthorizedResult.merge_errors.some((item) => item.includes("越权")));

const missingTargetResult = mergePatch({
  previous_internal_json: previousRaw,
  repair_packet: patchPacket,
  patch_json: { ...patchOutput, replacements: [] }
});
assert.equal(missingTargetResult.merge_decision, "FAIL");
assert.ok(missingTargetResult.merge_errors.some((item) => item.includes("漏修")));

const wrongPreserveSetResult = mergePatch({
  previous_internal_json: previousRaw,
  repair_packet: {
    ...patchPacket,
    preserve_ids: ["Q1", "Q3", "Q4"]
  },
  patch_json: patchOutput
});
assert.equal(wrongPreserveSetResult.merge_decision, "FAIL");
assert.ok(
  wrongPreserveSetResult.merge_errors.some((item) => item.includes("preserve_ids")),
  "格式合法但集合错误的preserve_ids必须失败"
);

const unchangedTargetResult = mergePatch({
  previous_internal_json: previousRaw,
  repair_packet: patchPacket,
  patch_json: {
    ...patchOutput,
    replacements: [previousCandidate.questions[1]]
  }
});
assert.equal(unchangedTargetResult.merge_decision, "FAIL");
assert.ok(
  unchangedTargetResult.merge_errors.some(
    (item) => item.includes("完全相同") || item.includes("无关的字段")
  )
);

const unrelatedQ2 = JSON.parse(JSON.stringify(previousCandidate.questions[1]));
unrelatedQ2.phase = "只改无关阶段标签";
const unrelatedResult = mergePatch({
  previous_internal_json: previousRaw,
  repair_packet: patchPacket,
  patch_json: { ...patchOutput, replacements: [unrelatedQ2] }
});
assert.equal(unrelatedResult.merge_decision, "FAIL");
assert.ok(unrelatedResult.merge_errors.some((item) => item.includes("无关的字段")));

// FULL也只能改repair_tasks.target_ids；case_summary由FULL修订显式返回。
const fullQuestions = JSON.parse(JSON.stringify(previousCandidate.questions));
fullQuestions[1] = replacementQ2;
const fullPacket = {
  revision_mode: "FULL",
  repair_tasks: [
    exactTask(["Q2"], "SET_REPAIR", ["question"], "修复集合级冲突中的Q2")
  ],
  preserve_ids: ["Q1", "Q3", "Q4", "Q5"]
};
const fullPatch = {
  revision_mode: "FULL",
  case_summary: "FULL修订显式返回的脱敏摘要。",
  replacements: fullQuestions,
  generation_status: "success",
  missing_information: [],
  risk_message: ""
};
const fullMerged = mergePatch({
  previous_internal_json: previousRaw,
  repair_packet: fullPacket,
  patch_json: fullPatch
});
assert.equal(fullMerged.merge_decision, "PASS", fullMerged.merge_errors.join("；"));
assert.equal(
  JSON.parse(fullMerged.merged_internal_json).case_summary,
  fullPatch.case_summary
);
assert.ok(
  fullMerged.merged_internal_json.includes(q1Raw),
  "FULL也必须逐字节保留未授权且语义未变的题"
);

const setWideQuestions = JSON.parse(JSON.stringify(previousCandidate.questions));
setWideQuestions[1].support_mode = "clinical_reasoning";
const setWideResult = mergePatch({
  previous_internal_json: previousRaw,
  repair_packet: {
    revision_mode: "FULL",
    repair_tasks: [
      exactTask(
        ["Q1", "Q2", "Q3", "Q4", "Q5"],
        "HARD_QUOTA",
        ["support_mode", "evidence_id"],
        "修复集合级配额"
      )
    ],
    preserve_ids: []
  },
  patch_json: {
    ...fullPatch,
    replacements: setWideQuestions
  }
});
assert.equal(
  setWideResult.merge_decision,
  "PASS",
  "FULL集合任务只需至少一个相关授权题发生实质变化"
);
assert.equal(setWideResult.changed_ids.join(","), "Q2");

const wrongRootCandidate = makeCandidate();
wrongRootCandidate.schema_version = "0.9";
const rootRepairResult = mergePatch({
  previous_internal_json: makePrettyRaw(wrongRootCandidate).replace(
    '"schema_version": "1.1"',
    '"schema_version": "0.9"'
  ),
  repair_packet: {
    revision_mode: "FULL",
    repair_tasks: [
      exactTask(
        ["Q1", "Q2", "Q3", "Q4", "Q5"],
        "SCHEMA_VERSION",
        ["schema_version"],
        "恢复公共schema版本"
      )
    ],
    preserve_ids: ["Q1", "Q2", "Q3", "Q4", "Q5"]
  },
  patch_json: {
    ...fullPatch,
    case_summary: wrongRootCandidate.case_summary,
    replacements: wrongRootCandidate.questions
  }
});
assert.equal(
  rootRepairResult.merge_decision,
  "PASS",
  rootRepairResult.merge_errors.join("；")
);
assert.equal(JSON.parse(rootRepairResult.merged_internal_json).schema_version, "1.1");

const partialCandidate = makeCandidate();
partialCandidate.question_count = 2;
partialCandidate.questions = partialCandidate.questions.slice(0, 2);
const partialFullQuestions = makeCandidate().questions;
partialFullQuestions[0] = JSON.parse(JSON.stringify(partialCandidate.questions[0]));
partialFullQuestions[1] = JSON.parse(JSON.stringify(partialCandidate.questions[1]));
const partialFullResult = mergePatch({
  previous_internal_json: JSON.stringify(partialCandidate),
  repair_packet: {
    revision_mode: "FULL",
    repair_tasks: [
      exactTask(
        ["Q1", "Q2", "Q3", "Q4", "Q5"],
        "QUESTION_SET_SIZE",
        ["questions", "question_count"],
        "补齐完整五题"
      )
    ],
    preserve_ids: ["Q1", "Q2"]
  },
  patch_json: {
    ...fullPatch,
    replacements: partialFullQuestions
  }
});
assert.equal(
  partialFullResult.merge_decision,
  "PASS",
  partialFullResult.merge_errors.join("；")
);
assert.equal(partialFullResult.preserved_ids.join(","), "Q1,Q2");

const forbiddenPrevious = makeCandidate();
forbiddenPrevious.questions[1].guidelineRef = { source_title: "模型猜测来源" };
const forbiddenReplacement = JSON.parse(
  JSON.stringify(forbiddenPrevious.questions[1])
);
delete forbiddenReplacement.guidelineRef;
const forbiddenRemovalResult = mergePatch({
  previous_internal_json: JSON.stringify(forbiddenPrevious),
  repair_packet: {
    revision_mode: "PATCH",
    repair_tasks: [
      exactTask(
        ["Q2"],
        "MODEL_SUPPLIED_EVIDENCE_METADATA",
        ["guidelineRef"],
        "删除模型越权填写的来源元数据"
      )
    ],
    preserve_ids: ["Q1", "Q3", "Q4", "Q5"]
  },
  patch_json: {
    ...patchOutput,
    replacements: [forbiddenReplacement]
  }
});
assert.equal(
  forbiddenRemovalResult.merge_decision,
  "PASS",
  forbiddenRemovalResult.merge_errors.join("；")
);

const fullUnauthorized = JSON.parse(JSON.stringify(fullPatch));
fullUnauthorized.replacements[2].question += "（越权）";
const fullUnauthorizedResult = mergePatch({
  previous_internal_json: previousRaw,
  repair_packet: fullPacket,
  patch_json: fullUnauthorized
});
assert.equal(fullUnauthorizedResult.merge_decision, "FAIL");
assert.ok(
  fullUnauthorizedResult.merge_errors.some((item) => item.includes("FULL越权"))
);

const fullWithoutSummary = { ...fullPatch };
delete fullWithoutSummary.case_summary;
const fullWithoutSummaryResult = mergePatch({
  previous_internal_json: previousRaw,
  repair_packet: fullPacket,
  patch_json: fullWithoutSummary
});
assert.equal(fullWithoutSummaryResult.merge_decision, "FAIL");
assert.ok(fullWithoutSummaryResult.merge_errors.some((item) => item.includes("case_summary")));

const rootFullPacket = {
  revision_mode: "FULL",
  repair_tasks: [
    exactTask([], "JSON_PARSE", ["questions"], "完整重建不可解析的首轮候选")
  ],
  preserve_ids: []
};
const rebuiltFromInvalid = mergePatch({
  previous_internal_json: "{broken",
  repair_packet: rootFullPacket,
  patch_json: fullPatch
});
assert.equal(
  rebuiltFromInvalid.merge_decision,
  "PASS",
  rebuiltFromInvalid.merge_errors.join("；")
);
assert.equal(JSON.parse(rebuiltFromInvalid.merged_internal_json).questions.length, 5);

const revisionInsufficient = mergePatch({
  previous_internal_json: previousRaw,
  repair_packet: patchPacket,
  patch_json: {
    revision_mode: "PATCH",
    replacements: [],
    generation_status: "insufficient",
    missing_information: ["修订所需的匹配人群硬证据缺失"],
    risk_message: "继续替换会造成高风险外推。"
  }
});
assert.equal(revisionInsufficient.merge_decision, "INSUFFICIENT");
const recheckedInsufficient = assemble({
  candidate_json: revisionInsufficient.merged_internal_json,
  evidence_pool: registered.evidence_pool
});
assert.equal(recheckedInsufficient.structure_decision, "INSUFFICIENT");
assert.equal(recheckedInsufficient.medical_auditable, true);
assert.equal(
  JSON.parse(recheckedInsufficient.validator_evidence_json).audit_mode,
  "FULL_POOL_FOR_INSUFFICIENCY"
);

// 精确段落去重只移除规范化空白后完全相同的后续段落。
const deduped = dedupeCase({
  case_id: "CASE-1",
  title: "脱敏病例",
  disease: "肺癌",
  mode: "全程管理",
  context: "首诊事实原文。\n\n共同  段落原文。",
  timeline: "共同 段落原文。\n\n后续时间线原文。",
  biomarkers: "标志物原文。",
  learning_points: "后续时间线原文。",
  decision_points: "另一个决策原文。",
  adverse_events: "",
  evidence_notes: "共同段落原文。"
});
assert.equal(deduped.case_packet.case_context.includes("共同  段落原文。"), true);
assert.equal(deduped.case_packet.case_timeline, "后续时间线原文。");
assert.equal(deduped.case_packet.learning_points, "");
assert.equal(
  deduped.case_packet.evidence_notes,
  "共同段落原文。",
  "标点/字符不同的段落不得误删"
);
assert.equal(deduped.dedupe_report.removed_duplicate_count, 2);
assert.equal(JSON.parse(deduped.case_packet_json).case_title, "脱敏病例");
assert.ok(deduped.case_packet_text.includes("【病例时间线】"));

console.log(
  JSON.stringify(
    {
      status: "PASS",
      assertions: {
        supplement_gate: "PASS",
        stable_evidence_ids_within_normalized_pool: "PASS",
        deterministic_hydration: "PASS",
        medical_auditable_on_structure_failure: "PASS",
        insufficiency_full_pool: "PASS",
        patch_byte_preservation: "PASS",
        duplicate_root_key_guard: "PASS",
        patch_authorization: "PASS",
        full_authorization_and_summary: "PASS",
        exact_case_deduplication: "PASS"
      }
    },
    null,
    2
  )
);
