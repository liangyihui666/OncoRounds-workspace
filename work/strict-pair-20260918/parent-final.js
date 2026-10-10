function main(inputs){
  const r=mainBeforeLength(inputs);
  const q=r.output_data.Questions;
  let detail=r.output_data.detail;
  const report={policy:'hard_limits_no_truncation',removed_questions:[],display_fallbacks:[],id_mapping:[]};
  q.questions=q.questions.filter((item,index)=>{
    const issues=questionLengthProblems(item);
    if(issues.length)report.removed_questions.push({original_id:item.id,position:index+1,issues,original_question:item});
    return !issues.length;
  });
  report.id_mapping=q.questions.map((item,i)=>({original_id:item.id,output_id:'Q'+(i+1)}));
  q.questions=q.questions.map((item,i)=>({...item,id:'Q'+(i+1)}));
  q.question_count=q.questions.length;q.generation_status=q.question_count?'success':'insufficient';
  q.missing_information=briefReasons(q.missing_information,report.display_fallbacks);
  if(report.removed_questions.length)q.missing_information.push('有'+report.removed_questions.length+'题仍超出字数限制，已暂不输出；完整内容见运行记录。');
  if(!q.question_count){
    detail={};
    if(!q.missing_information.length)q.missing_information=['本轮未形成符合字数要求的题目。'];
  }else{
    detail.decision_point_count=q.question_count;
    const enforce=(object,key,limit,fallback,path)=>{
      if(proseSize(object?.[key])>limit){report.display_fallbacks.push({field:path,original:object[key],limit});object[key]=fallback;}
    };
    enforce(detail.home,'display_title',14,'病例诊疗评估','home.display_title');
    enforce(detail.home,'description',48,'结合病史与检查信息，思考本例的诊疗问题。','home.description');
    enforce(detail.overview?.hero,'title',14,detail.home.display_title,'hero.title');
    enforce(detail.overview?.hero,'subtitle',40,'结合病例信息，评估当前病情与后续诊疗选择。','hero.subtitle');
    for(const tab of detail.overview?.tabs||[]){
      if(tab.id==='summary')for(const item of tab.summary_items||[]){
        const max=['患者背景','当前评估重点'].includes(item.label)?40:50;
        enforce(item,'value',max,'本项内容待精简，请结合题干提供的信息作答。','summary.'+item.order);
        enforce(item,'label',12,'病例信息','summary.label');
      }
      if(tab.id==='timeline')for(const [i,item] of (tab.timeline_items||[]).entries()){
        enforce(item,'title',16,'病情记录','timeline.'+i+'.title');
        enforce(item,'date',32,'时间未详','timeline.'+i+'.date');
        enforce(item,'detail',90,'本阶段记录较长，暂不展示；完整内容保留在运行记录。','timeline.'+i+'.detail');
      }
    }
  }
  if(report.removed_questions.length){
    r.selection_report.selection_status=q.question_count?'success':'insufficient';
    r.selection_report.selection_before_length_filter=r.selection_report.selected||[];
    r.selection_report.selected=(r.selection_report.selected||[]).filter((_,i)=>!report.removed_questions.some(x=>x.position===i+1));
    r.selection_report.medical_approval_confirmed=false;
  }
  r.selection_report.length_report=report;
  r.selection_report_json=JSON.stringify(r.selection_report);
  r.final_data=q;r.final_json=JSON.stringify(q);
  r.case_page_data=detail;r.case_page_json=JSON.stringify(detail);
  r.output_data={Questions:q,detail};r.output_json=JSON.stringify(r.output_data);
  return r;
}
