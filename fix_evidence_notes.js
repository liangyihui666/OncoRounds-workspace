const fs = require('fs');
function r(p) { let t = fs.readFileSync(p, 'utf8'); if (t.charCodeAt(0) === 0xfeff) t = t.slice(1); return JSON.parse(t); }

const file = 'C:/Users/admin/Documents/ChatGPT/大查房/病例资料预处理 AI（PDF兼容）.json';
const y = r(file);
const p = y.nodes.find(x => x.nodeId === 't7eXTzfAM2QUzvvK').inputs.find(i => i.key === 'systemPrompt');

const old = 'evidence_notes：只记录来源限制、患者正文内部真实冲突和患者正文明确的不详/暂未复查/待排。不得记录导语或专家与正文之间的差异，不得把 SD 与长期 PFS 写成冲突。';
const neu = 'evidence_notes：只记录来源限制、患者正文内部真实冲突和患者正文明确的不详/暂未复查/待排。不得记录导语或专家与正文之间的差异，不得把 SD 与长期 PFS 写成冲突。每个日期单独成条，只写该日期原文明确写出的结论；禁止把某日期的结论延伸到其他日期，禁止跨日期合并同类结论（例如不得把 2023 年 5 月的“符合肺癌并肺炎”写成“2023 年 5 月及 2024 年 2 月均提示符合肺癌并肺炎”）。';

const count = p.value.split(old).length - 1;
if (count !== 1) throw new Error('evidence_notes 定义匹配次数=' + count);
p.value = p.value.split(old).join(neu);
fs.writeFileSync(file, JSON.stringify(y, null, 2), 'utf8');
console.log('OK 已加 evidence_notes 跨日期禁合并规则');
console.log('写入:', file);
