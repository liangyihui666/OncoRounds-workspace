const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const load = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const paths = ['outputs/题目生成-三病例综合修复-v2-20260904.json', 'outputs/三连-证据原文终选与回退追踪-v2-20260904.json'];
const bases = ['outputs/题目生成-选项均衡与干扰项优化-20260904.json', 'outputs/三连-选项均衡终选-20260904.json'];
const [inner, outer] = paths.map(load), [oldInner, oldOuter] = bases.map(load);
const input = (w, id, key) => w.nodes.find(n => n.nodeId === id || n.name === id).inputs.find(i => i.key === key).value;
function run(w, id, args) {
  const ctx = { args: structuredClone(args), URL };
  vm.runInNewContext(input(w, id, 'code') + '\nresult=main(args);', ctx, { timeout: 2000 });
  return JSON.parse(JSON.stringify(ctx.result));
}
const tests = [];
function test(name, fn) { fn(); tests.push(name); console.log('PASS ' + name); }
const attachment = id => load('C:/Users/admin/.codex/attachments/' + id + '/pasted-text.txt');
const fixturePairs = [
  ['ALK', 'fc2f7bd9-3772-4683-99b9-72e6ca1ae86d', '1bd35ce1-b15a-45c6-9bc7-acdd3b917292'],
  ['GEJ', 'c7162fd4-5eb1-400f-a6ff-7e928914d644', '73c8c349-751f-42e7-b97b-cbe0d1906e2e'],
  ['食管', '047c3f1a-41ce-4a0d-b8e4-265fc114022e', 'b20fd69f-b556-4ae6-aabc-e4e521b2ccb1']
];
const cases = fixturePairs.map(([name, a, b]) => {
  const args = attachment(a), final = attachment(b);
  const pool = run(outer, '15题候选池拼接', args).candidate_pool;
  const selected_ids = final.selection_report.selected.map(c => c.candidate_id);
  const exported = run(outer, 'json生成', { ...pool.case_packet, candidate_pool: pool,
    agent_reply: JSON.stringify({ selection_status: 'success', selected_ids, selection_notes: [], risk_message: '待复核' }) });
  return { name, args, pool, exported, selected_ids };
});
test('三份真实日志候选5/15/10不被新字段拦截；按原ID各导出5题', () => {
  assert.deepEqual(cases.map(c => c.pool.candidate_count), [5, 15, 10]);
  for (const c of cases) {
    assert.equal(c.exported.final_data.question_count, 5);
    assert.equal(c.exported.selection_report.medical_approval_confirmed, false);
    assert.deepEqual(c.pool.candidates.map(i => i.question), run(oldOuter, '15题候选池拼接', c.args).candidate_pool.candidates.map(i => i.question));
    assert(c.pool.candidates.every(i => i.evidence_status === 'not_provided'));
    assert(c.exported.selection_report.warnings.some(s => s.includes('原始证据')));
  }
});
test('GEJ分类、字数提示和最终答案映射保留，绝不机械改写原题', () => {
  assert.equal(cases[1].exported.final_data.cancer_type, '胃食管结合部癌');
  for (const c of cases) c.exported.final_data.questions.forEach((q, i) => {
    const orig = c.pool.candidates.find(item => item.candidate_id === c.selected_ids[i]).question;
    for (const k of ['question', 'answer_text', 'explain', 'keyPoint', 'guidelineRef']) assert.deepEqual(q[k], orig[k]);
    assert.deepEqual(Object.values(q.options).sort(), Object.values(orig.options).sort());
    assert.equal(q.options[q.answer], q.answer_text);
    assert.equal(c.exported.selection_report.option_style_checks[i].answer_position, q.answer);
  });
});
test('真实食管TEN无G分级：旧版不检索，新版两处都启动且不虚构G3/G4', () => {
  const args = { adverse_events: cases[2].pool.case_packet.adverse_events };
  const old = run(oldInner, 'v11IraeSplitInitial', args);
  assert.equal(old.has_a, false);
  for (const id of ['v11IraeSplitInitial', 'v11IraeSplitFinal']) {
    const got = run(inner, id, args);
    assert.equal(got.has_a, true); assert.equal(got.has_b, false);
    assert.equal(got.needs_fallback, false);
    assert.equal(got.anchor_a_detail.grade_value, null);
    assert.equal(got.anchor_a_detail.grade_status, 'not_provided');
    assert(got.query_a.includes('TEN')); assert(got.query_a.includes('分级未提供'));
    assert(!/\bG[1-5]\b/.test(got.query_a));
  }
});
test('TEN与感染并存不因感染丢弃毒性锚点；单纯感染不会生成毒性锚点', () => {
  const got = run(inner, 'v11IraeSplitFinal', { adverse_events: 'PD-1单抗引起的TEN，合并MRSA感染，分级不详' });
  assert(got.has_a); assert(got.query_a.includes('感染鉴别与并行管理'));
  for (const text of ['', '无', '感染性肺炎，MRSA培养阳性', '未见TEN', '无第二项严重不良反应']) {
    assert.equal(run(inner, 'v11IraeSplitInitial', { adverse_events: text }).has_a, false, text);
  }
});
test('保留真实G4/G2排序；回退模型不能补造G4；疑似TEN不升级', () => {
  const got = run(inner, 'v11IraeSplitFinal', { adverse_events: '免疫相关皮疹G2；免疫相关心肌炎G4' });
  assert.equal(got.anchor_a_detail.grade_value, 4); assert.equal(got.anchor_b_detail.grade_value, 2);
  const fabricated = run(inner, 'v11IraeSplitFinal', { adverse_events: 'PD-1单抗引起TEN', fallback_json: { anchor_a: 'G4｜TEN', has_a: true } });
  assert.equal(fabricated.fallback_applied, false); assert.equal(fabricated.anchor_a_detail.grade_value, null);
  const possible = run(inner, 'v11IraeSplitInitial', { adverse_events: '考虑免疫相关TEN可能' });
  assert(possible.anchor_a.includes('疑似')); assert.equal(possible.anchor_a_detail.grade_value, null);
});

const candidate = { schema_version: '1.1', generation_status: 'success', question_count: 5,
  case_summary: '仅用于代码测试的模拟病例', difficulty: '进阶', missing_information: [], risk_message: '',
  questions: Array.from({ length: 5 }, (_, i) => ({ id: 'Q' + (i + 1), type: '治疗决策', phase: '测试阶段', timepoint: '2024-01-0' + (i + 1),
    question: '程序测试问题' + i, options: ['选项一', '选项二', '选项三', '选项四'], answer: 0, answer_text: '选项一',
    explain: '程序测试解析', keyPoint: '程序测试要点' + i, evidence_id: 'T' + i, support_mode: i < 2 ? 'hard' : 'clinical_reasoning', evidence_summary: '仅用于程序测试' })) };
const serialized = JSON.stringify(candidate);
const rebuild = { target_ids: ['Q1'], code: 'QUESTION_REBUILD_REQUIRED', fields: ['question', 'options', 'answer_text', 'explain'], message: '重建Q1' };
const revised = { ...candidate.questions[0], question: '改为另一独立的测试问题' };
function patchArgs(task = rebuild, q = revised, mode = 'FULL') {
  return structuredClone({ previous_internal_json: serialized,
    repair_packet: { revision_mode: mode, repair_tasks: [task], preserve_ids: ['Q2', 'Q3', 'Q4', 'Q5'] },
    patch_json: { revision_mode: mode, generation_status: 'success', replacements: [q], missing_information: [], risk_message: '' } });
}
test('稀疏FULL只继承明确保留题和未授权原摘要，输出完整五题', () => {
  const out = run(inner, '修订补丁合并', patchArgs());
  assert.equal(out.merge_decision, 'PASS', JSON.stringify(out));
  const merged = JSON.parse(out.merged_internal_json);
  assert.equal(merged.case_summary, candidate.case_summary); assert.equal(merged.questions.length, 5);
  assert.deepEqual(merged.questions.slice(1), candidate.questions.slice(1)); assert.deepEqual(out.changed_ids, ['Q1']);
  const full = patchArgs(); full.patch_json.replacements.push(...candidate.questions.slice(1)); full.patch_json.case_summary = candidate.case_summary;
  assert.equal(run(inner, '修订补丁合并', full).merge_decision, 'PASS');
});
test('漏修授权题、缺原题、不声明保留、越权修改保留题均仍FAIL', () => {
  let args = patchArgs(); args.repair_packet.repair_tasks[0].target_ids.push('Q2');
  assert.equal(run(inner, '修订补丁合并', args).merge_decision, 'FAIL');
  args = patchArgs(); args.previous_internal_json = '{}';
  assert.equal(run(inner, '修订补丁合并', args).merge_decision, 'FAIL');
  args = patchArgs(); args.repair_packet.preserve_ids = [];
  assert.equal(run(inner, '修订补丁合并', args).merge_decision, 'FAIL');
  args = patchArgs(); args.patch_json.replacements.push(...structuredClone(candidate.questions.slice(1))); args.patch_json.replacements[1].question = '越权';
  assert.equal(run(inner, '修订补丁合并', args).merge_decision, 'FAIL');
});
test('真实证据更换任务不能靠改题干混过，完全未修订的医学任务仍FAIL', () => {
  const task = { ...rebuild, code: 'EVIDENCE_REPLACEMENT_REQUIRED', fields: ['evidence_id'] };
  assert.equal(run(inner, '修订补丁合并', patchArgs(task)).merge_decision, 'FAIL');
  assert.equal(run(inner, '修订补丁合并', patchArgs(rebuild, candidate.questions[0])).merge_decision, 'FAIL');
  assert.equal(run(inner, '修订补丁合并', patchArgs(task, { ...revised, evidence_id: 'NEW' })).merge_decision, 'PASS');
});
test('摘要需修订时不得继承掩盖任务；insufficient缺省风险只补流程说明、不夹带题', () => {
  const args = patchArgs(); args.repair_packet.repair_tasks.push({ target_ids: [], code: 'CASE_SUMMARY', fields: ['case_summary'], message: '修摘要' });
  assert.equal(run(inner, '修订补丁合并', args).merge_decision, 'FAIL');
  const stop = patchArgs(); stop.patch_json = { revision_mode: 'FULL', generation_status: 'insufficient', replacements: [], missing_information: ['Q1缺少合格替代证据'] };
  const out = run(inner, '修订补丁合并', stop);
  assert.equal(out.merge_decision, 'INSUFFICIENT', JSON.stringify(out)); assert.equal(JSON.parse(out.merged_internal_json).questions.length, 0);
  stop.patch_json.replacements = [revised];
  assert.equal(run(inner, '修订补丁合并', stop).merge_decision, 'FAIL');
});
test('纯配额复核不强制改变标签，但真实HARD_QUOTA仍要求实际修复', () => {
  for (const mode of ['PATCH', 'FULL']) {
    const task = { ...rebuild, code: 'QUOTA_CHECK', fields: ['support_mode'] };
    const out = run(inner, '修订补丁合并', patchArgs(task, candidate.questions[0], mode));
    assert.equal(out.merge_decision, 'PASS', JSON.stringify(out)); assert.deepEqual(out.changed_ids, []);
    assert.equal(run(inner, '修订补丁合并', patchArgs({ ...task, code: 'HARD_QUOTA' }, candidate.questions[0], mode)).merge_decision, 'FAIL');
  }
});
test('审核任务包剥离无变化义务的QUOTA_CHECK，仍保留真正的医学修复和配额复核', () => {
  const review = { decision: 'REVISE', score: 65, recommended_revision_mode: 'FULL', fatal_errors: ['测试缺陷'], general_feedback: '需修Q1',
    question_checks: candidate.questions.map(q => ({ id: q.id, passed: q.id !== 'Q1', problems: q.id === 'Q1' ? ['测试问题'] : [], revision: '' })),
    repair_tasks: [rebuild, { target_ids: candidate.questions.map(q => q.id), code: 'QUOTA_CHECK', fields: ['support_mode'], message: '复核配额' }], revision_instruction: '修Q1后复核', missing_information: [] };
  const result = run(inner, '审核结果合并-首轮', { structure_decision: 'PASS', structure_errors: [], structure_warnings: [], medical_auditable: true,
    mechanical_revision_mode: '', mechanical_repair_tasks: [], candidate_internal_json: serialized, candidate_public_json: serialized, review_text: JSON.stringify(review) });
  const packet = JSON.parse(result.repair_packet_json);
  assert.equal(result.decision, 'REVISE'); assert.equal(result.score, 65);
  assert.deepEqual(packet.repair_tasks.map(t => t.code), ['QUESTION_REBUILD_REQUIRED']);
  assert.deepEqual(packet.preserve_ids, ['Q2', 'Q3', 'Q4', 'Q5']);
  assert.equal(packet.post_checks[0].code, 'QUOTA_CHECK'); assert.deepEqual(packet.output_contract.required_replacement_ids, ['Q1']);
});
test('首轮75分阈值、二轮直出、回退、空池分支行为不变', () => {
  for (const args of [
    { r1_candidate: serialized, r1_decision: 'PASS', r1_score: 75, r1_publishable: true },
    { r1_candidate: serialized, r1_decision: 'PASS', r1_score: 74, r1_publishable: true },
    { r1_candidate: serialized, r2_candidate: serialized, r2_decision: 'REVISE', r2_score: 45 },
    { r1_candidate: serialized, r2_candidate: '', r2_decision: 'REVISE', r2_score: 0 },
    { r1_candidate: '', r2_candidate: '', r2_decision: 'REVISE', r2_score: 0 }
  ]) {
    const old = run(oldInner, '最终发布状态归一', args), got = run(inner, '最终发布状态归一', args);
    for (const k of ['status', 'publishable', 'validation_decision', 'validation_score', 'round_count', 'final_response_json']) assert.deepEqual(got[k], old[k]);
  }
});

// These records test transport identity, not medicine. They do NOT retrofit old logs.
const publicCandidate = structuredClone(candidate);
publicCandidate.questions.forEach((q, i) => { q.guidelineRef = { doc_id: 'TESTDOC' + i, split_index: i, evidence_summary: q.evidence_summary }; });
const records = candidate.questions.map((q, i) => ({ evidence_id: q.evidence_id, doc_id: 'TESTDOC' + i, split_index: i,
  source_title: '测试原始来源', source_version: 'v1', snippet: '仅用于测试原文传递，不构成医学证据' + i }));
function envelopeArgs(round) {
  const qs = JSON.stringify(publicCandidate);
  return { r1_candidate: qs, r1_decision: 'REVISE', r1_score: 65,
    r1_feedback: JSON.stringify({ round: 1, decision: 'REVISE', score: 65, medical_auditable: true, patch_merge_decision: 'NOT_APPLICABLE',
      question_checks: candidate.questions.map(q => ({ id: q.id, passed: false, problems: ['测试错误，勿视为医学结论'] })) }),
    r2_candidate: round === 2 ? qs : '', r2_decision: 'REVISE', r2_score: round === 2 ? 70 : 0,
    r2_feedback: JSON.stringify({ round: 2, decision: 'REVISE', score: round === 2 ? 70 : 0, medical_auditable: round === 2, patch_merge_decision: round === 2 ? 'PASS' : 'FAIL' }),
    r1_cited_evidence: JSON.stringify(records), r2_cited_evidence: JSON.stringify(records.map(r => ({ ...r, snippet: r.snippet + '第二轮' }))) };
}
function makePool(envelope) { return run(outer, '15题候选池拼接', { group1: JSON.stringify(envelope), group2: '', group3: '', case_packet: {} }).candidate_pool; }
test('R1回退带R1的65分及原文；保留R2运行0分但不绑定给旧题', () => {
  const env = JSON.parse(run(inner, '最终发布状态归一', envelopeArgs(1)).publication_payload_json);
  assert.equal(env.selected_candidate_round, 1); assert.equal(env.validation_score, 0);
  const pool = makePool(env);
  assert.equal(pool.candidate_count, 5); assert.equal(pool.groups[0].audit.score, 65); assert.equal(pool.groups[0].run_audit.score, 0);
  assert(pool.candidates.every(c => c.evidence_status === 'located')); assert.equal(pool.evidence_records.length, 5);
  assert(pool.evidence_records.every(r => !r.snippet.includes('第二轮')));
  assert.equal(pool.candidates[0].source_question_audit.passed, false);
});
test('R2返回绑定R2原文；同定位不同片段冲突不静默选择；无匹配不借用其他题原文', () => {
  const env = JSON.parse(run(inner, '最终发布状态归一', envelopeArgs(2)).publication_payload_json);
  let pool = makePool(env);
  assert.equal(pool.groups[0].audit.score, 70); assert(pool.evidence_records.every(r => r.snippet.includes('第二轮')));
  env.selected_evidence_context.records.push({ ...records[0], snippet: '同定位冲突的另一个版本' });
  pool = makePool(env); assert.equal(pool.candidates[0].evidence_status, 'ambiguous'); assert.equal(pool.candidates[0].evidence_key, null);
  env.selected_evidence_context.records = [];
  pool = makePool(env); assert(pool.candidates.every(c => c.evidence_status === 'not_found')); assert.equal(pool.candidate_count, 5);
  env.selected_evidence_context.round = 1;
  assert(makePool(env).candidates.every(c => c.evidence_status === 'not_provided'));
});
test('代码可编译、BOM根配置和节点连线不变，新增引用可定位；温度不变', () => {
  [inner, outer].forEach((w, index) => {
    const old = [oldInner, oldOuter][index];
    assert.deepEqual(w.edges, old.edges); assert.equal(w.nodes.length, old.nodes.length);
    assert.deepEqual(Object.keys(w), Object.keys(old));
    for (const k of Object.keys(w).filter(k => k !== 'nodes')) assert.deepEqual(w[k], old[k]);
    assert.equal(fs.readFileSync(paths[index]).subarray(0, 3).toString('hex'), 'efbbbf');
    for (const n of w.nodes) {
      const before = old.nodes.find(x => x.nodeId === n.nodeId); assert(before);
      assert.deepEqual(n.outputs, before.outputs);
      if (n.flowNodeType === 'code') new vm.Script(input(w, n.nodeId, 'code'));
      if (n.flowNodeType === 'appModule') assert.deepEqual(n, before);
      if (n.flowNodeType === 'chatNode') for (const k of ['temperature', 'model', 'maxToken', 'aiChatResponseFormat', 'isResponseAnswerText']) assert.deepEqual(n.inputs.find(i => i.key === k), before.inputs.find(i => i.key === k));
      for (const i of n.inputs) if (Array.isArray(i.value) && i.value.length === 2 && w.nodes.some(x => x.nodeId === i.value[0])) {
        assert(w.nodes.find(x => x.nodeId === i.value[0]).outputs.some(o => o.id === i.value[1] || o.key === i.value[1]), JSON.stringify(i.value));
      }
    }
  });
});

fs.writeFileSync('outputs/三病例-综合修复回归报告-v2-20260904.json', JSON.stringify({ passed: tests.length, tests,
  replayed: cases.map(c => ({ name: c.name, candidate_count: c.pool.candidate_count, selected_count: c.exported.final_data.question_count,
    cancer_type: c.exported.final_data.cancer_type, snippet_available_in_old_logs: c.pool.evidence_records.length > 0 })),
  scope: '本地真实日志回放及确定性代码/配置回归。没有调用千问重新生成，没有在线检索或FastGPT导入测试；不证明新题医学合格。' }, null, 2));
console.log(JSON.stringify({ passed: tests.length }));
