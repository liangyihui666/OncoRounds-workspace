const fs = require('fs');
function r(p) { let t = fs.readFileSync(p, 'utf8'); if (t.charCodeAt(0) === 0xfeff) t = t.slice(1); return JSON.parse(t); }

// ---- 校验 1: 预处理 ----
const y1 = r('C:/Users/admin/Documents/ChatGPT/大查房/病例资料预处理 AI（PDF兼容）.json');
const code = y1.nodes.find(x => x.nodeId === 'ogy1PAMdD268kXeo').inputs.find(i => i.key === 'code').value;
console.log('预处理 JSON OK | nodes:', y1.nodes.length, '| edges:', y1.edges.length);
console.log('含 stableCaseId:', code.includes('function stableCaseId'));
console.log('case_id 行:', code.split('\n').find(l => l.includes('case_id: data.case_id')));

// 提取并测试 stableCaseId（从 code 里抠出函数体独立执行）
const fnMatch = code.match(/function stableCaseId\(title\) \{[\s\S]*?\n  \}/);
if (fnMatch) {
  const fn = fnMatch[0];
  // 包一层返回，直接 eval 测试
  const testFn = `(function(){ ${fn}; return stableCaseId('BRAF V600E 突变晚期肺腺癌四线双靶治疗获 PR 病例'); })()`;
  const id1 = eval(testFn);
  const id2 = eval(`(function(){ ${fn}; return stableCaseId('BRAF V600E 突变晚期肺腺癌四线双靶治疗获 PR 病例'); })()`);
  console.log('stableCaseId 测试:', id1, '| 稳定性(两次一致):', id1 === id2, '| 空标题:', eval(`(function(){ ${fn}; return JSON.stringify(stableCaseId('')); })()`));
}

// ---- 校验 2: 出题 ----
const y2 = r('C:/Users/admin/Documents/ChatGPT/大查房/肿瘤大查房小工具-AI简化-修复版.json');
console.log('\n出题 JSON OK | nodes:', y2.nodes.length, '| edges:', y2.edges.length);
const gate = y2.nodes.find(x => x.nodeId === 'y7hobl15QGtO2iLI').inputs.find(i => i.key === 'systemPrompt').value;
console.log('门禁含规则10:', gate.includes('同一具体不良事件（如某次骨髓抑制）或同一具体决策点'));
console.log('门禁含规则11:', gate.includes('规划时优先覆盖病例重点考查方向中尚未覆盖的维度'));
const gen = y2.nodes.find(x => x.nodeId === 'sR35QbYF2xamDQR3').inputs.find(i => i.key === 'systemPrompt').value;
console.log('题目生成含时间语境:', gen.includes('尚未获批该适应证或尚未上市'));

// edges 完整性检查
function edgeCheck(y) {
  const ids = new Set(y.nodes.map(n => n.nodeId));
  const miss = [];
  for (const e of y.edges) { if (!ids.has(e.source)) miss.push('s:' + e.source); if (!ids.has(e.target)) miss.push('t:' + e.target); }
  return miss;
}
console.log('预处理 edges 缺失:', JSON.stringify(edgeCheck(y1)));
console.log('出题 edges 缺失:', JSON.stringify(edgeCheck(y2)));
