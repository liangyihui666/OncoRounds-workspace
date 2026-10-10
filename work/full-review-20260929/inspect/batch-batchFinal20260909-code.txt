function main({results,expected_count}) {
  if (!Number.isInteger(expected_count) || expected_count < 1 || expected_count > 10) throw new Error('批量文件数量无效');
  const object=v=>v!==null && typeof v==='object' && !Array.isArray(v);
  const nonempty=v=>typeof v==='string'&&v.trim().length>0;
  const items=[];
  const fail=(index,code,message)=>{
    items.push({file_index:index+1,status:'failed',code,message});
    return {error:{file_index:index+1,code,message}};
  };
  // Never compact successful rows: failure positions must match uploaded files.
  if (results!=null && !Array.isArray(results)) throw new Error('并行完整结果不是数组');
  const rows=results || [];
  if(rows.length && rows.length!==expected_count) throw new Error('并行结果数量不一致，停止以避免病例错位');
  const output_data=Array.from({length:expected_count},(_,index)=>{
    const row=rows[index];
    if(!row) return fail(index,'BATCH_INTERRUPTED','并行运行未取得此文件的结果，请查看运行详情后单独重试。');
    if(row.success!==true) return fail(index,'CHILD_WORKFLOW_ERROR','此文件执行失败，请查看对应并行任务运行详情并单独重试。');
    let result;
    try {
      if(object(row.data)) result=row.data;
      else { if(typeof row.data!=='string' || !row.data.trim()) throw new Error('EMPTY_RESULT'); result=JSON.parse(row.data.replace(/^\uFEFF/,'').trim()); }
    } catch(e) { return fail(index,'INVALID_JSON','三连未返回可解析的单一 JSON 对象。'); }
    if(!object(result)||Object.keys(result).length!==2||!object(result.Questions)||!object(result.detail)
      ||!Array.isArray(result.Questions.questions)||!Number.isInteger(result.Questions.question_count)
      ||result.Questions.question_count!==result.Questions.questions.length) {
      return fail(index,'INVALID_RESULT','三连结果不符合 Questions/detail 契约，请检查被调用应用。');
    }
    const q=result.Questions, d=result.detail;
    // Public display contract only requires cancer_type. Internal/legacy second_cancer_type is optional.
    if(typeof q.cancer_type!=='string'||(Object.keys(d).length&&d.cancer_type!==q.cancer_type)
      ||(q.second_cancer_type!==undefined&&typeof q.second_cancer_type!=='string')
      ||(d.second_cancer_type!==undefined&&typeof d.second_cancer_type!=='string')
      ||(q.second_cancer_type!==undefined&&d.second_cancer_type!==undefined&&q.second_cancer_type!==d.second_cancer_type))
      return fail(index,'INVALID_TAXONOMY','题目与病例页癌种不一致或字段类型错误。');
    if(Object.keys(d).length&&(!nonempty(q.case_id)||q.case_id!==d.case_id))
      return fail(index,'CASE_ID_MISMATCH','题目与病例页的病例标识不一致。');
    if(q.question_count===0&&q.generation_status==='insufficient'){
      items.push({file_index:index+1,status:'incomplete',code:'NO_COMPLETE_QUESTION_SET',question_count:0,
        missing_information:Array.isArray(q.missing_information)?q.missing_information:[]});
      return result; // Keep the case page and upstream insufficiency information.
    }
    if(q.question_count!==5||q.generation_status!=='success')
      return fail(index,'INCOMPLETE_QUESTION_SET','每个成功病例必须完整输出5题；当前返回'+q.question_count+'题，未计入完成。');
    if(!nonempty(q.case_id)||!nonempty(q.cancer_type)||!Object.keys(d).length)
      return fail(index,'MISSING_CASE_DATA','五题结果缺少病例标识、癌种或病例页。');
    const ids=new Set();
    for(const item of q.questions){
      if(!object(item)||!nonempty(item.id)||ids.has(item.id)||!nonempty(item.question)
        ||!object(item.options)||Object.keys(item.options).length!==4
        ||!['A','B','C','D'].every(k=>nonempty(item.options[k]))
        ||!['A','B','C','D'].includes(item.answer)||item.answer_text!==item.options[item.answer]
        ||!nonempty(item.explain))
        return fail(index,'INVALID_QUESTION','题目字段、四个选项、答案对应关系或题目ID不符合输出契约。');
      ids.add(item.id);
    }
    items.push({file_index:index+1,status:'complete',case_id:q.case_id,question_count:5});
    return result;
  });
  const complete=items.filter(r=>r.status==='complete').length;
  const incomplete=items.filter(r=>r.status==='incomplete').length;
  const batch_report={schema_version:'batch-five-1.0',scope:'structure_and_completion_only',expected_count,
    complete_count:complete,incomplete_count:incomplete,failed_count:items.length-complete-incomplete,
    status:complete===expected_count?'complete':complete?'partial':'no_complete_cases',
    retry_file_indices:items.filter(r=>r.status!=='complete').map(r=>r.file_index),items};
  return {output_data,output_json:JSON.stringify(output_data,null,2),batch_report,batch_report_json:JSON.stringify(batch_report)};
}
