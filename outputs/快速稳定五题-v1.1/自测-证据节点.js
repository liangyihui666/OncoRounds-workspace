const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadMain(fileName) {
  const code = fs.readFileSync(path.join(__dirname, fileName), "utf8");
  const context = {};
  vm.createContext(context);
  vm.runInContext(code, context, { filename: fileName });
  assert.equal(typeof context.main, "function", `${fileName} 未暴露 main`);
  return context.main;
}

function guidelineRecord(docId, splitIndex, content, title) {
  return {
    score: 0.9,
    metadata: {
      docId,
      splitIndex,
      type: "guideline",
      authority: "测试学会",
      title,
      version: "2026",
      section: "",
      url: "",
      content: "必须从元数据剔除的正文",
      nested: {
        text: "也必须递归剔除",
        keeper: "应保留的来源字段"
      }
    },
    content
  };
}

function containsContentKey(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsContentKey);
  return Object.entries(value).some(([key, child]) => {
    if (
      [
        "snippet",
        "text",
        "content",
        "pagecontent",
        "chunk",
        "q",
        "a",
        "answer"
      ].includes(key.toLowerCase())
    ) {
      return true;
    }
    return containsContentKey(child);
  });
}

const compress = loadMain("证据注册与压缩.js");
const decideSupplement = loadMain("临床研究补检条件判定.js");

const guidelineA = Array.from({ length: 8 }, (_, index) =>
  guidelineRecord(
    `G-${index}`,
    String(index),
    `<p>管理动作${index}。</p><p>重复句。</p><p>重复句。</p>\uFFFD`,
    index === 0 ? "NCT12345678 随机研究指南条目" : `指南${index}`
  )
);
const guidelineB = [
  guidelineRecord("G-0", "0", "<p>跨路重复，不应保留。</p>", "重复指南"),
  guidelineRecord("GB-1", "12", "<div>独立B路证据。</div>", "B路指南")
];

const compressed = compress({
  guideline_a: guidelineA,
  guideline_b: guidelineB,
  clinical_study_initial: [
    guidelineRecord(
      "CG-1",
      "3",
      "<p>NCT11223344随机对照研究方案甲 versus 方案乙。</p>",
      "NCT11223344 trial 型标题但记录类型仍为 guideline"
    )
  ],
  clinical_study_supplement: [],
  irae_a: [],
  irae_b: []
});

assert.equal(compressed.evidence_pool.guideline_a.length, 6, "A路cap应为6");
assert.equal(compressed.evidence_pool.guideline_b.length, 1, "跨路重复应被丢弃");
assert.equal(
  compressed.evidence_pool.guideline_b[0].split_index,
  12,
  "纯数字splitIndex字符串应归一为整数"
);
assert.equal(
  compressed.evidence_pool.guideline_a[0].split_index,
  0,
  "字符串0应归一为整数0"
);
assert.ok(
  !/[<>\uFFFD]/.test(compressed.evidence_pool.guideline_a[0].snippet),
  "snippet应去HTML与乱码"
);
assert.equal(
  (
    compressed.evidence_pool.guideline_a[0].snippet.match(/重复句/g) || []
  ).length,
  1,
  "重复片段应只保留一次"
);
assert.equal(
  containsContentKey(
    compressed.evidence_pool.guideline_a[0].source_metadata
  ),
  false,
  "source_metadata必须递归剔除正文类键"
);
assert.equal(
  compressed.hard_candidate_count,
  compressed.evidence_pool.records.filter(
    (record) => record.type === "guideline" && record.authority
  ).length,
  "标题像研究的guideline不得再计为study造成双计"
);
assert.equal(
  compressed.needs_clinical_supplement,
  true,
  "初检无可识别研究时应触发补检"
);
assert.equal(
  compressed.identifiable_initial_study_count,
  0,
  "临床路中的guideline记录不得冒充可识别研究"
);

const noStudyDecision = decideSupplement({
  clinical_study_initial: [],
  evidence_pool: compressed.evidence_pool,
  estimated_question_capacity: compressed.estimated_question_capacity,
  hard_candidate_count: compressed.hard_candidate_count
});
assert.equal(noStudyDecision.supplement_decision, "TRIGGER");

const identifiableStudy = {
  doc_id: "S-1",
  split_index: 1,
  type: "journal",
  authority: "期刊",
  source_title: "NCT87654321 phase III randomized trial",
  source_version: "2026",
  source_section: "",
  source_url: "",
  snippet:
    "NCT87654321为III期随机研究，患者接受方案甲 versus 方案乙，比较PFS结果。"
};
const studyDecision = decideSupplement({
  clinical_study_initial: [identifiableStudy],
  evidence_pool: {
    records: [...compressed.evidence_pool.records, identifiableStudy]
  },
  estimated_question_capacity: 5,
  hard_candidate_count: 2
});
assert.equal(
  studyDecision.supplement_decision,
  "SKIP",
  "已有可识别研究且五题机械容量充足时应跳过补检"
);

console.log(
  JSON.stringify(
    {
      status: "PASS",
      cap: compressed.evidence_pool.guideline_a.length,
      kept_total: compressed.compression_report.kept_total,
      no_study_decision: noStudyDecision.supplement_decision,
      study_present_decision: studyDecision.supplement_decision
    },
    null,
    2
  )
);
