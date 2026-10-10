// Lexical indexes only: original evidence and case fields remain authoritative.
function evidenceScopeIndex(record) {
  const body=String(record?.raw_snippet||record?.snippet||'');
  const text=[record?.source_title,record?.source_section,body].filter(Boolean).join('\n');
  const terms=['新辅助','术后辅助','辅助治疗','复发','转移','维持治疗','乳腺MRI','乳腺 MRI','颅脑MRI','颅脑 MRI','脑转移','初次','再次','可考虑','必要时'];
  return {kind:'literal_terms_not_applicability_verdict',matched_terms:terms.filter(t=>text.includes(t)),
    has_footnote_markers:/[¹²³⁴⁵⁶⁷⁸⁹]|<sup\b/i.test(body),
    has_nonrandom_design_terms:/single.arm|单臂|回顾性|retrospective/i.test(text)};
}
function caseConstraintIndex(packet) {
  const rows=[];
  for(const field of ['case_context','case_timeline','biomarkers','adverse_events','evidence_notes']){
    if(typeof packet?.[field]!=='string')continue;
    for(const raw of packet[field].split(/\r?\n|(?<=[。！？])/)){
      if(/拒绝|不同意|不可及|可及性|获取.{0,25}受限|无法耐受|不能耐受|禁忌|未回报|未记载|未明确|分级不详|分级未|已接受|既往.{0,15}(?:放疗|手术)/.test(raw))rows.push({field,text:raw});
    }
  }
  return {scope:'literal_case_excerpts_not_new_facts',items:rows,instruction:'保留原时点、否定及范围；候选决策/点评不等于患者事实。无命中不表示无禁忌或无限制；上游未传入的原文事实无法由此恢复。'};
}
function sourceReviewTasks(q,record,packet) {
  const body=String(record?.raw_snippet||record?.snippet||'');
  const scope=evidenceScopeIndex(record);
  const reasons=q?.explain&&typeof q.explain==='object'?Object.values(q.explain):[q?.explain];
  const text=[q?.question,q?.phase,q?.timepoint,...(Array.isArray(q?.options)?q.options:[]),...reasons,q?.keyPoint,q?.evidence_summary].filter(s=>typeof s==='string').join('\n');
  const context=[packet?.disease,packet?.case_context,packet?.case_timeline].filter(s=>typeof s==='string').join('\n');
  const tasks=[];
  if(/新辅助|术后辅助/.test(body)&&/转移|复发|IV期|Ⅳ期|晚期/.test(text+'\n'+context))tasks.push({code:'PHASE_CONTEXT_REVIEW',detail:'引用含新辅助/术后辅助范围，病例含复发转移背景：逐题确认时点及治疗目的；不可将特定阶段频率泛化为全部系统治疗。'});
  if(/乳腺\s*MRI/i.test(body)&&/颅|脑转移|神经系统/.test(text+'\n'+context))tasks.push({code:'IMAGING_SITE_REVIEW',detail:'引用含乳腺MRI、题目或病例涉及颅脑：核对检查部位及频率，不省掉器官名称后移用。'});
  if(scope.has_footnote_markers)tasks.push({code:'FOOTNOTE_SCOPE_REVIEW',detail:'返回正文有脚注标记；先查同一记录是否含对应条件，不能仅凭表内列项认定人人必做。'});
  if(scope.has_nonrandom_design_terms&&/优于|更优|优效|显著|胜过/.test(text))tasks.push({code:'COMPARATIVE_CLAIM_REVIEW',detail:'记录含非随机/单臂设计词，检查组间数值描述是否被改为已证实优效；范围包括引用摘要。'});
  const identity=[record?.source_title,record?.source_section,body].filter(Boolean).join('\n').toUpperCase();
  const names=[...text.matchAll(/\b([A-Za-z][A-Za-z0-9-]{2,30}(?:\s+\d{1,5})?)\s*(?:研究|试验|trial\b|study\b)/gi)].map(m=>m[1].trim());
  for(const name of [...new Set(names)])if(!identity.includes(name.toUpperCase()))tasks.push({code:'UNBOUND_STUDY_NAME',name,detail:'该研究名在绑定记录中未作字面匹配；核对别名，不用记忆或另一片段补排除理由。'});
  if(/不可缺|必须.{0,10}(?:检测|参考)|缺一不可/.test(text)&&/标记物|分型|亚型/.test(text))tasks.push({code:'MARKER_NECESSITY_REVIEW',detail:'核对完整分型流程所需指标与本题具体亚型的判定条件，不能把常用指标清单当作每一亚型都必需。'});
  return {scope:'review_tasks_not_medical_verdict',record_found:!!record,evidence_scope:scope,tasks,
    action:'有命中须对照绑定全文核实；无命中仍检查每项。确实错配则整题更换，不能通过改写证据摘要扩大原文适用范围。'};
}
