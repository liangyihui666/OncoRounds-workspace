const fs = require('fs');
function r(p) { let t = fs.readFileSync(p, 'utf8'); if (t.charCodeAt(0) === 0xfeff) t = t.slice(1); return JSON.parse(t); }

const file = 'C:/Users/admin/Documents/ChatGPT/大查房/病例资料预处理 AI（PDF兼容）.json';
const y = r(file);
const n = y.nodes.find(x => x.nodeId === 'glGeIMqOVaSRs5jF');
const p = n.inputs.find(i => i.key === 'systemPrompt');

function rep(oldStr, newStr, label) {
  const count = p.value.split(oldStr).length - 1;
  if (count !== 1) throw new Error(`[${label}] 期望1次，实际${count}次`);
  p.value = p.value.split(oldStr).join(newStr);
  console.log('OK', label);
}

// 1) 任务段：来源类型格式与固定输出格式对齐
rep(
  '输出时，在清洗结果第一行标注来源类型：HTML 输入标注【来源类型：html】；PDF 输入标注【来源类型：pdf】',
  '输出时，在清洗结果首段先输出【来源类型】项：HTML 输入填 html，PDF 输入填 pdf',
  '任务段-来源类型'
);

// 2) 固定输出格式：把【来源类型】补为第一个必填标题
rep(
  '只能输出以下标题和内容；不得输出 JSON、Markdown 代码块、分析过程或其他标题。\n\n【清洗状态】\n只能填写 clean、needs_review 或 blocked_sensitive。',
  '只能输出以下标题和内容；不得输出 JSON、Markdown 代码块、分析过程或其他标题。\n\n【来源类型】\n只能填写 html 或 pdf；HTML 解析文本填 html，PDF 抽取文本填 pdf。\n\n【清洗状态】\n只能填写 clean、needs_review 或 blocked_sensitive。',
  '固定输出格式-补【来源类型】'
);

// 3) 删除残留三反引号
rep(
  '均不属于本轮正式指南或临床研究证据。\n```\n\n【半角双引号清除硬规则】',
  '均不属于本轮正式指南或临床研究证据。\n\n【半角双引号清除硬规则】',
  '删除残留围栏'
);

fs.writeFileSync(file, JSON.stringify(y, null, 2), 'utf8');
console.log('\n已写回:', file);
