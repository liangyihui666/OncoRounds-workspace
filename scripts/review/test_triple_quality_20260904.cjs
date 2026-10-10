const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const load = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const workflow = load('outputs/三连-分工生成-按题号终选-质量优化-20260904.json');
const original = load('outputs/三连-终选必出5题-答案自动均衡.json');
const node = name => workflow.nodes.find(n => n.name === name);
const code = name => node(name).inputs.find(i => i.key === 'code').value;
const run = (name, args) => {
  const sandbox = { input: structuredClone(args), URL };
  vm.runInNewContext(code(name) + '\nresult = main(input);', sandbox, { timeout: 1500 });
  return JSON.parse(JSON.stringify(sandbox.result));
};
const records = ['c9e195b3-e854-4027-9a79-b295621bbdcf', '4c770301-b087-4596-8ecc-78431a4bf660', '07245810-b9fc-4b97-8f61-534131758565']
  .map(id => load('C:/Users/admin/.codex/attachments/' + id + '/pasted-text.txt'));
const roots = records.map(r => JSON.parse(r.final_response_json));
const caseArgs = { case_id: 'CASE-REGRESSION', case_title: '测试病例', disease: '肺癌', difficulty: '进阶', case_context: '原病例事实',
  case_timeline: '2023.08.31：初诊活检。', biomarkers: 'ALK阴性', learning_points: '教学点', decision_points: '决策',
  case_image_index: 'IMG1 | https://example.org/case.png | 2023.08.31 | 初诊原始图像' };
const tests = [];
function test(name, fn) { fn(); tests.push(name); console.log('PASS ' + name); }
const makePool = (groups, extra = {}) => run('15题候选池拼接', { group1: groups[0], group2: groups[1], group3: groups[2], case_packet: caseArgs, ...extra }).candidate_pool;
const fullPool = makePool(records.map(JSON.stringify));
const exportSelection = (pool, selected_ids, extra = {}) => run('json生成', { ...caseArgs, candidate_pool: pool,
  agent_reply: JSON.stringify({ selection_status: 'success', selected_ids, selection_notes: ['模拟选择，仅用于代码测试'], risk_message: '待复核' }), ...extra });
test('14节点14连线，原连线和所有子工作流ID不变', () => {
  assert.equal(workflow.nodes.length, 14); assert.equal(workflow.edges.length, 14); assert.deepEqual(workflow.edges, original.edges);
  for (const n of workflow.nodes.filter(n => n.flowNodeType === 'appModule')) {
    const old = original.nodes.find(o => o.nodeId === n.nodeId);
    const expected = structuredClone(old);
    expected.inputs.find(i => i.key === 'yyhLw3hG').value = n.inputs.find(i => i.key === 'yyhLw3hG').value;
    assert.deepEqual(n, expected);
  }
});
test('三次调用教学侧重不同；仍只有标题和疾病是业务必填', () => {
  const result = run('代码运行', { case_json: JSON.stringify({ case_title: '测试', disease: '肺癌' }) });
  assert.equal(result.learning_points, '');
  assert.equal(result.question_count, 5);
  assert.equal(new Set([result.learning_points_a, result.learning_points_b, result.learning_points_c]).size, 3);
  assert.equal(result.case_context, '');
  assert.deepEqual(Object.keys(result.production_variables), Object.keys(result).filter(k => !['production_variables','learning_points_a','learning_points_b','learning_points_c'].includes(k)));
  assert.throws(() => run('代码运行', { case_json: '{"case_title":"测试"}' }), /disease/);
});
test('所有代码编译通过；节点变量和模板引用可定位', () => {
  for (const n of workflow.nodes) {
    if (n.flowNodeType === 'code') new vm.Script(n.inputs.find(i => i.key === 'code').value);
    const check = (nid, oid) => {
      const target = workflow.nodes.find(x => x.nodeId === nid);
      assert(target, 'missing node ' + nid);
      assert(target.outputs.some(o => o.id === oid || o.key === oid), 'missing output ' + nid + '.' + oid);
    };
    function values(v) {
      if (Array.isArray(v)) {
        if (v.length === 2 && typeof v[0] === 'string' && workflow.nodes.some(x => x.nodeId === v[0]) && typeof v[1] === 'string') check(v[0], v[1]);
        else v.forEach(values);
      } else if (typeof v === 'string') {
        for (const m of v.matchAll(/\{\{\$([\w-]+)\.([\w-]+)\$\}\}/g)) check(m[1], m[2]);
      }
    }
    n.inputs.forEach(i => values(i.value));
  }
});
test('真实三组15道完整候选保留；审核REVISE 0/60/0不被改成PASS', () => {
  assert.equal(fullPool.candidate_count, 15);
  assert.deepEqual(fullPool.groups.map(g => g.audit.decision), ['REVISE','REVISE','REVISE']);
  assert.deepEqual(fullPool.groups.map(g => g.audit.score), [0,60,0]);
  assert.equal(fullPool.groups[0].audit.patch_merge_decision, 'FAIL');
  for (let g = 0; g < 3; g++) for (let q = 0; q < 5; q++) assert.deepEqual(fullPool.candidates[g * 5 + q].question, roots[g].questions[q]);
});
test('只传final_response_json时明确审核未知；支持JSON围栏及根schema_version在首位', () => {
  const pool = makePool(roots.map(r => '```json\n' + JSON.stringify(r) + '\n```'));
  assert.equal(pool.candidate_count, 15);
  assert(pool.groups.every(g => g.audit.availability === 'not_provided'));
  const out = exportSelection(pool, pool.candidates.slice(0,5).map(c => c.candidate_id));
  assert.equal(out.selection_report.medical_approval_confirmed, false);
  assert.match(out.quality_notice, /未提供独立审核信息/);
});
const allB = fullPool.candidates.filter(c => c.group_id === 'G2').map(c => c.candidate_id);
let result;
test('真实全B五题仍输出五题，自动均衡答案且正确内容不变', () => {
  result = exportSelection(fullPool, allB);
  assert.equal(result.final_data.question_count, 5);
  assert.equal(result.final_data.generation_status, 'success');
  assert(Math.max(...Object.values(result.selection_report.answer_distribution)) <= 2);
  assert(Object.values(result.selection_report.answer_distribution).every(n => n > 0));
  result.final_data.questions.forEach((q, i) => {
    const old = roots[1].questions[i];
    for (const k of ['type','phase','timepoint','question','answer_text','explain','keyPoint','guidelineRef']) assert.deepEqual(q[k], old[k]);
    assert.equal(q.options[q.answer], q.answer_text);
    assert.deepEqual(Object.values(q.options).sort(), [...old.options].sort());
  });
});
test('重排可复现；保留题目JSON与病例详情JSON两个独立格式及图片', () => {
  const again = exportSelection(fullPool, allB);
  assert.deepEqual(again, result);
  assert.equal(JSON.parse(result.final_json).schema_version, '1.0');
  assert.equal(JSON.parse(result.case_page_json).schema_version, '1.0');
  assert.equal(result.case_page_data.decision_point_count, 5);
  assert.equal(result.case_page_data.image.src, 'https://example.org/case.png');
  assert.equal(result.case_page_data.overview.tabs.find(t => t.id === 'timeline').timeline_items.length, 1);
});
test('不存在ID、重复ID、5道以上却insufficient，报终选契约错误而非证据不足', () => {
  assert.throws(() => exportSelection(fullPool, ['G9_Q1', ...allB.slice(1)]), /不存在/);
  assert.throws(() => exportSelection(fullPool, Array(5).fill(allB[0])), /5个不同/);
  assert.throws(() => exportSelection(fullPool, allB, { agent_reply: '{"selection_status":"insufficient","selected_ids":[]}' }), /5个不同/);
  assert.throws(() => exportSelection(fullPool, allB, { agent_reply: '{bad' }), /格式错误/);
});
test('实际不足5道才输出insufficient，数量与原因准确', () => {
  const root = { ...roots[0], questions: roots[0].questions.slice(0,4), question_count: 4 };
  const pool = makePool([JSON.stringify(root), '{"questions":[]}', '{"questions":[]}']);
  const out = exportSelection(pool, []);
  assert.equal(out.final_data.generation_status, 'insufficient');
  assert.match(out.final_data.missing_information[0], /仅4道/);
});
test('接收到的某组坏JSON不会吞掉另两组10题；不制造该组审核PASS', () => {
  const pool = makePool(['{bad', JSON.stringify(roots[1]), JSON.stringify(roots[2])]);
  assert.equal(pool.candidate_count, 10); assert.equal(pool.groups[0].parse_status, 'ERROR');
  assert.equal(exportSelection(pool, pool.candidates.slice(0,5).map(c => c.candidate_id)).final_data.question_count, 5);
});
test('位置相关选项保留原序，答案不均衡也不输出0题', () => {
  const pool = structuredClone(fullPool);
  for (const c of pool.candidates) c.question.explain += ' 选项B为本题答案。';
  const out = exportSelection(pool, allB);
  assert.equal(out.final_data.question_count, 5);
  assert(out.final_data.questions.every(q => q.answer === 'B'));
  assert.match(out.quality_notice, /为保护题意保留原选项顺序/);
  assert.equal(out.selection_report.answer_distribution.B, 5);
});
test('小数索引/答案错位/重复选项拒绝登记，不靠改答案凑题', () => {
  const root = structuredClone(roots[0]);
  root.questions[0].answer = 1.5;
  root.questions[1].answer_text = '错误答案文本';
  root.questions[2].options[0] = root.questions[2].options[1];
  const pool = makePool([JSON.stringify(root), JSON.stringify(roots[1]), JSON.stringify(roots[2])]);
  assert.equal(pool.candidate_count, 12);
  assert.equal(pool.groups[0].rejected_questions.length, 3);
});
test('只改8个目标节点，其余导出内容逐对象保持不变', () => {
  const allowed = ['代码运行','题目生成','题目生成#2','题目生成#3','15题候选池拼接','千问15选5','json生成','json输出'];
  workflow.nodes.forEach((n, i) => { if (!allowed.includes(n.name)) assert.deepEqual(n, original.nodes[i]); });
  for (const k of Object.keys(original).filter(k => k !== 'nodes')) assert.deepEqual(workflow[k], original[k]);
  assert.deepEqual(node('千问15选5').inputs.filter(i => i.key !== 'systemPrompt'), original.nodes.find(n => n.name === '千问15选5').inputs.filter(i => i.key !== 'systemPrompt'));
});
console.log(JSON.stringify({ passed: tests.length, tests }, null, 2));
