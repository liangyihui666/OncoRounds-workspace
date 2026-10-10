function buildBriefSummary(inputs) {
  const clean=v=>typeof v==='string'?v.replace(/\s+/g,' ').trim():'';
  const size=s=>Array.from(s).length;
  const normalize=s=>s.replace(/\s/g,'').toLowerCase();
  const source=[inputs.case_context,inputs.disease,inputs.biomarkers,inputs.case_timeline].map(clean).join('\n');
  const unsafe=s=>/https?:|<[^>]*>|\{\{|首选|推荐|建议|必须|应当|正确答案|……|\.\.\./i.test(s);
  const unsupported=s=>(s.match(/[A-Za-z][A-Za-z0-9+_.\/-]*|\d+(?:\.\d+)?/g)||[]).some(t=>!normalize(source).includes(normalize(t)));
  let reply={};
  try {
    reply=inputs.agent_reply;
    for(let i=0;i<4&&typeof reply==='string';i++)reply=JSON.parse(reply.replace(/^```(?:json)?\s*|\s*```$/g,'').trim());
  }catch(_){reply={};}
  const proposed=reply?.summary_card;
  const clauses=v=>clean(v).split(/[。；;！]/).map(s=>s.trim()).filter(Boolean);
  // Keep a complete original sentence/clause. Never truncate a number, negation or qualifier.
  const brief=(v,limit)=>{
    const complete=clauses(v).find(s=>size(s+'。')<=limit&&!unsafe(s));
    return complete?complete+'。':'';
  };
  const treatments=clauses(inputs.case_context).filter(s=>/治疗|化疗|放疗|手术|切除|清扫|保乳|全切/.test(s)&&!/拟|计划|建议|推荐|首选|待|评估/.test(s));
  const fallback={
    patient:brief(inputs.case_context,40),
    findings:brief([inputs.disease,inputs.biomarkers].filter(Boolean).join('。'),50),
    course:brief(treatments.join('。'),50),
    focus:'结合病例信息，评估当前病情与后续诊疗选择。'
  };
  const slots=[['patient','患者背景',40],['findings','诊断与检查',50],['course','治疗经过',50],['focus','当前评估重点',40]];
  const items=[],report=[];
  for(const [key,label,limit] of slots){
    const text=clean(proposed?.[key]);
    const valid=!!text&&size(text)<=limit&&!unsafe(text)&&!unsupported(text)&&/[。！？]$/.test(text);
    const value=valid?text:fallback[key];
    if(value)items.push({order:items.length+1,label,value});
    report.push({field:key,method:valid?'model_brief':'source_clause_fallback',limit});
  }
  return {items,report};
}
