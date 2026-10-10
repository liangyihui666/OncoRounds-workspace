// This is a review worksheet, not a computed medical judgment.
function buildOptionReview(q) {
  const options=Array.isArray(q?.options)?q.options:[];
  const explain=q?.explain;
  const rows=typeof explain==='string'?explain.split(/\r?\n/):[];
  return ['A','B','C','D'].map((letter,index)=>{
    const row=rows.find(s=>new RegExp('^'+letter+'[｜|:：.、]').test(s.trim()));
    return {option:letter,text:options[index]??'',draft_selected:q?.answer===index,
      draft_reason:explain&&typeof explain==='object'&&!Array.isArray(explain)?(explain[letter]??''):(row??''),
      review_required:'对照本题条件及同一完整记录，核对成立/不成立的依据与限定词；未提及或不优先不能充当错误理由；解析须解释本选项全部措施'};
  });
}
function buildSetReview(questions) {
  const text=q=>[q?.question,...(Array.isArray(q?.options)?q.options:[]),q?.keyPoint].filter(s=>typeof s==='string').join('\n');
  const cues=questions.map(q=>{
    const t=text(q),c=[];
    if(/MDT|多学科|完善.{0,8}检查|分期|随访/i.test(t))c.push('DEPTH_REVIEW：核对是否仅考一般流程或分期记忆；有关键词不等于不合格');
    if(/ADC|抗体.{0,3}偶联|RC48|维迪西妥|德曲妥|戈沙妥/i.test(t))c.push('CLASS_TO_AGENT_REVIEW：核对完整原文是否支持此具体药物及场景，不以类别推荐替代');
    if(/\b(?:[cpy]{0,2}T\d|[cpy]{0,2}N\d)|分期|期别/i.test(t))c.push('STAGING_SOURCE_REVIEW：核对癌种、版本、c/p/yp及完整分期条款，包括错误项解析');
    return {id:q?.id,phase:q?.phase,timepoint:q?.timepoint,question:q?.question,keyPoint:q?.keyPoint,evidence_id:q?.evidence_id,review_cues:c};
  });
  return {scope:'review_tasks_not_medical_verdict',questions:cues,
    instruction:'逐题归纳真正需要作出的决策，比较五题是否重复；同一判断即可解两题时保留较好者并换写另一题。至少2题优先覆盖病例核心问题；一般MDT、完善检查不能静默代替独特决策。关键词线索不作为删题或医学判错依据。'};
}
