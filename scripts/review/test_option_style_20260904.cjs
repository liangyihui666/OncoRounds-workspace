const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const load = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const bases = ['outputs/题目生成-单一结果输出-病种检索修复-20260904.json', 'outputs/三连-修复多JSON串流与错误归因-20260904.json'];
const paths = ['outputs/题目生成-选项均衡与干扰项优化-20260904.json', 'outputs/三连-选项均衡终选-20260904.json'];
const [oldInner, oldOuter] = bases.map(load), [inner, outer] = paths.map(load);
const input = (w, id, key) => w.nodes.find(n => n.nodeId === id || n.name === id).inputs.find(i => i.key === key).value;
function run(w, id, args) {
  const box = { args: structuredClone(args), URL };
  vm.runInNewContext(input(w, id, 'code') + '\nresult=main(args);', box, { timeout: 2000 });
  return JSON.parse(JSON.stringify(box.result));
}
const fixturePairs = [
  ['ALK', 'fc2f7bd9-3772-4683-99b9-72e6ca1ae86d', '1bd35ce1-b15a-45c6-9bc7-acdd3b917292'],
  ['GEJ', 'c7162fd4-5eb1-400f-a6ff-7e928914d644', '73c8c349-751f-42e7-b97b-cbe0d1906e2e'],
  ['食管', '047c3f1a-41ce-4a0d-b8e4-265fc114022e', 'b20fd69f-b556-4ae6-aabc-e4e521b2ccb1']
];
const attachment = id => load('C:/Users/admin/.codex/attachments/' + id + '/pasted-text.txt');
const cases = fixturePairs.map(([name, inputId, finalId]) => {
  const args = attachment(inputId), final = attachment(finalId);
  const pool = run(outer, '15题候选池拼接', args).candidate_pool;
  const oldPool = run(oldOuter, '15题候选池拼接', args).candidate_pool;
  const selected_ids = final.selection_report.selected.map(c => c.candidate_id);
  const result = run(outer, 'json生成', { ...pool.case_packet, candidate_pool: pool,
    agent_reply: JSON.stringify({ selection_status: 'success', selected_ids, selection_notes: [], risk_message: '' }) });
  return { name, args, final, pool, oldPool, result, selected_ids };
});
const tests = [];
function test(name, fn) { fn(); tests.push(name); console.log('PASS ' + name); }
const styleCode = fs.readFileSync('scripts/review/option_style_20260904.js', 'utf8');
const style = q => JSON.parse(JSON.stringify(vm.runInNewContext(styleCode + '\noptionStyleMetrics(q)', { q })));

test('三组真实日志候选数仍为5/15/10；最终各5题，无新增按长度拒收', () => {
  assert.deepEqual(cases.map(c => c.pool.candidate_count), [5, 15, 10]);
  cases.forEach(c => {
    assert.equal(c.result.final_data.question_count, 5);
    assert.equal(c.result.selection_report.medical_approval_confirmed, false);
    assert.deepEqual(c.pool.groups, c.oldPool.groups);
    assert.deepEqual(c.pool.candidates.map(i => i.question), c.oldPool.candidates.map(i => i.question));
  });
});
test('选项原文和正确答案保留，重排后答案对应；指标按最终ABCD重新计算', () => {
  cases.forEach(c => c.result.final_data.questions.forEach((q, i) => {
    const old = c.pool.candidates.find(p => p.candidate_id === c.selected_ids[i]).question;
    for (const k of ['question', 'answer_text', 'type', 'phase', 'timepoint', 'explain', 'keyPoint', 'guidelineRef']) assert.deepEqual(q[k], old[k]);
    assert.deepEqual(Object.values(q.options).sort(), (Array.isArray(old.options) ? old.options : Object.values(old.options)).slice().sort());
    assert.equal(q.options[q.answer], q.answer_text);
    const check = c.result.selection_report.option_style_checks[i];
    assert.equal(check.answer_position, q.answer);
    assert.deepEqual(check.option_lengths, style(q).option_lengths);
    assert.equal(check.candidate_id, c.selected_ids[i]);
  }));
});
test('肺癌Q4长答案及极端干扰项会提示；食管等长仍能提示绝对化线索', () => {
  const alk = cases[0].result.selection_report.option_style_checks[3];
  assert(alk.warning_codes.includes('CORRECT_OPTION_LONGER'));
  assert(alk.warning_codes.includes('OPTION_LENGTH_SPREAD'));
  assert(alk.warning_codes.includes('DISTRACTOR_ABSOLUTE_CUE'));
  assert(cases[2].result.selection_report.option_style_checks[4].warning_codes.includes('DISTRACTOR_ABSOLUTE_CUE'));
});
test('字数算法去空白标点、支持数组及字母答案；异常结构交由原结构检查', () => {
  const q = { options: ['甲，乙！', '丙 丁。', '戊；己', '庚、辛'], answer: 0 };
  assert.deepEqual(style(q).option_lengths, [2, 2, 2, 2]);
  assert.equal(style({ ...q, answer: 'A' }).warning_codes.length, 0);
  assert.equal(style({ ...q, answer: 5 }), null);
  assert.equal(style({ ...q, options: null }), null);
  assert.equal(style({ ...q, options: ['😀甲', '乙。', '丙。', '丁。'] }).option_lengths[0], 1);
});
test('GEJ原发伴肺转移不再被导出为肺癌；题目与病例页面分类相同', () => {
  assert.equal(cases[1].final.final_data.cancer_type, '肺癌'); // Reproduce original bug.
  assert.equal(cases[1].result.final_data.cancer_type, '胃食管结合部癌');
  assert.equal(cases[1].result.case_page_data.cancer_type, '胃食管结合部癌');
  assert.equal(cases[0].result.final_data.cancer_type, '肺癌');
  assert.equal(cases[2].result.final_data.cancer_type, '食管癌');
});
const candidate = {
  schema_version: '1.1', generation_status: 'success', case_summary: '程序回归专用模拟文本', question_count: 5,
  difficulty: '进阶', missing_information: [], risk_message: '',
  questions: Array.from({ length: 5 }, (_, i) => ({
    id: 'Q' + (i + 1), type: '治疗决策', phase: '测试阶段' + i, timepoint: '2024-01-0' + (i + 1),
    question: '程序测试题干' + i, options: ['长长长长长长长长长长长长长长长长长长长长', '短项一', '短项二', '短项三'],
    answer: 0, answer_text: '长长长长长长长长长长长长长长长长长长长长', explain: '测试解析', keyPoint: '测试知识点' + i,
    evidence_id: 'TEST' + i, support_mode: i < 2 ? 'hard' : 'clinical_reasoning', evidence_summary: '程序测试'
  }))
};
test('两轮装配只加warnings，不改变errors、候选和配额处理', () => {
  for (const id of ['cmuTcUhJefVm2DC6', 'v12AssemblyR2']) {
    const args = { candidate_json: candidate, evidence_pool: {} };
    const before = run(oldInner, id, args), after = run(inner, id, args);
    assert.equal(after.structure_warnings.length, before.structure_warnings.length + 5);
    after.structure_warnings = before.structure_warnings;
    assert.deepEqual(after, before);
  }
});
test('OPTION_STYLE_BIAS可通过既有PATCH/FULL合并且无需换证据；未授权题不变', () => {
  const task = { target_ids: ['Q1'], code: 'OPTION_STYLE_BIAS', fields: ['question', 'options', 'answer_text', 'explain'], message: '统一选项表达，保持正确结论和原证据' };
  const revised = { ...candidate.questions[0], options: ['长长长长长长长长长长长长长长长长长长长长', '程序测试干扰选项一仅用于检查字段变更', '程序测试干扰选项二仅用于检查字段变更', '程序测试干扰选项三仅用于检查字段变更'] };
  for (const mode of ['PATCH', 'FULL']) {
    const args = { previous_internal_json: candidate,
      repair_packet: { revision_mode: mode, repair_tasks: [task], preserve_ids: ['Q2', 'Q3', 'Q4', 'Q5'] },
      patch_json: { revision_mode: mode, generation_status: 'success', missing_information: [], risk_message: '',
        replacements: mode === 'PATCH' ? [revised] : [revised, ...candidate.questions.slice(1)],
        ...(mode === 'FULL' ? { case_summary: candidate.case_summary } : {}) } };
    const out = run(inner, '修订补丁合并', args);
    assert.equal(out.merge_decision, 'PASS', JSON.stringify(out));
    const merged = JSON.parse(out.merged_internal_json);
    assert.deepEqual(merged.questions.slice(1), candidate.questions.slice(1));
    assert.equal(merged.questions[0].evidence_id, 'TEST0');
    args.patch_json.replacements[0] = candidate.questions[0];
    assert.equal(run(inner, '修订补丁合并', args).merge_decision, 'FAIL');
  }
});
test('首轮75/74、二轮直出、无题与回退行为和真实审核信息不变', () => {
  const str = JSON.stringify(candidate);
  for (const args of [
    { r1_decision: 'PASS', r1_score: 75, r1_publishable: true, r1_candidate: str },
    { r1_decision: 'PASS', r1_score: 74, r1_publishable: true, r1_candidate: str },
    { r1_candidate: str, r2_candidate: str, r2_decision: 'REVISE', r2_score: 45 },
    { r1_candidate: str, r2_candidate: '', r2_decision: 'REVISE', r2_score: 0 },
    { r1_candidate: '', r2_candidate: '', r2_decision: 'REVISE', r2_score: 0 }
  ]) assert.deepEqual(run(inner, '最终发布状态归一', args), run(oldInner, '最终发布状态归一', args));
});
test('JSON保持原根配置、节点ID、连线、输出和模型参数；仅指定字段改变', () => {
  const allowed = [
    { sR35QbYF2xamDQR3: 'systemPrompt', x5dghEdUbp0QQg4T: 'systemPrompt', v12RevisionGenerator: 'systemPrompt', v12ValidatorR2: 'systemPrompt',
      cmuTcUhJefVm2DC6: 'code', v12AssemblyR2: 'code', aISFT5i9Sh2cffSo: 'system_textareaInput', v12ValidationInputR2: 'system_textareaInput' },
    { bJcPjyWI8hiwuVOS: 'code', ltrYX3w0AXTIiF0r: 'systemPrompt', jKqMCN8eJKvkngnI: 'code' }
  ];
  [inner, outer].forEach((w, j) => {
    const old = [oldInner, oldOuter][j], restored = structuredClone(w);
    for (const n of restored.nodes) {
      if (n.flowNodeType === 'code') new vm.Script(input(w, n.nodeId, 'code'));
      const key = allowed[j][n.nodeId];
      if (key) n.inputs.find(i => i.key === key).value = input(old, n.nodeId, key);
    }
    assert.deepEqual(restored, old);
    assert.equal(fs.readFileSync(paths[j]).subarray(0, 3).toString('hex'), fs.readFileSync(bases[j]).subarray(0, 3).toString('hex'));
  });
});
test('新增warnings引用存在且进入两轮校验输入；生成/修订/校验/终选约束同步', () => {
  for (const [id, ass] of [['aISFT5i9Sh2cffSo', 'cmuTcUhJefVm2DC6'], ['v12ValidationInputR2', 'v12AssemblyR2']]) {
    const oid = inner.nodes.find(n => n.nodeId === ass).outputs.find(o => o.key === 'structure_warnings').id;
    assert(input(inner, id, 'system_textareaInput').includes('{{$' + ass + '.' + oid + '$}}'));
  }
  for (const id of ['sR35QbYF2xamDQR3', 'v12RevisionGenerator', 'x5dghEdUbp0QQg4T', 'v12ValidatorR2']) assert(input(inner, id, 'systemPrompt').includes('1.5'));
  assert(input(outer, 'ltrYX3w0AXTIiF0r', 'systemPrompt').includes('不为四项同长而选医学更差的题'));
});
const checks = cases.flatMap(c => c.result.selection_report.option_style_checks);
const summary = {
  passed: tests.length, tests,
  selected_count: checks.length,
  correct_unique_longest_count: checks.filter(c => c.correct_is_unique_longest).length,
  option_style_warning_count: checks.filter(c => c.warning_codes.length).length,
  cases: cases.map(c => ({ name: c.name, candidate_count: c.pool.candidate_count, selected_count: c.result.final_data.question_count,
    final_cancer_type: c.result.final_data.cancer_type,
    source_status: c.pool.groups.map(g => ({ group_id: g.group_id, parse_status: g.parse_status, count: g.usable_question_count, selected_round: g.audit?.selected_candidate_round, error: g.error || null })),
    options: c.result.selection_report.option_style_checks })),
  scope: '本地静态配置/真实日志回放/代码回归；使用原入选ID，没有实际调用千问或验证FastGPT在线导入。原题未重写。'
};
fs.writeFileSync('outputs/三病例-选项表达检查与回归-20260904.json', JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ passed: tests.length, selected_count: checks.length, correct_unique_longest_count: summary.correct_unique_longest_count, option_style_warning_count: summary.option_style_warning_count }));
