const fs = require('fs');
function r(p) { let t = fs.readFileSync(p, 'utf8'); if (t.charCodeAt(0) === 0xfeff) t = t.slice(1); return JSON.parse(t); }

const file = 'C:/Users/admin/Documents/ChatGPT/大查房/病例资料预处理 AI（PDF兼容）.json';
const y = r(file);
const p = y.nodes.find(x => x.nodeId === 't7eXTzfAM2QUzvvK').inputs.find(i => i.key === 'systemPrompt');

const reps = [
  {
    label: 'case_timeline-补鉴别诊断线索',
    old: 'case_timeline：按时间先后逐行记录患者正文中的检查、病理、治疗、疗效、不良反应和处理。',
    neu: 'case_timeline：按时间先后逐行记录患者正文中的检查、病理、治疗、疗效、不良反应和处理。影像、病理、基因等检查中的鉴别诊断线索必须逐条记录，包括原文明确写出的良性或非恶性结论（如“考虑慢性炎症肉芽肿”“符合肺癌并肺炎”），不得省略，也不得写入 evidence_notes。'
  },
  {
    label: 'evidence_notes-收紧为纯证据备注',
    old: 'evidence_notes：只记录来源限制、患者正文内部真实冲突和患者正文明确的不详/暂未复查/待排。不得记录导语或专家与正文之间的差异，不得把 SD 与长期 PFS 写成冲突。每个日期单独成条，只写该日期原文明确写出的结论；禁止把某日期的结论延伸到其他日期，禁止跨日期合并同类结论（例如不得把 2023 年 5 月的“符合肺癌并肺炎”写成“2023 年 5 月及 2024 年 2 月均提示符合肺癌并肺炎”）。',
    neu: 'evidence_notes：仅记录来源限制、患者正文内部真实冲突和患者正文明确的不详/暂未复查/待排。影像、检查、病理、基因、疗效等结论性内容（如“CT 提示符合肺癌并肺炎”“右肺下叶结节考虑肉芽肿”）一律不得写入 evidence_notes，必须写入 case_timeline。不得记录导语或专家与正文之间的差异，不得把 SD 与长期 PFS 写成冲突。'
  },
  {
    label: 'missing_information-去evidence_notes',
    old: '应保持原始确定性放入 case_timeline、patient_facts 或 evidence_notes。',
    neu: '应保持原始确定性放入 case_timeline 或 patient_facts。'
  },
  {
    label: '症状归属-去evidence_notes',
    old: '应保留在 case_timeline 或 evidence_notes。',
    neu: '应保留在 case_timeline。'
  },
  {
    label: '来源边界校验-对齐',
    old: '1. evidence_notes 只能记录【患者病例正文】及【冲突与不确定项】中允许进入患者事实的不确定内容。',
    neu: '1. evidence_notes 只能记录来源限制、患者正文内部真实冲突和患者正文明确的不详/待排/暂未复查；影像、检查、病理、疗效等结论性内容不得写入 evidence_notes。'
  }
];

for (const rep of reps) {
  const count = p.value.split(rep.old).length - 1;
  if (count !== 1) throw new Error(`[${rep.label}] 匹配次数=${count}`);
  p.value = p.value.split(rep.old).join(rep.neu);
  console.log('OK', rep.label);
}

fs.writeFileSync(file, JSON.stringify(y, null, 2), 'utf8');
console.log('\n已写回:', file);
