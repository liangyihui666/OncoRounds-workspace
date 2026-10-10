const fs = require('fs');

function readJson(p) {
  let text = fs.readFileSync(p, 'utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return JSON.parse(text);
}

function edgeCheck(nodes, edges) {
  const ids = new Set(nodes.map(n => n.nodeId));
  const missing = [];
  for (const e of edges) {
    if (!ids.has(e.source)) missing.push('src:' + e.source);
    if (!ids.has(e.target)) missing.push('tgt:' + e.target);
  }
  return missing;
}

const chutiPath = 'C:/Users/admin/Downloads/肿瘤大查房小工具 (AI简化) (2).json';
const yuchuliPath = 'C:/Users/admin/Downloads/病例资料预处理 AI (4).json';

console.log('=== 出题工作流 ===');
let chuti;
try {
  chuti = readJson(chutiPath);
  console.log('JSON 解析: OK');
} catch (e) {
  console.log('JSON 解析失败:', e.message);
  process.exit(1);
}
console.log('name:', chuti.name, '| intro:', chuti.intro);
console.log('节点数:', chuti.nodes.length, '| edges:', chuti.edges.length);

const label = {
  'rfC50X90Ce6cGaIB': '指南检索A',
  'sB1igq1zFijP0xqL': '指南检索B',
  'k2eB90ICRuNwnMYm': '临床研究检索',
  'cmjDyjb1ro4mMLZq': 'irAE指南A',
  'tVs35q6nFPGaT2Zu': 'irAE指南B'
};
const expected = {
  'rfC50X90Ce6cGaIB': '{"type":["guideline"]}',
  'sB1igq1zFijP0xqL': '{"type":["guideline"]}',
  'k2eB90ICRuNwnMYm': '{"type":["meeting","journal"]}',
  'cmjDyjb1ro4mMLZq': '{"type":["guideline"]}',
  'tVs35q6nFPGaT2Zu': '{"type":["guideline"]}'
};

let toolCount = 0;
for (const n of chuti.nodes) {
  if (n.flowNodeType === 'tool') {
    toolCount++;
    const ext = n.inputs.find(i => i.key === 'extFilterJsonStr');
    const val = ext && ext.value;
    const want = expected[n.nodeId];
    const ok = want !== undefined && val === want;
    console.log(
      `[${ok ? 'OK' : 'CHECK'}] ${n.nodeId} (${label[n.nodeId] || n.name}): ` +
      `extFilterJsonStr=${JSON.stringify(val)}` +
      (want !== undefined ? ` | 期望=${JSON.stringify(want)}` : '')
    );
  }
}
console.log('工具节点数:', toolCount);

const miss = edgeCheck(chuti.nodes, chuti.edges);
console.log('edges 缺失节点:', miss.length ? JSON.stringify(miss) : '无');

// loop 关键节点检查
for (const n of chuti.nodes) {
  if (n.flowNodeType === 'loopRun') {
    const model = null;
    console.log('循环节点:', n.nodeId, 'mode=', (n.inputs.find(i=>i.key==='loopRunMode')||{}).value);
  }
}
// 校验结果提取 是否 code 节点
const codeNode = chuti.nodes.find(n => n.nodeId === 'eF90OlDyhu9tK2w5');
console.log('校验结果提取 flowNodeType:', codeNode ? codeNode.flowNodeType : 'NOT FOUND', '| parentNodeId:', codeNode ? codeNode.parentNodeId : '-');

console.log('\n=== 预处理工作流 ===');
let yuchuli;
try {
  yuchuli = readJson(yuchuliPath);
  console.log('JSON 解析: OK');
} catch (e) {
  console.log('JSON 解析失败:', e.message);
  process.exit(1);
}
console.log('name:', yuchuli.name, '| intro:', yuchuli.intro);
console.log('节点数:', yuchuli.nodes.length, '| edges:', yuchuli.edges.length);

for (const n of yuchuli.nodes) {
  if (n.flowNodeType === 'appModule') {
    console.log('appModule:', n.name, '| pluginId:', n.pluginId, '| version:', n.version);
    // 统计输入映射
    const mapped = n.inputs.filter(i => Array.isArray(i.value) && i.value.length === 2 && typeof i.value[0] === 'string');
    const fixed = n.inputs.filter(i => typeof i.value === 'string' && !['model'].includes(i.key));
    console.log('  引用映射输入数:', mapped.length, '| 固定值输入数:', fixed.length);
    console.log('  引用映射键:', mapped.map(i => i.label).join(', '));
  }
  if (n.flowNodeType === 'code') {
    console.log('  code节点:', n.nodeId, n.name, '| parentNodeId:', n.parentNodeId || '-');
  }
}

const ymiss = edgeCheck(yuchuli.nodes, yuchuli.edges);
console.log('edges 缺失节点:', ymiss.length ? JSON.stringify(ymiss) : '无');
