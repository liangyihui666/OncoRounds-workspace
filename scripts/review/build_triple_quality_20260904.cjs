const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const basePath = path.resolve('outputs/三连-终选必出5题-答案自动均衡.json');
const outputPath = path.resolve('outputs/三连-分工生成-按题号终选-质量优化-20260904.json');
const baseText = fs.readFileSync(basePath, 'utf8');
const original = JSON.parse(baseText.replace(/^\uFEFF/, ''));
const workflow = structuredClone(original);
const node = name => { const n = workflow.nodes.find(n => n.name === name); assert(n, name); return n; };
const input = (n, k) => { const i = n.inputs.find(i => i.key === k); assert(i, `${n.name}.${k}`); return i; };
const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
const replaceOnce = (s, old, next) => { assert.equal(s.split(old).length, 2, 'replace target must be unique: ' + old.slice(0, 70)); return s.replace(old, () => next); };
const dynamicOutput = (key, id, valueType) => ({ id, key, type: 'dynamic', valueType, valueDesc: '', label: key, description: '' });
const mapper = node('代码运行');
let mapperCode = input(mapper, 'code').value;
const focusCode = `  function focus(priority) {
    return [production_variables.learning_points,
      '【本次调用的教学侧重，不是新增病例事实】' + priority,
      '在病例事实与合格证据允许时优先覆盖该侧重；仍生成5个独立决策点，不能为了分工编造诊断、检查结果或治疗事件。若本方向证据不足，可以选择其他真实且有证据支持的决策。不改变原病例时间线，不把教学侧重当作检索证据或既成医嘱。'
    ].filter(Boolean).join('\\n');
  }
  return {
    production_variables,
    ...production_variables,
    learning_points_a: focus('初始诊断、临床分期、阴性取样解释、有限标本与分子诊断；避免多个题重复考查同一检测原则。'),
    learning_points_b: focus('实际系统治疗选择、疗效复评、围手术期评估和研究证据适用边界；避免只围绕同一研究DFS反复出题。'),
    learning_points_c: focus('病例已发生的随访或后续管理、多因素处理顺序及信息不全时的评估；若存在局部病灶，区分疑似、确诊及未提供全身状态，不能虚构寡进展。')
  };`;
mapperCode = replaceOnce(mapperCode, '  return {\n    production_variables,\n    ...production_variables\n  };', focusCode);
input(mapper, 'code').value = mapperCode;
['a','b','c'].forEach((s, i) => {
  mapper.outputs.push(dynamicOutput('learning_points_' + s, 'r26Focus' + s.toUpperCase(), 'string'));
  const call = node(['题目生成','题目生成#2','题目生成#3'][i]);
  input(call, 'yyhLw3hG').value = [mapper.nodeId, 'r26Focus' + s.toUpperCase()];
});

const codeTemplate = node('JSON格式修复');
const refTemplate = codeTemplate.inputs.find(i => i.key === 'raw_json');
function reference(key, valueType, value, required = true) {
  return { ...structuredClone(refTemplate), key, label: key, valueType, value, required };
}
const oldPool = node('15题候选池拼接');
const pool = structuredClone(codeTemplate);
pool.nodeId = oldPool.nodeId; pool.name = oldPool.name; pool.position = oldPool.position;
pool.inputs = pool.inputs.filter(i => ['system_addInputParam','codeType','code'].includes(i.key));
input(pool, 'code').value = read('triple_candidate_pool_20260904.js');
['题目生成','题目生成#2','题目生成#3'].forEach((name, i) => pool.inputs.push(reference('group' + (i + 1), 'string', [node(name).nodeId, 'answerText'])));
pool.inputs.push(reference('case_packet', 'object', [mapper.nodeId, 'eTM8oV']));
pool.outputs = pool.outputs.filter(o => ['system_rawResponse','error','system_addOutputParam'].includes(o.key));
pool.outputs.push(dynamicOutput('system_text','system_text','string'), dynamicOutput('candidate_pool','r26CandidatePool','object'));
workflow.nodes[workflow.nodes.findIndex(n => n.nodeId === pool.nodeId)] = pool;

const selector = node('千问15选5');
input(selector, 'systemPrompt').value = read('triple_selector_20260904.txt');
// 保留已在用户环境工作的温度、模型、响应模式和思考参数。
// 回复现在仅含ID，禁止模型再复制整个题集；不新增未经环境验证的JSON约束模式。

const exporter = node('json生成');
exporter.inputs.push(reference('candidate_pool', 'object', [pool.nodeId, 'r26CandidatePool']));
let code = input(exporter, 'code').value;
code = replaceOnce(code, '  agent_reply,', '  agent_reply,\n  candidate_pool,');
const prefixStart = code.indexOf('  const text = String(agent_reply');
const prefixEnd = code.indexOf('  const diseaseText = cleanText(disease);');
assert(prefixStart >= 0 && prefixEnd > prefixStart);
const prefix = `  const prepared = prepareSelection({ agent_reply, candidate_pool, case_id, disease, difficulty });
  if (prepared.stop) return prepared.stop;
  const source = prepared.source;
  const letters = ['A', 'B', 'C', 'D'];
  function cleanText(value) { return String(value ?? '').replace(/\\s+/g, ' ').trim(); }
  function displayText(value, maxLength) {
    const s = cleanText(value);
    return s.length > maxLength ? s.slice(0, maxLength).trim() + '……' : s;
  }

`;
code = code.slice(0, prefixStart) + prefix + code.slice(prefixEnd);
const qStart = code.indexOf('  const questions = source.questions.map(');
const qEnd = code.indexOf('  function isSafeRemoteUrl(value)');
assert(qStart >= 0 && qEnd > qStart);
code = code.slice(0, qStart) + read('triple_question_export_20260904.js') + '\n' + code.slice(qEnd);
code = replaceOnce(code, '  return {\n    final_data: finalData,', `  return {
    selection_report: prepared.report,
    selection_report_json: JSON.stringify(prepared.report, null, 2),
    quality_notice: [prepared.report.notice, ...prepared.report.warnings, ...prepared.report.selection_notes, prepared.report.model_risk_message].filter(Boolean).join('\\n'),
    final_data: finalData,`);
input(exporter, 'code').value = read('triple_selection_prepare_20260904.js') + '\n' + code;
exporter.outputs.push(dynamicOutput('selection_report','r26SelectionReport','object'), dynamicOutput('selection_report_json','r26SelectionReportJson','string'), dynamicOutput('quality_notice','r26QualityNotice','string'));
const answer = node('json输出');
const answerInput = answer.inputs.find(i => typeof i.value === 'string' && i.value.includes('【题目JSON】'));
assert(answerInput);
answerInput.value += '\n\n【筛选说明（不属于上述两个JSON文件）】\n{{$jKqMCN8eJKvkngnI.r26QualityNotice$}}';

assert.deepEqual(workflow.edges, original.edges);
assert.equal(workflow.nodes.length, original.nodes.length);
for (const n of workflow.nodes.filter(n => n.flowNodeType === 'code')) new vm.Script(input(n,'code').value);
// 只替换发生变化的节点原始JSON片段，保留顶层导出字段、数组形状与原始BOM。
function nodeSpans(s) {
  const start = /"nodes"\s*:\s*\[/.exec(s);
  assert(start);
  const spans = [];
  let depth = 0, quoted = false, escaped = false, begin = -1;
  for (let i = start.index + start[0].length; i < s.length; i++) {
    const ch = s[i];
    if (quoted) { if (escaped) escaped = false; else if (ch === '\\') escaped = true; else if (ch === '"') quoted = false; continue; }
    if (ch === '"') { quoted = true; continue; }
    if (ch === '{') { if (depth === 0) begin = i; depth++; }
    else if (ch === '}') { depth--; if (depth === 0) spans.push({ start: begin, end: i + 1 }); }
    else if (ch === ']' && depth === 0) break;
  }
  return spans;
}
let resultText = baseText;
const spans = nodeSpans(baseText);
assert.equal(spans.length, original.nodes.length);
const changed = [];
for (let i = spans.length - 1; i >= 0; i--) {
  if (JSON.stringify(workflow.nodes[i]) === JSON.stringify(original.nodes[i])) continue;
  changed.unshift(workflow.nodes[i].name);
  const span = spans[i];
  assert.deepEqual(JSON.parse(baseText.slice(span.start, span.end)), original.nodes[i]);
  resultText = resultText.slice(0, span.start) + JSON.stringify(workflow.nodes[i], null, 2) + resultText.slice(span.end);
}
assert.deepEqual(JSON.parse(resultText.replace(/^\uFEFF/, '')), workflow);
fs.writeFileSync(outputPath, resultText, 'utf8');
console.log(JSON.stringify({ outputPath, nodeCount: workflow.nodes.length, edgeCount: workflow.edges.length, changed }, null, 2));
