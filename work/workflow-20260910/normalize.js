function main(inputs) {
  const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch(_){return null;}};
  const arr=v=>Array.isArray(v)?v:[];
  const classification=classifyTumor(inputs.second_cancer_type);
  const diagnostics=[];
  function candidate(value,round) {
    const p=parse(value);
    if(!p || p.schema_version!=='1.1' || !Array.isArray(p.questions)) {
      diagnostics.push({round,reason:'CANDIDATE_PARSE_OR_SCHEMA_ERROR'});return null;
    }
    const rejected=[];
    const questions=p.questions.filter((q,i)=>{
      const valid=q && typeof q==='object' && ['id','type','phase','timepoint','question','answer_text','explain','keyPoint'].every(k=>typeof q[k]==='string'&&q[k].trim()) &&
        Array.isArray(q.options)&&q.options.length===4&&q.options.every(s=>typeof s==='string'&&s.trim())&&new Set(q.options.map(s=>s.trim())).size===4 &&
        Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4&&q.answer_text===q.options[q.answer] && q.guidelineRef && typeof q.guidelineRef==='object';
      if(!valid) rejected.push(i+1); return valid;
    }).slice(0,5);
    if(rejected.length) diagnostics.push({round,reason:'INVALID_QUESTION_STRUCTURE',positions:rejected});
    return {...p,generation_status:questions.length?'success':'insufficient',questions,question_count:questions.length,
      cancer_type:classification.cancer_type,second_cancer_type:classification.second_cancer_type};
  }
  const r1=candidate(inputs.r1_candidate,1);
  const attempted=Boolean(inputs.r2_patch_decision||inputs.r2_decision||inputs.r2_candidate||inputs.r2_feedback);
  const r2=attempted?candidate(inputs.r2_candidate,2):null;
  const f2=parse(inputs.r2_feedback);
  const patchFailed=inputs.r2_patch_decision==='FAIL'||f2?.patch_merge_decision==='FAIL';
  let selected=null,round=null,fallback_reason='';
  if(r2?.questions.length && !patchFailed) { selected=r2; round=2; }
  else if(r1?.questions.length) { selected=r1; round=1; if(attempted) fallback_reason=patchFailed?'第二轮修订合并失败，保留首轮实际题目':'第二轮未形成有效题目，保留首轮实际题目'; }
  const reasons=[...new Set([...(arr(r1?.missing_information)),...(arr(r2?.missing_information)),
    ...arr(parse(inputs.r1_missing)),...arr(parse(inputs.r2_missing))].filter(s=>typeof s==='string'&&s.trim()))];
  if(!selected) selected={schema_version:'1.1',generation_status:'insufficient',case_summary:r2?.case_summary||r1?.case_summary||'',
    difficulty:'进阶',question_count:0,questions:[],missing_information:reasons.length?reasons:['两轮均未形成结构有效的题目；请查看上游解析、检索与审核记录'],
    risk_message:'未生成可输出题目',cancer_type:classification.cancer_type,second_cancer_type:classification.second_cancer_type};
  const output_ready=selected.questions.length>0;
  const reviewRound=round || (attempted?2:1);
  const feedback=String(inputs['r'+reviewRound+'_feedback']||'');
  const f=parse(feedback);
  const rawDecision=inputs['r'+reviewRound+'_decision'];
  const decision=['PASS','REVISE','STOP_INSUFFICIENT'].includes(rawDecision)?rawDecision:'REVISE';
  const rawScore=inputs['r'+reviewRound+'_score'];
  const score=typeof rawScore==='number'&&Number.isInteger(rawScore)&&rawScore>=0&&rawScore<=100?rawScore:0;
  const auditBound=round!==null && f?.round===round && f?.medical_auditable===true && f?.patch_merge_decision!=='FAIL';
  const selectedAudit=auditBound?{...f,returned_candidate_binding:true,scope:'selected_candidate_round'}:null;
  const cited=round?parse(inputs['r'+round+'_cited_evidence']):null;
  const result={status:output_ready?'OUTPUT_READY':'STOP_INSUFFICIENT',output_ready,
    publishable:output_ready&&auditBound&&decision==='PASS'&&inputs['r'+round+'_publishable']===true,
    final_response_json:JSON.stringify(selected),final_questions_json:output_ready?JSON.stringify(selected):'',
    validation_decision:decision,validation_score:score,validation_feedback:feedback,
    missing_information:JSON.stringify(selected.missing_information||[]),round_count:attempted?2:1};
  const envelope={record_type:'oncorounds_final',transport_version:'1.0',workflow_revision:'20260910-two-level-test',
    case_id:String(inputs.case_id||''),case_title:String(inputs.case_title||''),disease:String(inputs.disease||''),
    cancer_type:classification.cancer_type,second_cancer_type:classification.second_cancer_type,...result,
    selected_candidate_round:round,audit_applies_to_selected_candidate:auditBound,selected_candidate_audit:selectedAudit,
    selected_evidence_context:{round,returned_candidate_binding:round!==null&&Array.isArray(cited),records:arr(cited)},
    fallback_reason,taxonomy_warnings:classification.taxonomy_warnings,upstream_diagnostics:diagnostics,
    round_audits:[{round:1,decision:inputs.r1_decision||'',feedback:parse(inputs.r1_feedback)},
      {round:2,decision:inputs.r2_decision||'',feedback:f2,patch_merge_decision:inputs.r2_patch_decision||''}]};
  return {...result,publication_payload_json:JSON.stringify(envelope)};
}
