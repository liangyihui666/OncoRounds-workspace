import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..", "..");
const workflowPath = path.join(
  root,
  "outputs",
  "快速稳定五题-v1.1",
  "OncoRounds-快速稳定五题-v1.1-可直接导入.json"
);
const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));

function node(name) {
  const matches = workflow.nodes.filter((item) => item.name === name);
  assert.equal(matches.length, 1, `expected one node named ${name}`);
  return matches[0];
}

function input(item, key) {
  const matches = item.inputs.filter((entry) => entry.key === key);
  assert.equal(matches.length, 1, `${item.name}.${key}`);
  return matches[0].value;
}

function runCode(name, args) {
  const code = input(node(name), "code");
  const context = vm.createContext({});
  vm.runInContext(`${code}\nthis.__main = main;`, context, { filename: `${name}.js` });
  return context.__main(args);
}

assert.equal(workflow.name, "OncoRounds-快速稳定五题-v1.1-导入测试版");
assert.equal(workflow.nodes.length, 41);
assert.equal(workflow.edges.length, 54);
assert.equal(JSON.stringify(workflow).includes("DO_NOT_IMPORT"), false);

for (const name of [
  "良医汇医学数据库（指南检索）",
  "良医汇医学数据库（指南检索B）",
  "良医汇医学数据库（临床研究检索）",
  "irAE正式指南检索A",
  "irAE正式指南检索B",
  "循环节点",
  "题目生成",
  "题目校验",
  "最终结果判断"
]) node(name);

assert.equal(workflow.nodes.some((item) => item.name === "严重irAE检索锚点B"), false);
assert.equal(workflow.nodes.some((item) => item.name === "出题计划与证据门禁"), false);

for (const name of ["题目生成", "题目校验"]) {
  const item = node(name);
  assert.equal(input(item, "model"), "deepseek-v4-pro");
  assert.equal(input(item, "maxToken"), 16384);
  assert.equal(input(item, "temperature"), 0.1);
  assert.equal(input(item, "aiChatResponseFormat"), "json_object");
}

const initialIrae = runCode("irAE双锚点确定性拆分-初次", {
  adverse_events: "免疫相关G3肺炎；免疫相关G2结肠炎"
});
assert.equal(initialIrae.has_a, true);
assert.equal(initialIrae.has_b, true);
assert.match(initialIrae.query_a, /感染鉴别与并行管理/);
assert.doesNotMatch(initialIrae.query_b, /感染鉴别与并行管理/);
assert.equal(initialIrae.needs_fallback, false);

const fallbackIrae = runCode("irAE双锚点确定性拆分-最终", {
  adverse_events: "免疫相关肺炎",
  fallback_json: JSON.stringify({ anchor_a: "G3｜肺炎", anchor_b: "" })
});
assert.equal(fallbackIrae.has_a, true);
assert.equal(fallbackIrae.fallback_applied, true);
assert.equal(fallbackIrae.needs_fallback, false);

const guideline = {
  docId: "g-1",
  splitIndex: 1,
  type: "guideline",
  authority: "测试学会",
  title: "测试指南",
  year: "2026",
  section: "第一节",
  link: "https://example.org/g-1",
  snippet: "同一条记录直接支持当前决策。"
};
const study = {
  docId: "s-1",
  splitIndex: 2,
  type: "journal",
  authority: "",
  title: "NCT12345678 randomized trial",
  year: "2026",
  section: "Results",
  link: "https://example.org/s-1",
  snippet: "NCT12345678 随机对照研究比较治疗组与对照组并报告主要终点结果。"
};
const initialPool = runCode("证据注册与压缩-初检", {
  guideline_a: [guideline],
  guideline_b: [],
  clinical_study_initial: [study],
  clinical_study_supplement: [],
  irae_a: [],
  irae_b: []
});
assert.equal(initialPool.evidence_pool.records.length, 2);
assert.equal(initialPool.hard_candidate_count >= 2, true);
assert.equal(initialPool.compression_report.kept_total, 2);

const fixture = JSON.parse(
  fs.readFileSync(path.join(here, "..", "fixtures", "release_v11_valid.json"), "utf8")
);
const candidate = {
  schema_version: "1.1",
  generation_status: "success",
  case_summary: fixture.case_summary,
  question_count: 5,
  difficulty: "进阶",
  questions: fixture.questions,
  missing_information: [],
  risk_message: ""
};
const locatorRecords = [];
const seen = new Set();
for (const question of fixture.questions) {
  const ref = question.guidelineRef;
  const key = `${ref.doc_id}::${ref.split_index}`;
  if (seen.has(key)) continue;
  seen.add(key);
  locatorRecords.push({ ...ref });
}
const structure = runCode("纯机械结构硬检", {
  candidate_json: JSON.stringify(candidate),
  evidence_pool: { records: locatorRecords }
});
assert.equal(structure.structure_decision, "PASS");
assert.equal(structure.candidate_json_passthrough, JSON.stringify(candidate));

const structureFail = runCode("本轮审核结果归一", {
  structure_decision: "FAIL",
  structure_errors: ["Q2答案索引错误"],
  structure_warnings: []
});
assert.equal(structureFail.decision, "REVISE");
assert.match(structureFail.feedback_json, /Q2答案索引错误/);

const lowScore = runCode("本轮审核结果归一", {
  structure_decision: "PASS",
  structure_errors: [],
  structure_warnings: [],
  review_text: JSON.stringify({ decision: "PASS", score: 74 }),
  validator_decision: "PASS",
  validator_score: 74
});
assert.equal(lowScore.decision, "REVISE");

const pass = runCode("本轮审核结果归一", {
  structure_decision: "PASS",
  structure_errors: [],
  structure_warnings: [],
  review_text: JSON.stringify({ decision: "PASS", score: 75 }),
  validator_decision: "PASS",
  validator_score: 75
});
assert.equal(pass.decision, "PASS");

const finalConditions = input(node("最终结果判断"), "ifElseList")[0].list;
assert.equal(finalConditions.some((item) => item.value === "PASS"), true);
assert.equal(
  finalConditions.some((item) => item.condition === "greaterThanOrEqualTo" && item.value === "75"),
  true
);

console.log("PASS importable FastGPT v1.1 workflow tests");
