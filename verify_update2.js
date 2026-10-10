const fs = require('fs');

function readJson(p) {
  let text = fs.readFileSync(p, 'utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return JSON.parse(text);
}

const yuchuli = readJson('C:/Users/admin/Downloads/病例资料预处理 AI (4).json');

console.log('=== 预处理 (4) 全部节点 ===');
for (const n of yuchuli.nodes) {
  console.log(`- ${n.nodeId}\t${n.flowNodeType}\t${n.name}` + (n.parentNodeId ? `\t(parent=${n.parentNodeId})` : ''));
}

console.log('\n=== appModule 完整输入 ===');
const app = yuchuli.nodes.find(n => n.flowNodeType === 'appModule');
if (!app) {
  console.log('未找到 appModule');
  process.exit(1);
}
console.log('nodeId:', app.nodeId, '| name:', app.name, '| pluginId:', app.pluginId, '| version:', JSON.stringify(app.version));
for (const inp of app.inputs) {
  if (inp.key === 'system_forbid_stream' || inp.key === 'history') continue;
  let v = inp.value;
  let vs = '';
  if (Array.isArray(v)) {
    vs = JSON.stringify(v);
  } else if (typeof v === 'string') {
    vs = v.length > 60 ? v.slice(0, 60) + '…(' + v.length + '字)' : v;
  } else {
    vs = JSON.stringify(v);
  }
  console.log(`  key=${inp.key}\tlabel=${inp.label}\ttype=${inp.valueType}\trequired=${inp.required}\tvalue=${vs}`);
}

console.log('\n=== 代码运行(ogy1PAMdD268kXeo)输出 ===');
const codeRun = yuchuli.nodes.find(n => n.nodeId === 'ogy1PAMdD268kXeo');
if (codeRun) {
  for (const o of codeRun.outputs) {
    if (o.id === 'system_rawResponse' || o.id === 'error' || o.id === 'system_addOutputParam') continue;
    console.log(`  ${o.id}\t${o.key}\t${o.valueType}`);
  }
}
