import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..", "..");
const sourcePath = path.join(os.homedir(), "Downloads", "题目生成 (1).json");
const outputPath = path.join(
  root,
  "outputs",
  "快速稳定五题-v1.1",
  "题目生成-v1.1-FixC-证据传递修复-可导入.json"
);
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

const source = readJson(sourcePath);
const workflow = readJson(outputPath);

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

function edgeSignature(edge) {
  return [edge.source, edge.target, edge.sourceHandle, edge.targetHandle];
}

assert.equal(workflow.nodes.length, 41);
assert.equal(workflow.edges.length, 54);
assert.deepEqual(
  workflow.nodes.map((item) => item.nodeId),
  source.nodes.map((item) => item.nodeId),
  "node IDs and order must remain unchanged"
);
assert.deepEqual(
  workflow.edges.map(edgeSignature),
  source.edges.map(edgeSignature),
  "all edges must remain unchanged"
);
assert.deepEqual(workflow.chatConfig, source.chatConfig);
assert.equal(workflow.nodes.some((item) => item.name === "出题计划与证据门禁"), false);

const runtimeBindings = {
  "研究线索提取": ["initial_studies", "guideline_a", "guideline_b"],
  "证据注册与压缩-初检": [
    "guideline_a", "guideline_b", "clinical_study_initial",
    "clinical_study_supplement", "irae_a", "irae_b"
  ],
  "证据注册与压缩-最终": [
    "guideline_a", "guideline_b", "clinical_study_initial",
    "clinical_study_supplement", "irae_a", "irae_b"
  ],
  "本轮审核结果归一": ["structure_errors", "structure_warnings"]
};
for (const [nodeName, keys] of Object.entries(runtimeBindings)) {
  const item = node(nodeName);
  for (const key of keys) {
    const field = item.inputs.find((entry) => entry.key === key);
    assert.equal(field.valueType, "any", `${nodeName}.${key} must pass arrays as any`);
    if (field.value !== null && !(Array.isArray(field.value) && field.value.length === 0)) {
      assert.equal(field.value.length, 2, `${nodeName}.${key} reference must be one level`);
      assert.equal(typeof field.value[0], "string");
      assert.equal(typeof field.value[1], "string");
    }
  }
}

const generatorPrompt = input(node("题目生成"), "systemPrompt");
const validatorPrompt = input(node("题目校验"), "systemPrompt");
assert.match(generatorPrompt, /病例发生当时可执行的决策\/实际治疗路径/);
assert.match(generatorPrompt, /优先纳入1道诊断\/鉴别题/);
assert.match(validatorPrompt, /混淆当前规范与历史可用性属于时间与证据适用性硬错误/);
assert.match(validatorPrompt, /不能单独构成硬错误或阻止PASS/);

for (const name of ["题目生成", "题目校验"]) {
  const item = node(name);
  assert.equal(input(item, "model"), "deepseek-v4-pro");
  assert.equal(input(item, "temperature"), 0.1);
  assert.equal(input(item, "maxToken"), 16384);
  assert.equal(input(item, "aiChatReasoning"), true);
  assert.equal(input(item, "aiChatReasoningEffort"), "medium");
  assert.equal(input(item, "aiChatResponseFormat"), "json_object");
}

const code = input(node("纯机械结构硬检"), "code");
const context = vm.createContext({});
vm.runInContext(`${code}\nthis.__main = main;`, context, {
  filename: "纯机械结构硬检.js"
});

const fixture = JSON.parse(
  fs.readFileSync(path.join(here, "..", "fixtures", "release_v11_valid.json"), "utf8")
);
const candidate = {
  schema_version: "1.1",
  generation_status: "success",
  case_summary: fixture.case_summary,
  question_count: 5,
  difficulty: "进阶",
  questions: structuredClone(fixture.questions),
  missing_information: [],
  risk_message: ""
};
const records = [];
const seen = new Set();
for (const question of candidate.questions) {
  const ref = question.guidelineRef;
  const key = `${ref.doc_id}::${ref.split_index}`;
  if (!seen.has(key)) {
    seen.add(key);
    records.push({ ...ref });
  }
}

candidate.questions[4].guidelineRef = {
  ...candidate.questions[0].guidelineRef
};
const validReuseRaw = JSON.stringify(candidate);
const validReuse = context.__main({
  candidate_json: validReuseRaw,
  evidence_pool: { records }
});
assert.equal(validReuse.structure_decision, "PASS");
assert.equal(validReuse.candidate_json_passthrough, validReuseRaw);

const repeated = structuredClone(candidate);
repeated.questions[4].timepoint = repeated.questions[0].timepoint;
repeated.questions[4].answer_text = repeated.questions[0].answer_text;
repeated.questions[4].options[repeated.questions[4].answer] = repeated.questions[0].answer_text;
repeated.questions[4].keyPoint = repeated.questions[0].keyPoint;
const repeatedResult = context.__main({
  candidate_json: JSON.stringify(repeated),
  evidence_pool: { records }
});
assert.equal(repeatedResult.structure_decision, "FAIL");
for (const field of ["timepoint", "answer_text", "keyPoint"]) {
  assert.ok(repeatedResult.structure_errors.some((item) => item.includes(`的${field}必须不同`)));
}

const thirdUse = structuredClone(candidate);
thirdUse.questions[3].guidelineRef = {
  ...thirdUse.questions[0].guidelineRef
};
const thirdUseResult = context.__main({
  candidate_json: JSON.stringify(thirdUse),
  evidence_pool: { records }
});
assert.equal(thirdUseResult.structure_decision, "FAIL");
assert.ok(thirdUseResult.structure_errors.some((item) => item.includes("被使用3次，超过最多2题")));

console.log("PASS targeted Fix C and mechanical reuse workflow tests");
