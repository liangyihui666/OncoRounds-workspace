const fs = require('fs');
function r(p) { let t = fs.readFileSync(p, 'utf8'); if (t.charCodeAt(0) === 0xfeff) t = t.slice(1); return JSON.parse(t); }

const file = 'C:/Users/admin/Documents/ChatGPT/大查房/病例资料预处理 AI（PDF兼容）.json';
const y = r(file);
const cp = y.nodes.find(x => x.nodeId === 'glGeIMqOVaSRs5jF').inputs.find(i => i.key === 'systemPrompt').value;

const fence = '```';
console.log('清洗prompt 含三反引号 ``` 的次数:', cp.split(fence).length - 1);
console.log('固定输出格式 含【来源类型】独立标题:', cp.includes('【来源类型】\n'));

const i = cp.indexOf('【七、固定输出格式】');
console.log('--- 固定输出格式段落(前600字) ---');
console.log(cp.slice(i, i + 600));

// 检查是否有 【来源类型】 作为标题（紧邻的标题列表）
console.log('\n--- 所有【XX】标题清单 ---');
const titles = cp.match(/【[^】]+】/g) || [];
const seen = new Set();
for (const t of titles) if (!seen.has(t)) { seen.add(t); console.log(t); }
