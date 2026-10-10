const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const vm = require('vm');
const read = p => fs.readFileSync(path.join(__dirname, p), 'utf8');
const load = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const change = (s, before, after) => { assert.equal(s.split(before).length, 2, before.slice(0,80)); return s.replace(before, () => after); };
const find = (w, id) => { const n = w.nodes.find(n => n.nodeId === id); assert(n, id); return n; };
const inp = (n, key) => { const i = n.inputs.find(i => i.key === key); assert(i, n.name + '.' + key); return i; };
function writeChanged(basePath, outputPath, workflow) {
  const text = fs.readFileSync(basePath, 'utf8');
  const old = JSON.parse(text.replace(/^\uFEFF/, ''));
  assert.equal(old.nodes.length, workflow.nodes.length); assert.deepEqual(old.edges, workflow.edges);
  const begin = /"nodes"\s*:\s*\[/.exec(text); assert(begin);
  let start = -1, depth = 0, quoted = false, escaped = false;
  const spans = [];
  for (let i = begin.index + begin[0].length; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; continue; }
    if (c === '"') quoted = true;
    else if (c === '{') { if (!depth) start = i; depth++; }
    else if (c === '}' && --depth === 0) spans.push([start,i+1]);
    else if (c === ']' && !depth) break;
  }
  assert.equal(spans.length, old.nodes.length);
  let result = text;
  const changed = [];
  for (let i = spans.length - 1; i >= 0; i--) {
    const n = workflow.nodes[i];
    if (n.flowNodeType === 'code') new vm.Script(inp(n, 'code').value);
    if (JSON.stringify(n) === JSON.stringify(old.nodes[i])) continue;
    changed.unshift(n.name);
    result = result.slice(0, spans[i][0]) + JSON.stringify(n, null, 2) + result.slice(spans[i][1]);
  }
  assert.deepEqual(JSON.parse(result.replace(/^\uFEFF/, '')), workflow);
  fs.writeFileSync(outputPath, result, 'utf8');
  return { file: outputPath, nodes: workflow.nodes.length, edges: workflow.edges.length, changed };
}

const outerBase = 'outputs/三连-分工生成-按题号终选-质量优化-20260904.json';
const outer = load(outerBase);
const poolNode = find(outer, 'bJcPjyWI8hiwuVOS');
let pool = inp(poolNode, 'code').value;
pool = change(pool, '      const envelope = object(raw);\n      const hasEnvelope = Object.prototype.hasOwnProperty.call(envelope, "final_response_json");\n      const root = hasEnvelope ? object(envelope.final_response_json) : envelope;', `      const reply = readFinalReply(raw);
      const { envelope, root, isEnvelope: hasEnvelope } = reply;
      info.transport = reply.diagnostics;
      const returnedCaseId = envelope.case_id || root.case_id;
      if (returnedCaseId && caseData.case_id && returnedCaseId !== caseData.case_id) {
        const error = new Error('返回结果case_id与当前病例不一致，禁止混入其他病例题目。');
        error.code = 'CASE_MISMATCH'; throw error;
      }
      info.upstream_missing_information = [...new Set([
        ...(Array.isArray(root.missing_information) ? root.missing_information : []),
        ...reply.diagnostics.upstream_messages,
        ...(Array.isArray(envelope.upstream_diagnostics) ? envelope.upstream_diagnostics.flatMap(d => Array.isArray(d.missing_information) ? d.missing_information : []) : [])
      ].filter(v => typeof v === 'string' && v.trim()))].slice(0, 12);
      if (!hasEnvelope && reply.legacy_audit) {
        info.audit = { availability: 'provided', origin: 'legacy_intermediate_log',
          decision: reply.legacy_audit.decision, score: reply.legacy_audit.score,
          scope: 'group_run; returned_question_binding_not_confirmed',
          returned_candidate_binding: false, fatal_errors: reply.legacy_audit.fatal_errors || [],
          question_checks: reply.legacy_audit.question_checks || [] };
      }`);
pool = change(pool, '          info.audit = audit;', `          audit.returned_candidate_binding = envelope.audit_applies_to_selected_candidate === true;
          audit.selected_candidate_round = envelope.selected_candidate_round ?? null;
          if (audit.returned_candidate_binding) audit.scope = 'upstream_declares_review_bound_to_returned_candidate';
          info.audit = audit;`);
pool = change(pool, '      info.error = String(e.message || e);', `      info.error = String(e.message || e);
      info.error_code = e.code || 'REPLY_PARSE_ERROR';
      if (e.diagnostics) {
        info.transport = e.diagnostics;
        info.upstream_missing_information = e.diagnostics.upstream_messages || [];
      }`);
inp(poolNode, 'code').value = read('triple_reply_reader_20260904.js') + '\n' + pool;

const exporter = find(outer, 'jKqMCN8eJKvkngnI');
let exportCode = inp(exporter, 'code').value;
let prep = read('triple_selection_prepare_20260904.js');
const start = prep.indexOf('  if (pool.candidates.length < 5) {');
const end = prep.indexOf('  let selection;', start);
assert(start >= 0 && end > start);
let newPrep = prep.slice(0, start) + read('selection_failure_diagnostics_20260904.js') + '\n' + prep.slice(end);
newPrep = change(newPrep, '  const report = {', `  if (pool.case_packet?.case_id && case_id && pool.case_packet.case_id !== case_id) {
    throw new Error('CASE_MISMATCH：候选池与导出病例ID不同。');
  }
  const report = {`);
newPrep = change(newPrep, ' + "；该审核尚未与返回题逐题绑定。");', ` + (g.audit.returned_candidate_binding === true ? '；上游声明审核对应返回题，仍须核对真实结论。' : '；该审核尚未与返回题逐题绑定。'));`);
exportCode = change(exportCode, prep, newPrep);
inp(exporter, 'code').value = exportCode;
// Only the terminal answer node should enter the user-visible aggregate response.
for (const n of outer.nodes.filter(n => n.flowNodeType === 'chatNode')) inp(n,'isResponseAnswerText').value = false;

const innerBase = 'outputs/题目生成-质量优化-二轮修订强化-20260904.json';
const inner = load(innerBase);
for (const n of inner.nodes.filter(n => n.flowNodeType === 'chatNode')) inp(n,'isResponseAnswerText').value = false;
const templates = require('./disease_retrieval_templates_20260904.cjs');
for (const [id, text] of Object.entries(templates.queries)) inp(find(inner,id), 'system_textareaInput').value = text;
for (const [id, text] of Object.entries(templates.rerankers)) inp(find(inner,id), 'rerankInstruct').value = text;
const final = find(inner,'v12FinalPublicationNormalize');
inp(final,'code').value = change(inp(final,'code').value, 'function main({', 'function normalizePublication({') + '\n' + read('publication_envelope_20260904.js');
const ref = final.inputs.find(i => i.key === 'r1_candidate');
for (const [key, globalId] of [['case_id','txotSJIc'],['case_title','uyW4KCjj'],['disease','cHvnHqgH']]) {
  final.inputs.push({ ...structuredClone(ref), key, label: key, required: false, value: ['VARIABLE_NODE_ID', globalId] });
}
final.outputs.push({ id: 'v26PublicationEnvelope', key: 'publication_payload_json', label: 'publication_payload_json', type: 'dynamic', valueType: 'string', valueDesc: '', description: '唯一对外结果包，包含最终题目和真实审核信息' });
for (const n of inner.nodes.filter(n => n.flowNodeType === 'answerNode')) inp(n,'text').value = [final.nodeId,'v26PublicationEnvelope'];

const reports = [
  writeChanged(outerBase, 'outputs/三连-修复多JSON串流与错误归因-20260904.json', outer),
  writeChanged(innerBase, 'outputs/题目生成-单一结果输出-病种检索修复-20260904.json', inner)
];
console.log(JSON.stringify(reports, null, 2));
