const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../..');
const basePath = path.join(root, 'outputs/题目生成-首轮75分-第二轮直接放行-兼容导入版.json');
const nextPath = path.join(root, 'outputs/题目生成-质量优化-首轮75分-二轮直出-20260904.json');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const base = read(basePath);
const next = read(nextPath);
const results = [];
function test(name, fn) { fn(); results.push({ name, passed: true }); }
function input(w, name, key) {
  return w.nodes.find(n => n.name === name).inputs.find(i => i.key === key).value;
}
function run(name, args) {
  const context = vm.createContext({ args });
  return vm.runInContext(`${input(next, name, 'code')}\nmain(args)`, context, { timeout: 1000 });
}

test('JSON、BOM、48节点62连线及所有非提示词字段保持原样', () => {
  assert.equal(fs.readFileSync(nextPath).subarray(0, 3).toString('hex'), 'efbbbf');
  assert.equal(next.nodes.length, 48);
  assert.equal(next.edges.length, 62);
  assert.deepEqual(next.edges, base.edges);
  const restored = structuredClone(next);
  const expected = new Set(['题目生成-首轮', '题目修订-第二轮', '题目校验-首轮', '题目校验-第二轮']);
  const changed = [];
  for (const n of restored.nodes) {
    const old = base.nodes.find(b => b.nodeId === n.nodeId);
    assert(old);
    const prompt = n.inputs?.find(i => i.key === 'systemPrompt');
    if (prompt && prompt.value !== old.inputs.find(i => i.key === 'systemPrompt').value) {
      changed.push(n.name);
      prompt.value = old.inputs.find(i => i.key === 'systemPrompt').value;
    }
  }
  assert.deepEqual(new Set(changed), expected);
  assert.deepEqual(restored, base);
});

test('全部代码节点可编译，temperature及response_format不变', () => {
  for (const n of next.nodes) {
    for (const i of n.inputs || []) if (i.key === 'code') new vm.Script(i.value);
  }
  assert.equal(input(next, '题目生成-首轮', 'temperature'), 0.3);
  assert.equal(input(next, '题目修订-第二轮', 'temperature'), 0.2);
  for (const name of ['题目校验-首轮', '题目校验-第二轮']) {
    assert.equal(input(next, name, 'temperature'), 0.1);
  }
});

test('两轮提示词使用一致的复用、未知信息、答案位置及枚举规则', () => {
  for (const name of ['题目生成-首轮', '题目修订-第二轮', '题目校验-首轮', '题目校验-第二轮']) {
    const p = input(next, name, 'systemPrompt');
    assert(p.includes('doc_id + split_index'));
    for (const value of ['诊断与分期', '分子诊断', '治疗决策', '疗效复评与局部治疗', '耐药与后线管理', '不良反应管理']) assert(p.includes(value));
    assert(p.includes('三个干扰项') || p.includes('另三个为干扰项'));
    assert(!p.includes('五道题的 primary evidence locator 必须唯一'));
    assert(!p.includes('四个干扰项在某些条件下'));
  }
  const r2 = input(next, '题目校验-第二轮', 'systemPrompt');
  assert(!r2.includes('由下游安全停止并发布0题'));
  assert(!r2.includes('由下游归一为REVISE_EXHAUSTED并发布0题'));
});

const candidate = {
  schema_version: '1.1', generation_status: 'success', case_summary: '仅用于程序测试的模拟病例',
  question_count: 5, difficulty: '进阶', missing_information: [], risk_message: '',
  questions: Array.from({ length: 5 }, (_, i) => ({
    id: `Q${i + 1}`, type: '治疗决策', phase: `阶段${i + 1}`, timepoint: `2024-01-0${i + 1}`,
    question: `程序测试问题${i + 1}`, options: ['答案一', '答案二', '答案三', '答案四'],
    answer: 0, answer_text: '答案一', explain: '程序测试解析', keyPoint: `知识点${i + 1}`,
    evidence_id: `TEST${i + 1}`, support_mode: i < 2 ? 'hard' : 'clinical_reasoning', evidence_summary: '仅测试字段'
  }))
};
const json = JSON.stringify(candidate);

test('首轮75分通过、74分不直接通过', () => {
  const args = { r1_decision: 'PASS', r1_score: 75, r1_publishable: true, r1_candidate: json };
  assert.equal(run('最终发布状态归一', args).publishable, true);
  assert.equal(run('最终发布状态归一', { ...args, r1_score: 74 }).publishable, false);
  assert.equal(run('最终发布状态归一', { ...args, r1_decision: 'REVISE' }).publishable, false);
});

test('第二轮REVISE仍直出且保留实际审核结论与分数', () => {
  const out = run('最终发布状态归一', { r1_candidate: json, r2_candidate: json, r2_decision: 'REVISE', r2_score: 38, r2_publishable: false });
  assert.equal(out.publishable, true);
  assert.equal(out.validation_decision, 'REVISE');
  assert.equal(out.validation_score, 38);
  assert.equal(out.round_count, 2);
  assert.equal(out.final_response_json, json);
});

test('第二轮候选损坏时维持原有首轮候选回退，两轮均无题时不造题', () => {
  const args = { r1_candidate: json, r2_candidate: '{', r2_decision: 'REVISE', r2_score: 0 };
  assert.equal(run('最终发布状态归一', args).final_response_json, json);
  const out = run('最终发布状态归一', { ...args, r1_candidate: '' });
  assert.equal(out.publishable, false);
  assert.equal(JSON.parse(out.final_response_json).questions.length, 0);
});

function patchArgs(task, question, mode = 'PATCH') {
  return {
    previous_internal_json: json,
    repair_packet: { revision_mode: mode, repair_tasks: [task], preserve_ids: ['Q2', 'Q3', 'Q4', 'Q5'] },
    patch_json: {
      revision_mode: mode, generation_status: 'success', missing_information: [], risk_message: '',
      replacements: mode === 'FULL' ? [question, ...candidate.questions.slice(1)] : [question],
      ...(mode === 'FULL' ? { case_summary: candidate.case_summary } : {})
    }
  };
}

test('重建题目可保留原证据；未授权题保持原值', () => {
  const replacement = { ...candidate.questions[0], question: '已改为当前证据支持的独立程序测试问题' };
  const task = { target_ids: ['Q1'], code: 'QUESTION_REBUILD_REQUIRED', fields: ['question', 'options', 'answer', 'answer_text', 'explain', 'keyPoint'], message: '重建问题' };
  for (const mode of ['PATCH', 'FULL']) {
    const out = run('修订补丁合并', patchArgs(task, replacement, mode));
    assert.equal(out.merge_decision, 'PASS');
    const merged = JSON.parse(out.merged_internal_json);
    assert.equal(merged.questions[0].evidence_id, candidate.questions[0].evidence_id);
    assert.deepEqual(merged.questions.slice(1), candidate.questions.slice(1));
  }
});

test('明确换证据任务仍要求ID改变，未执行不能被误判已修复', () => {
  const task = { target_ids: ['Q1'], code: 'EVIDENCE_REPLACEMENT_REQUIRED', fields: ['evidence_id'], message: '必须更换不适用证据' };
  const replacement = { ...candidate.questions[0], question: '只换措辞的程序测试问题' };
  assert.equal(run('修订补丁合并', patchArgs(task, replacement)).merge_decision, 'FAIL');
  assert.equal(run('修订补丁合并', patchArgs(task, { ...replacement, evidence_id: 'TEST_NEW' })).merge_decision, 'PASS');
});

test('insufficient与replacements互斥约束不变', () => {
  const task = { target_ids: ['Q1'], code: 'QUESTION_REBUILD_REQUIRED', fields: ['question'], message: '重建问题' };
  const args = patchArgs(task, candidate.questions[0]);
  args.patch_json.generation_status = 'insufficient';
  args.patch_json.missing_information = ['缺少可用于本程序测试的替代记录'];
  args.patch_json.risk_message = '测试不足分支';
  assert.equal(run('修订补丁合并', args).merge_decision, 'FAIL');
  args.patch_json.replacements = [];
  assert.equal(run('修订补丁合并', args).merge_decision, 'INSUFFICIENT');
});

console.log(JSON.stringify({ passed: results.length, total: results.length, results,
  scope: '静态配置及既有代码路径回归；没有调用千问、真实医学审核或FastGPT导入测试。' }, null, 2));
