function prepareSelection({agent_reply,candidate_pool,case_id,disease,difficulty}) {
  const object=v=>{for(let i=0;i<4&&typeof v==='string';i++)v=JSON.parse(v.replace(/^\uFEFF/,'').replace(/^```(?:json)?\s*|\s*```$/g,'').trim());return v;};
  const pool=object(candidate_pool);
  if(!pool||!Array.isArray(pool.candidates)||!Array.isArray(pool.groups)||pool.candidate_count!==pool.candidates.length) throw new Error('候选池结构或数量不一致');
  if(pool.case_packet?.case_id&&case_id&&pool.case_packet.case_id!==case_id) throw new Error('CASE_MISMATCH');
  const warnings=[];
  const report={schema_version:'triple-selection-1.0',candidate_count:pool.candidates.length,medical_approval_confirmed:false,
    source_groups:pool.groups,selected:[],selection_notes:[],warnings,notice:'终选保留真实审核信息，成功生成不等于医学审核通过',workflow_revision:'20260910-two-level-test'};
  const normalize=s=>String(s||'').replace(/\s+/g,' ').trim();
  function signature(c) {
    const q=c.question, options=Array.isArray(q.options)?q.options:Object.values(q.options||{});
    return JSON.stringify([normalize(q.question),options.map(normalize).sort(),normalize(q.answer_text)]);
  }
  const problemCount=c=>Array.isArray(c.source_question_audit?.problems)?c.source_question_audit.problems.length+(c.source_question_audit.passed===false?1:0):0;
  const unknown=c=>c.source_question_audit?0:1;
  const ranked=pool.candidates.map((c,i)=>({...c,stable_index:i})).sort((a,b)=>problemCount(a)-problemCount(b)||unknown(a)-unknown(b)||a.stable_index-b.stable_index);
  const seen=new Map(),unique=[];
  for(const c of ranked){const sig=signature(c);if(seen.has(sig)){warnings.push(c.candidate_id+'与'+seen.get(sig)+'重复，已合并');continue;}seen.set(sig,c.candidate_id);unique.push(c);}
  const byId=new Map(unique.map(c=>[c.candidate_id,c]));
  const desired=Math.min(5,unique.length);
  if(!desired){
    report.selection_status='insufficient';
    for(const g of pool.groups){if(g.error)warnings.push(g.group_id+': '+g.error);warnings.push(...(g.upstream_missing_information||[]));}
    if(!warnings.length)warnings.push('三组均未返回结构有效的题目，不能复制或补造题目');
    const final_data={schema_version:'1.0',case_id:String(case_id||''),cancer_type:'',second_cancer_type:'',generation_status:'insufficient',
      difficulty:String(difficulty||'进阶'),question_count:0,questions:[],missing_information:[...new Set(warnings)]};
    return {stop:{final_data,final_json:JSON.stringify(final_data),case_page_data:{},case_page_json:'{}',selection_report:report,selection_report_json:JSON.stringify(report),quality_notice:warnings.join('\n')}};
  }
  let selected=null;
  try {
    const reply=object(agent_reply),ids=reply?.selected_ids;
    if(!Array.isArray(ids)||ids.length!==desired||new Set(ids).size!==desired||ids.some(id=>!byId.has(id)))throw new Error('ID无效、重复、题数不符或选择了已合并的重复候选');
    selected=ids.map(id=>byId.get(id));
    report.selection_method='model_ids';
  }catch(e){
    report.selection_method='deterministic_fallback'; report.fallback_reason=String(e.message||e);
    selected=[];const remaining=unique.slice();
    while(selected.length<desired){
      const duplicateTopic=c=>selected.filter(s=>normalize(s.question.keyPoint)===normalize(c.question.keyPoint)).length;
      const repeatedDecision=c=>selected.filter(s=>s.question.type===c.question.type&&s.question.timepoint===c.question.timepoint).length;
      remaining.sort((a,b)=>problemCount(a)-problemCount(b)||duplicateTopic(a)-duplicateTopic(b)||repeatedDecision(a)-repeatedDecision(b)||unknown(a)-unknown(b)||a.stable_index-b.stable_index);
      selected.push(remaining.shift());
    }
    warnings.push('终选回复异常，已按审核问题数量、考点重复情况和稳定候选顺序选择实际题目');
  }
  report.selection_status='success';
  report.selected=selected.map((c,i)=>({final_id:'Q'+(i+1),candidate_id:c.candidate_id,group_id:c.group_id,source_question_id:c.source_question_id,
    evidence_status:c.evidence_status||'not_provided',evidence_key:c.evidence_key||null,source_question_audit:c.source_question_audit||null}));
  for(const c of selected){if(c.source_question_audit?.passed===false)warnings.push(c.candidate_id+'审核仍有问题：'+(c.source_question_audit.problems||[]).join('；'));if(!c.source_question_audit)warnings.push(c.candidate_id+'未提供与原题绑定的审核，不能视为PASS');}
  let seed=2166136261;for(const ch of String(case_id||'')+selected.map(c=>c.candidate_id).join('|'))seed=Math.imul(seed^ch.charCodeAt(0),16777619)>>>0;
  const targets=Array.from({length:desired},(_,i)=>(i+seed%4)%4);
  return {source:{generation_status:'success',questions:selected.map((c,i)=>({...c.question,id:'Q'+(i+1)})),missing_information:[]},report,targets};
}
