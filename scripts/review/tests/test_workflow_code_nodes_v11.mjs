import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..", "..");
const outputDir = path.join(root, "outputs", "快速稳定五题-v1.1");
const workflowPath = path.join(outputDir, "肿瘤大查房小工具-v1.1-离线审计参考-DO_NOT_IMPORT.json");
const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));

function node(name) {
  const matches = workflow.nodes.filter((item) => item.name === name);
  assert.equal(matches.length, 1, `expected one node ${name}`);
  return matches[0];
}

function runCode(name, input) {
  const code = node(name).inputs.find((item) => item.key === "code").value;
  const context = vm.createContext({});
  vm.runInContext(`${code}\nthis.__main = main;`, context, { filename: `${name}.js` });
  return context.__main(input);
}

const published = JSON.parse(
  fs.readFileSync(path.join(root, "scripts", "review", "fixtures", "release_v11_valid.json"), "utf8")
);
const internal = {
  schema_version: "1.1",
  generation_status: "success",
  case_summary: published.case_summary,
  difficulty: "进阶",
  question_count: 5,
  questions: published.questions.map((question) => ({
    ...question,
    options: [...question.options],
    answer: question.answer
  })),
  missing_information: [],
  risk_message: ""
};
const raw = JSON.stringify(internal);
const normalized = runCode("题目结构归一化", { agent_reply: raw });
assert.equal(normalized.normalization_status, "VALID");
assert.equal(normalized.normalized_json, raw);

const badInternal = structuredClone(internal);
badInternal.questions[0].answer_text = "不匹配";
const badRaw = JSON.stringify(badInternal);
const rejected = runCode("题目结构归一化", { agent_reply: badRaw });
assert.equal(rejected.normalization_status, "STRUCTURE_INVALID");
assert.equal(rejected.normalized_json, badRaw);

const duplicate = {
  docId: "g-1",
  splitIndex: 1,
  type: "guideline",
  authority: "CSCO",
  title: "<b>指南</b>",
  snippet: `<p>${"直接支持。".repeat(300)}</p>`,
  link: "https://example.org/g-1"
};
const supplement = {
  docId: "s-supp",
  splitIndex: 9,
  type: "journal",
  authority: "",
  title: "补检研究",
  snippet: "<div>补检证据</div>",
  link: "https://example.org/s-supp"
};
const registry = runCode("证据注册与压缩", {
  guideline_a: [duplicate],
  guideline_b: [structuredClone(duplicate)],
  study_initial: [],
  study_supplement: [supplement],
  irae_a: [],
  irae_b: []
});
const pool = JSON.parse(registry.evidence_pool_json);
assert.equal(pool.records.length, 2);
assert.equal(pool.records[0].snippet.includes("<p>"), false);
assert.equal(pool.records[0].snippet.length <= 1000, true);
assert.equal(pool.records.some((record) => record.evidence_lane === "临床研究补检"), true);

const selectedQuestions = structuredClone(internal);
selectedQuestions.questions = [
  {
    id: "Q1",
    guidelineRef: { doc_id: "s-supp", split_index: 9 }
  }
];
const selected = runCode("校验证据按引用提取", {
  normalized_json: JSON.stringify(selectedQuestions),
  evidence_pool_json: registry.evidence_pool_json
});
assert.equal(selected.selection_status, "READY");
const selection = JSON.parse(selected.selected_evidence_json);
assert.equal(selection.records.length, 1);
assert.equal(selection.records[0].docId, "s-supp");
assert.equal(selection.records[0].evidence_lane, "临床研究补检");

console.log("PASS workflow v1.1 deterministic code-node tests");
