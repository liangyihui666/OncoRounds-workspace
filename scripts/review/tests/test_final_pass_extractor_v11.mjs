import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..", "..");
const extractorPath = path.join(root, "outputs", "肿瘤大查房小工具-最终PASS题目JSON提取.js");
const fixturePath = path.join(root, "scripts", "review", "fixtures", "release_v11_valid.json");
const sourceCode = fs.readFileSync(extractorPath, "utf8");
const context = vm.createContext({ console });
vm.runInContext(`${sourceCode}\nthis.__extract = main;`, context, { filename: extractorPath });
const extract = context.__extract;

function internalFixture() {
  const published = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const questions = published.questions.map((question, index) => {
    const options = [...question.options];
    // Deliberately concentrate all correct answers at index 0. v1.1 must not
    // reorder options or enforce cosmetic answer-letter distribution.
    return {
      ...question,
      options,
      answer: 0,
      answer_text: options[0],
      question: index === 0
        ? "若 24 小时尿蛋白定量检测结果为 2.5g，结合其余病例因素，当前应优先评估什么？"
        : question.question
    };
  });
  return {
    schema_version: "1.1",
    generation_status: "success",
    case_id: published.case_id,
    cancer_type: published.cancer_type,
    case_summary: published.case_summary,
    difficulty: "进阶",
    question_count: 5,
    questions,
    missing_information: [],
    risk_message: ""
  };
}

const source = internalFixture();
const pass = {
  decision: "PASS",
  score: 88,
  fatal_errors: [],
  general_feedback: "",
  question_checks: [1, 2, 3, 4, 5].map((index) => ({
    id: `Q${index}`,
    passed: true,
    problems: [],
    revision: ""
  })),
  revision_instruction: "",
  missing_information: []
};
const result = extract({
  agent_reply: `${JSON.stringify(source)}\n${JSON.stringify(pass)}`,
  case_id: source.case_id,
  disease: "肺癌",
  difficulty: "进阶"
});

assert.equal(result.final_data.schema_version, "1.1");
assert.equal(result.final_data.question_count, 5);
assert.equal(result.final_data.case_summary, source.case_summary);
assert.equal(result.final_data.risk_message, "");
assert.equal(result.final_data.questions.map((question) => question.answer).join(","), "0,0,0,0,0");
assert.equal(result.final_data.questions[0].question, source.questions[0].question);
assert.equal(JSON.stringify(result.final_data.questions[0].options), JSON.stringify(source.questions[0].options));
assert.equal(result.case_page_data.schema_version, "1.1");
assert.equal(result.case_page_data.overview.tabs.some((tab) => tab.id === "timeline"), false);
assert.equal(Array.isArray(result.case_page_data.post_round.completion.full_timeline), true);
assert.equal(Array.isArray(result.case_page_data.post_round.completion.case_images), true);

assert.throws(
  () => extract({
    agent_reply: `${JSON.stringify(source)}\n${JSON.stringify(pass)}\n${JSON.stringify({ decision: "REVISE", score: 70 })}`,
    case_id: source.case_id,
    disease: "肺癌",
    difficulty: "进阶"
  }),
  /最后一次独立校验 decision=REVISE/
);

assert.throws(
  () => extract({
    agent_reply: `${JSON.stringify(source)}\n${JSON.stringify({ ...pass, score: 74 })}`,
    case_id: source.case_id,
    disease: "肺癌",
    difficulty: "进阶"
  }),
  /score 低于75/
);

assert.throws(
  () => extract({
    agent_reply: `${JSON.stringify(source)}\n${JSON.stringify({ ...pass, question_checks: pass.question_checks.slice(0, 4) })}`,
    case_id: source.case_id,
    disease: "肺癌",
    difficulty: "进阶"
  }),
  /五项 question_checks/
);

const legacyShape = internalFixture();
legacyShape.questions[0].options = {
  A: source.questions[0].options[0],
  B: source.questions[0].options[1],
  C: source.questions[0].options[2],
  D: source.questions[0].options[3]
};
legacyShape.questions[0].answer = "A";
assert.throws(
  () => extract({
    agent_reply: `${JSON.stringify(legacyShape)}\n${JSON.stringify(pass)}`,
    case_id: legacyShape.case_id,
    disease: "肺癌",
    difficulty: "进阶"
  }),
  /options 必须保持为4项数组/
);

const nonEmptyRisk = internalFixture();
nonEmptyRisk.risk_message = "仍有风险";
assert.throws(
  () => extract({
    agent_reply: `${JSON.stringify(nonEmptyRisk)}\n${JSON.stringify(pass)}`,
    case_id: nonEmptyRisk.case_id,
    disease: "肺癌",
    difficulty: "进阶"
  }),
  /risk_message 必须为空字符串/
);

const nonStringReference = internalFixture();
nonStringReference.questions[0].guidelineRef.source_version = 2026;
assert.throws(
  () => extract({
    agent_reply: `${JSON.stringify(nonStringReference)}\n${JSON.stringify(pass)}`,
    case_id: nonStringReference.case_id,
    disease: "肺癌",
    difficulty: "进阶"
  }),
  /source_version 必须为字符串/
);

const quotaFailure = internalFixture();
quotaFailure.questions.forEach((question) => {
  question.guidelineRef.evidence_type = "指南";
  question.guidelineRef.type = "guideline";
  question.guidelineRef.authority = "CSCO";
});
assert.throws(
  () => extract({
    agent_reply: `${JSON.stringify(quotaFailure)}\n${JSON.stringify(pass)}`,
    case_id: quotaFailure.case_id,
    disease: "肺癌",
    difficulty: "进阶"
  }),
  /v1.1配额失败/
);

console.log("PASS final PASS extractor v1.1 tests");
