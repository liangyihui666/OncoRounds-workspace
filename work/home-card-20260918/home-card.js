// Homepage copy only; never overwrite case detail, questions or evidence.
function buildHomeCard(inputs, questions) {
  const clean=v=>typeof v==='string'?v.replace(/\s+/g,' ').trim():'';
  const size=s=>Array.from(s).length;
  const source=[inputs.case_title,inputs.disease,inputs.case_context].map(clean).join('\n');
  const normalize=s=>s.replace(/\s/g,'').toLowerCase();
  const unsupportedTokens=s=>(s.match(/[A-Za-z][A-Za-z0-9+_.\/-]*|\d+(?:\.\d+)?/g)||[]).some(t=>!normalize(source).includes(normalize(t)));
  const unsafe=s=>/https?:|<[^>]*>|\{\{|[\r\n]|必须|首选|推荐|建议|应当|正确答案|治愈|成功案例|……|\.\.\./i.test(s);
  let reply={};
  try {
    reply=inputs.agent_reply;
    for(let i=0;i<4&&typeof reply==='string';i++) reply=JSON.parse(reply.replace(/^```(?:json)?\s*|\s*```$/g,'').trim());
  } catch (_) {reply={};}
  const proposal=reply?.home_card;
  const title=clean(proposal?.display_title), description=clean(proposal?.description);
  // The fallback uses a known diagnosis label and complete source clauses, never a cut sentence.
  const diagnosis=clean(inputs.second_cancer_type)||clean(inputs.cancer_type);
  const label=diagnosis && size(diagnosis)<=12 ? diagnosis : '肿瘤';
  const type=questions?.questions?.[0]?.type;
  const topics={'诊断与分期':'诊断与评估','分子诊断':'检测与治疗评估','治疗决策':'治疗决策','疗效复评与局部治疗':'疗效复评','耐药与后线管理':'进展后的治疗评估','不良反应管理':'治疗中的安全性评估'};
  const fallbackTitle=label+'的'+(topics[type]||'诊疗评估');
  const clauses=clean(inputs.case_context).split(/[。；;，]/).map(s=>s.trim()).filter(Boolean);
  const selected=[];
  for(const clause of clauses.slice(0,8)) {
    if(/计划|建议|推荐|首选|拟行|应行|正确|考虑使用/.test(clause))break;
    const next=[...selected,clause].join('，')+'。';
    if(size(next)>60)break;
    selected.push(clause);
    if(size(next)>=30)break;
  }
  const fallbackDescription=selected.length?selected.join('，')+'。':'围绕本例提供的病史与检查信息，思考诊疗中的关键问题。';
  const titleOK=size(title)>=6&&size(title)<=22&&!unsafe(title)&&!unsupportedTokens(title);
  const descriptionOK=size(description)>=16&&size(description)<=60&&!unsafe(description)&&!unsupportedTokens(description)&&/[。！？]$/.test(description);
  return {
    display_title:titleOK?title:fallbackTitle,
    description:descriptionOK?description:fallbackDescription,
    report:{title_method:titleOK?'model_short_copy':'deterministic_fallback',description_method:descriptionOK?'model_short_copy':'deterministic_fallback',title_limit:22,description_limit:60}
  };
}
