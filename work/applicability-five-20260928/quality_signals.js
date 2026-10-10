// Text signals for the existing second model, not an automatic medical verdict.
function questionQualitySignals(q, record) {
  const reasons=q&&q.explain&&typeof q.explain==='object'&&!Array.isArray(q.explain)?Object.values(q.explain):[q&&q.explain];
  const stem=typeof q?.question==='string'?q.question:'';
  const text=[stem,...(Array.isArray(q?.options)?q.options:Object.values(q?.options||{})),...reasons,q?.keyPoint,q?.evidence_summary].filter(x=>typeof x==='string').join('\n');
  const errors=[],cues=[];
  const ids=[...new Set(text.match(/\b(?:GA|GB|GS|CS|IR)\d{1,3}\b/g)||[])];
  if(ids.length)errors.push('学员可见正文或证据摘要含内部证据编号：'+ids.join('、')+'；须改写成自足理由，不得拼接其他记录');
  if(!stem.startsWith('【延伸情境】') && /(?:^|[。！？；：，])\s*(?:假设(?!检验|检定)|若后续)/.test(stem))errors.push('题干明确引入假设但未标【延伸情境】；添加标记后计入最多2题');
  if(/未记载|未提供|未明确|不确定|不详/.test(text))cues.push('UNKNOWN_CONDITION：逐项区分未知与已确认；不得将分级不详变成轻度、已控制或满足停药/手术条件。');
  if(/反推|未(?:提及|推荐|要求|规定|否定)|无.{0,5}记载/.test(text))cues.push('ABSENCE_OR_REVERSE_INFERENCE：某亚组结果、条款未提及或未禁止不能独自证明相反结论或排除竞争方案。');
  if(/必须|所有|永久|仅适用|完全符合/.test(text))cues.push('UNCONDITIONAL_RULE：检查原文限定人群、阶段、前提；列表不能自动变成所有患者必做，停药须满足等级及具体条件。');
  if(/再次|再发|复发|反复/.test(stem)&&/腹泻|皮疹|毒性|过敏/.test(text))cues.push('RECURRENT_TOXICITY：核实首次/再次事件及责任药物；未知前次等级不能默认本次为首次。');
  if(/TMP[-‐‑–]?SMX|磺胺|抗生素|抗菌药|甲氧苄啶/.test(text)&&/抗肿瘤药/.test(text))cues.push('DRUG_CLASS_CHECK：题目同时出现抗菌药和抗肿瘤药；核实处置条款真正针对哪类药，不可转移不停药例外。');
  const source=[record?.source_title,record?.source_section,record?.snippet].filter(s=>typeof s==='string').join('\n');
  if(/免疫检查点|免疫相关/.test(source)&&/卡匹色替|Alpelisib|AKT抑制|PI3K抑制|化疗|抗生素/i.test(text))cues.push('TOXICITY_SCOPE_CHECK：本题引用含ICI毒性内容；确认致病药物与条款一致，不能因同名皮疹或同在肿瘤患者中发生而套用。');
  if(/新辅助|术后辅助|III期|Ⅲ期/.test(source)&&/转移|复发|IV期|Ⅳ期|转化|pCR/.test(stem))cues.push('TREATMENT_PHASE_CHECK：原文出现新辅助/术后/III期，题干涉及复发、转移、转化或pCR；回查实际初始分期及前序治疗，区分适用性题与直接外推推荐。');
  if(/感染|出血|溃疡/.test(stem)&&/化疗|强化|联合|靶向|手术/.test(text))cues.push('ACTIVE_COMPLICATION_CHECK：一般治疗强度分层不等于活动性感染或出血情境的用药许可，先核实控制状态与责任药风险。');
  return {format_errors:errors,review_cues:cues};
}
