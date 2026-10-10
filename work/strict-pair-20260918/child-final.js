function main(inputs){
  const local={...inputs};const reports=[];
  for(const round of [1,2]){
    const key='r'+round+'_candidate';let c=local[key];
    try{if(typeof c==='string')c=JSON.parse(c);}catch(_){continue;}
    if(!c||!Array.isArray(c.questions))continue;
    c=JSON.parse(JSON.stringify(c));
    const removed=[];
    c.questions=c.questions.filter((q,index)=>{
      const issues=questionLengthProblems(q);
      if(issues.length)removed.push({original_id:q?.id,position:index+1,issues,original_question:q});
      return !issues.length;
    });
    c.question_count=c.questions.length;c.generation_status=c.questions.length?'success':'insufficient';
    if(removed.length){
      c.missing_information=[...(c.missing_information||[]),'有'+removed.length+'题修订后仍超出字数限制，已暂不输出；完整内容保留在运行记录。'];
      reports.push({round,removed});
    }
    local[key]=JSON.stringify(c);
  }
  const r=mainBeforeLength(local);
  const envelope=JSON.parse(r.publication_payload_json);
  const chosen=JSON.parse(r.final_response_json);
  const notes=[];
  chosen.missing_information=briefReasons(chosen.missing_information,notes);
  if(proseSize(chosen.case_summary)>180){notes.push({field:'case_summary',original:chosen.case_summary});chosen.case_summary='病例摘要较长，请查看父流程整理后的病例详情。';}
  if(proseSize(chosen.risk_message)>120){notes.push({field:'risk_message',original:chosen.risk_message});chosen.risk_message='本轮存在待复核问题，完整意见见运行记录。';}
  const mapping=chosen.questions.map((q,i)=>({original_id:q.id,output_id:'Q'+(i+1)}));
  chosen.questions=chosen.questions.map((q,i)=>({...q,id:'Q'+(i+1)}));
  const changed=reports.some(x=>x.round===envelope.selected_candidate_round)||mapping.some(x=>x.original_id!==x.output_id);
  if(changed){
    r.publishable=false;
    envelope.audit_applies_to_selected_candidate=false;
    envelope.selected_candidate_audit=null;
    // Original round audits remain available; do not rebind their IDs to a filtered subset.
  }
  r.final_response_json=JSON.stringify(chosen);
  r.final_questions_json=r.output_ready?r.final_response_json:'';
  r.missing_information=JSON.stringify(chosen.missing_information||[]);
  Object.assign(envelope,{...r,publication_payload_json:undefined});
  envelope.length_report={policy:'hard_limits_no_truncation',rounds:reports,id_mapping:mapping,notes};
  r.publication_payload_json=JSON.stringify(envelope);
  return r;
}
