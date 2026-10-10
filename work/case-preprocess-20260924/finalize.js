function main({ draft, review, issues, ready, extractError, reviewError }) {
  function parse(s) { if(typeof s !== 'string') return null; try { return JSON.parse(s.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'')); } catch (_) { return null; } }
  const problems = parse(issues || '[]') || ['预处理状态无法解析。'];
  const result = { extraction_status:'insufficient', requires_human_confirmation:true, ready_for_generation:false, case_variables:{}, data_quality_notes:[], source_notes:[], review:{decision:'NOT_RUN',issues:[]}, message:'' };
  if (ready !== 'true' || problems.length) {
    result.data_quality_notes=problems; result.message='资料未完整解析，请处理提示后重试。';
    return {output:JSON.stringify(result)};
  }
  const d=parse(draft), r=parse(review);
  const keys=['case_title','disease','case_context','case_timeline','biomarkers','decision_points','adverse_events','evidence_notes','cancer_type','second_cancer_type'];
  const valid = d && d.case_variables && keys.every(k => typeof d.case_variables[k] === 'string') && ['全程管理','单时间点'].includes(d.case_variables.case_mode) && ['sufficient','insufficient'].includes(d.source_sufficiency) && typeof d.patient_count_conflict === 'boolean' && Array.isArray(d.data_quality_notes) && d.data_quality_notes.every(x=>typeof x==='string') && Array.isArray(d.source_notes) && d.source_notes.every(x=>x && typeof x.field==='string' && typeof x.source==='string');
  if (!valid || extractError) {result.message='结构化提取失败或格式不完整，请重试并检查模型输出。';return {output:JSON.stringify(result)};}
  if (d.patient_count_conflict || d.source_sufficiency === 'insufficient') {
    result.data_quality_notes=d.data_quality_notes;
    result.message=d.patient_count_conflict?'资料可能包含多个患者，请仅上传同一病例。':'病例资料不足，请补充报告或正文。';
    return {output:JSON.stringify(result)};
  }
  const serialized=JSON.stringify({draft:d,review:r});
  if (/(?:姓名|住院号|身份证号|联系电话|家庭住址)\s*[:：]\s*(?!\[|已脱敏|未提供|不详|无)[^\s"，；]{2,}|\b1[3-9]\d{9}\b|\b\d{17}[\dXx]\b|https?:\/\/|[A-Za-z]:[\\/]/.test(serialized)) {
    result.message='输出可能包含身份信息或来源链接，已拦截，请核对脱敏结果。';return {output:JSON.stringify(result)};
  }
  for (const k of keys) result.case_variables[k]=d.case_variables[k];
  result.case_variables.case_mode=d.case_variables.case_mode;
  result.case_variables.case_id='';
  result.case_variables.learning_points='';
  result.case_variables.case_intro_images=[];
  result.data_quality_notes=d.data_quality_notes;
  result.source_notes=d.source_notes;
  const validReview = r && ['PASS','REVISE','STOP_INSUFFICIENT'].includes(r.decision) && Array.isArray(r.issues) && r.issues.every(x=>typeof x==='string') && !reviewError;
  result.review=validReview?{decision:r.decision,issues:r.issues}:{decision:'REVISE',issues:['独立核对未成功或输出格式不完整。']};
  const pass=validReview && r.decision==='PASS' && r.issues.length===0;
  result.extraction_status=pass?'draft_requires_confirmation':'needs_review';
  result.message=pass?'病例变量草稿已生成，请核对原文后再传入出题流程。':'病例变量存在待核实项，请按核对意见检查原文。';
  if (validReview && r.decision==='STOP_INSUFFICIENT') {result.extraction_status='insufficient';result.case_variables={};}
  return {output:JSON.stringify(result)};
}
