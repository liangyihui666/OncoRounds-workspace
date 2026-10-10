const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const code = fs.readFileSync(
  path.join(__dirname, "纯机械结构硬检.js"),
  "utf8"
);
const context = {};
vm.createContext(context);
vm.runInContext(code, context, { filename: "纯机械结构硬检.js" });
assert.equal(typeof context.main, "function");

const evidenceTypes = [
  "指南",
  "临床研究",
  "病例+临床推理",
  "病例+临床推理",
  "指南"
];
const records = evidenceTypes.map((evidenceType, index) => ({
  lane: index < 2 ? "guideline_a" : "guideline_b",
  doc_id: `DOC-${index + 1}`,
  split_index: index,
  type: evidenceType === "指南" ? "guideline" : "journal",
  authority: evidenceType === "指南" ? "测试学会" : "测试期刊",
  source_title: `来源${index + 1}`,
  source_version: "2026",
  source_section: "",
  source_url: "",
  snippet: `直接支持第${index + 1}题的核心原则。`
}));

const candidate = {
  schema_version: "1.1",
  generation_status: "success",
  case_summary: "脱敏摘要",
  question_count: 5,
  difficulty: "进阶",
  questions: records.map((record, index) => ({
    id: `Q${index + 1}`,
    type: [
      "诊断与分期",
      "治疗决策",
      "疗效复评与局部治疗",
      "耐药与后线管理",
      "不良反应管理"
    ][index],
    phase: `阶段${index + 1}`,
    timepoint: `时间点${index + 1}`,
    question: `综合三项病例条件后，第${index + 1}个决策应如何处理？`,
    options: [
      `正确处理${index + 1}`,
      `干扰处理甲${index + 1}`,
      `干扰处理乙${index + 1}`,
      `干扰处理丙${index + 1}`
    ],
    answer: 0,
    answer_text: `正确处理${index + 1}`,
    explain: `该处理符合当前病例条件与证据边界，其他处理不适用。`,
    keyPoint: `综合病例条件完成第${index + 1}个决策。`,
    guidelineRef: {
      evidence_type: evidenceTypes[index],
      doc_id: record.doc_id,
      split_index: record.split_index,
      type: record.type,
      authority: record.authority,
      source_title: record.source_title,
      source_version: record.source_version,
      source_section: record.source_section,
      source_url: record.source_url,
      evidence_summary: record.snippet
    }
  })),
  missing_information: [],
  risk_message: ""
};

const raw = JSON.stringify(candidate);
const passed = context.main({
  candidate_json: raw,
  evidence_pool: { records }
});
assert.equal(passed.structure_decision, "PASS");
assert.equal(passed.structure_errors.length, 0);
assert.equal(passed.hard_evidence_count, 3);
assert.equal(passed.clinical_reasoning_count, 2);
assert.equal(passed.cited_evidence.length, 5);
assert.equal(
  passed.candidate_json_passthrough,
  raw,
  "硬检不得改写或重排候选JSON"
);

const validReuse = JSON.parse(raw);
validReuse.questions[4].guidelineRef = {
  ...validReuse.questions[0].guidelineRef
};
const validReuseRaw = JSON.stringify(validReuse);
const validReuseResult = context.main({
  candidate_json: validReuseRaw,
  evidence_pool: { records }
});
assert.equal(validReuseResult.structure_decision, "PASS");
assert.equal(validReuseResult.candidate_json_passthrough, validReuseRaw);

const repeatedFields = JSON.parse(validReuseRaw);
repeatedFields.questions[4].timepoint = repeatedFields.questions[0].timepoint;
repeatedFields.questions[4].answer_text = repeatedFields.questions[0].answer_text;
repeatedFields.questions[4].options[0] = repeatedFields.questions[0].answer_text;
repeatedFields.questions[4].keyPoint = repeatedFields.questions[0].keyPoint;
const repeatedResult = context.main({
  candidate_json: JSON.stringify(repeatedFields),
  evidence_pool: { records }
});
assert.equal(repeatedResult.structure_decision, "FAIL");
for (const field of ["timepoint", "answer_text", "keyPoint"]) {
  assert.ok(
    repeatedResult.structure_errors.some((item) =>
      item.includes(`的${field}必须不同`)
    ),
    `应一次列出重复${field}`
  );
}

const thirdUse = JSON.parse(validReuseRaw);
thirdUse.questions[3].guidelineRef = {
  ...thirdUse.questions[0].guidelineRef
};
const thirdUseResult = context.main({
  candidate_json: JSON.stringify(thirdUse),
  evidence_pool: { records }
});
assert.equal(thirdUseResult.structure_decision, "FAIL");
assert.ok(
  thirdUseResult.structure_errors.some((item) =>
    item.includes("被使用3次，超过最多2题")
  )
);

const invalid = JSON.parse(raw);
invalid.questions[0].guidelineRef.split_index = "0";
const failed = context.main({
  candidate_json: JSON.stringify(invalid),
  evidence_pool: { records }
});
assert.equal(failed.structure_decision, "FAIL");
assert.ok(
  failed.structure_errors.some((item) =>
    item.includes("split_index必须为大于等于0的整数")
  )
);

console.log(
  JSON.stringify(
    {
      status: "PASS",
      cited_evidence_count: passed.cited_evidence.length,
      invalid_split_decision: failed.structure_decision
    },
    null,
    2
  )
);
