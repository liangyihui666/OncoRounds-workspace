const fs = require('fs');
function r(p) { let t = fs.readFileSync(p, 'utf8'); if (t.charCodeAt(0) === 0xfeff) t = t.slice(1); return JSON.parse(t); }
function w(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); }
function editStr(s, oldStr, neuStr, label) {
  const count = s.split(oldStr).length - 1;
  if (count !== 1) throw new Error(`[${label}] 匹配 ${count} 次（应为1）`);
  return s.split(oldStr).join(neuStr);
}

// ========== Fix A：预处理 case_id 稳定哈希 ==========
const f1 = 'C:/Users/admin/Documents/ChatGPT/大查房/病例资料预处理 AI（PDF兼容）.json';
const y1 = r(f1);
const codeInput = y1.nodes.find(x => x.nodeId === 'ogy1PAMdD268kXeo').inputs.find(i => i.key === 'code');

const OLD_A = `  const production_variables = {
    case_id: data.case_id || "",`;
const NEW_A = `  function stableCaseId(title) {
    const s = String(title || "").trim();
    if (!s) return "";
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    }
    return "CASE-" + h.toString(16).toUpperCase();
  }

  const production_variables = {
    case_id: data.case_id || stableCaseId(data.case_title),`;

codeInput.value = editStr(codeInput.value, OLD_A, NEW_A, 'FixA-case_id');
w(f1, y1);
console.log('OK [FixA] 预处理 case_id 稳定哈希');

// ========== Fix B + C：出题工作流 ==========
const f2 = 'C:/Users/admin/Documents/ChatGPT/大查房/肿瘤大查房小工具-AI简化-修复版.json';
const y2 = r(f2);

// Fix B：门禁 弹性题量合同 追加规则 10、11
const gateInput = y2.nodes.find(x => x.nodeId === 'y7hobl15QGtO2iLI').inputs.find(i => i.key === 'systemPrompt');
const OLD_B = `9. 进阶题应整合至少3项决策因素，或考查适用性、动态管理、获益风险、并存问题优先级。`;
const NEW_B = `9. 进阶题应整合至少3项决策因素，或考查适用性、动态管理、获益风险、并存问题优先级。
10. 同一具体不良事件（如某次骨髓抑制）或同一具体决策点（如某线改用某药）最多规划 1 题，不得围绕同一事件从不同角度重复出题（例如不得既问“分级处理”又问“保护性隔离”又问“促血小板药停药”）。
11. 规划时优先覆盖病例重点考查方向中尚未覆盖的维度，尤其诊断与鉴别诊断（对应“诊断与分期”或“分子诊断”类）；全程管理病例尽量覆盖不同 phase，不得把多数题目集中在同一治疗线或同一不良反应。`;

gateInput.value = editStr(gateInput.value, OLD_B, NEW_B, 'FixB-门禁约束');

// Fix C：题目生成 时间语境
const genInput = y2.nodes.find(x => x.nodeId === 'sR35QbYF2xamDQR3').inputs.find(i => i.key === 'systemPrompt');
const OLD_C = `- 指南发布时间晚于病例决策时，应表述为当前教学复盘，不得声称是当时团队的实际依据。`;
const NEW_C = `- 指南发布时间晚于病例决策时，应表述为当前教学复盘，不得声称是当时团队的实际依据。
- 若某药物/方案在病例决策时间点尚未获批该适应证或尚未上市（决策时间早于批准/推荐时间），不得默认当时已可执行该方案，也不得把现行推荐写成当时团队的实际依据；应在题干或 explain 中明确区分“当时尚未获批/不可及”与“当前教学复盘依据现行规范”两层语境。`;

genInput.value = editStr(genInput.value, OLD_C, NEW_C, 'FixC-时间语境');

w(f2, y2);
console.log('OK [FixB] 门禁 同一事件最多1题 + 诊断鉴别优先覆盖');
console.log('OK [FixC] 题目生成 时间语境');
console.log('\n全部写入完成');
