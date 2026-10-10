const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const vm = require('vm');
const load = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const read = p => fs.readFileSync(path.join(__dirname, p), 'utf8');
const input = (w, id, key) => {
  const item = w.nodes.find(n => n.nodeId === id)?.inputs.find(i => i.key === key);
  assert(item, id + '.' + key); return item;
};
function replaceOnce(s, from, to) {
  assert.equal(s.split(from).length, 2, 'Anchor must be unique: ' + from.slice(0, 80));
  return s.replace(from, () => to);
}
// Replace only modified node spans, retaining original root properties/BOM/edges.
function writeChanged(basePath, outputPath, workflow) {
  const raw = fs.readFileSync(basePath, 'utf8');
  const old = load(basePath);
  assert.equal(old.nodes.length, workflow.nodes.length);
  assert.deepEqual(old.edges, workflow.edges);
  const begin = /"nodes"\s*:\s*\[/.exec(raw); assert(begin);
  const spans = [];
  let start = -1, depth = 0, quoted = false, escaped = false;
  for (let i = begin.index + begin[0].length; i < raw.length; i++) {
    const c = raw[i];
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; continue; }
    if (c === '"') quoted = true;
    else if (c === '{') { if (!depth) start = i; depth++; }
    else if (c === '}' && --depth === 0) spans.push([start, i + 1]);
    else if (c === ']' && !depth) break;
  }
  assert.equal(spans.length, workflow.nodes.length);
  let result = raw;
  const changed = [];
  for (let i = spans.length - 1; i >= 0; i--) {
    const n = workflow.nodes[i];
    if (n.flowNodeType === 'code') new vm.Script(input(workflow, n.nodeId, 'code').value);
    if (JSON.stringify(n) === JSON.stringify(old.nodes[i])) continue;
    changed.unshift(n.name);
    result = result.slice(0, spans[i][0]) + JSON.stringify(n, null, 2) + result.slice(spans[i][1]);
  }
  assert.deepEqual(JSON.parse(result.replace(/^\uFEFF/, '')), workflow);
  fs.writeFileSync(outputPath, result, 'utf8');
  return { file: outputPath, changed, nodes: workflow.nodes.length, edges: workflow.edges.length };
}

const innerBase = 'outputs/题目生成-单一结果输出-病种检索修复-20260904.json';
const outerBase = 'outputs/三连-修复多JSON串流与错误归因-20260904.json';
const inner = load(innerBase), outer = load(outerBase);
const metrics = read('option_style_20260904.js');
const prompts = require('./option_style_prompts_20260904.cjs');
for (const [id, anchor, text] of [
  ['sR35QbYF2xamDQR3', '【选题与难度】', prompts.generation],
  ['v12RevisionGenerator', '【五、合并后的整组质量】', prompts.revision],
  ['x5dghEdUbp0QQg4T', '【评分与决策】', prompts.validation],
  ['v12ValidatorR2', '【评分与决策】', prompts.validation]
]) {
  const item = input(inner, id, 'systemPrompt');
  item.value = replaceOnce(item.value, anchor, text + '\n\n' + anchor);
}
for (const id of ['cmuTcUhJefVm2DC6', 'v12AssemblyR2']) {
  const item = input(inner, id, 'code');
  const anchor = '  const questions = Array.isArray(candidate.questions) ? candidate.questions : [];';
  item.value = metrics + '\n' + replaceOnce(item.value, anchor, anchor + `
  // Warning-only: the independent reviewer decides whether the wording leaks the answer.
  questions.forEach((q, index) => {
    const style = optionStyleMetrics(q);
    if (style && style.warnings.length) warnings.push(
      'OPTION_STYLE ' + (q.id || 'Q' + (index + 1)) +
      '：四项有效字符数=' + style.option_lengths.join('/') +
      '，正确项=' + style.answer_position + '；' + style.warnings.join(' ')
    );
  });`);
}
for (const [id, assembly] of [['aISFT5i9Sh2cffSo', 'cmuTcUhJefVm2DC6'], ['v12ValidationInputR2', 'v12AssemblyR2']]) {
  const item = input(inner, id, 'system_textareaInput');
  const warningOutput = inner.nodes.find(n => n.nodeId === assembly).outputs.find(o => o.key === 'structure_warnings');
  assert(warningOutput);
  item.value = replaceOnce(item.value, '【机械建议修订模式】',
    '【机械软提示：含选项表达线索，须结合当前文字复核】\n{{$' + assembly + '.' + warningOutput.id + '$}}\n\n【机械建议修订模式】');
}

const pool = input(outer, 'bJcPjyWI8hiwuVOS', 'code');
pool.value = metrics + '\n' + replaceOnce(pool.value, '        candidates.push(item);', `        item.option_style = optionStyleMetrics(q);
        if (item.option_style) item.warnings.push(...item.option_style.warnings);
        candidates.push(item);`);
const selector = input(outer, 'ltrYX3w0AXTIiF0r', 'systemPrompt');
selector.value = replaceOnce(selector.value, '三、题量及风险', prompts.selection + '\n\n三、题量及风险');
const exporter = input(outer, 'jKqMCN8eJKvkngnI', 'code');
exporter.value = metrics + '\n' + replaceOnce(exporter.value,
  '  const actualQuestionCount = questions.length;', `  prepared.report.option_style_checks = questions.map((q, index) => ({
    final_id: q.id, candidate_id: prepared.report.selected[index].candidate_id,
    ...optionStyleMetrics(q)
  }));
  for (const check of prepared.report.option_style_checks) {
    if (check.warnings.length) prepared.report.warnings.push(
      check.final_id + '（' + check.candidate_id + '）选项表达待复核：' +
      check.option_lengths.join('/') + '字；' + check.warnings.join(' ')
    );
  }
  const actualQuestionCount = questions.length;`);
// Narrow, reproducible metadata fix: a GEJ primary must not become lung cancer due to lung metastasis.
exporter.value = replaceOnce(exporter.value, '  const cancerType = diseaseText.includes("肺")',
  '  const cancerType = /^(?:胃食管(?:结合部|交界处|交界部)|GEJ\\b)/i.test(diseaseText)\n    ? "胃食管结合部癌"\n    : diseaseText.includes("肺")');

console.log(JSON.stringify([
  writeChanged(innerBase, 'outputs/题目生成-选项均衡与干扰项优化-20260904.json', inner),
  writeChanged(outerBase, 'outputs/三连-选项均衡终选-20260904.json', outer)
], null, 2));
