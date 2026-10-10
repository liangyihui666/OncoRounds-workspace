function main({results,expected_count}) {
  if (!Number.isInteger(expected_count) || expected_count < 1 || expected_count > 10) throw new Error('批量文件数量无效');
  const fail=(index,code,message)=>({error:{file_index:index+1,code,message}});
  const object=v=>v!==null && typeof v==='object' && !Array.isArray(v);
  // Full results retains failed positions; success-only results must never be used here.
  if (results!=null && !Array.isArray(results)) throw new Error('并行完整结果不是数组');
  const rows=results || [];
  if(rows.length && rows.length!==expected_count) throw new Error('并行结果数量不一致，停止以避免病例错位');
  const output_data=Array.from({length:expected_count},(_,index)=>{
    const row=rows[index];
    if(!row) return fail(index,'BATCH_INTERRUPTED','并行运行未取得完整结果，请查看运行详情后重试。');
    if(row.success!==true) return fail(index,'CHILD_WORKFLOW_ERROR','此文件执行失败，请查看对应并行任务运行详情并单独重试。');
    let result;
    try {
      if(object(row.data)) result=row.data;
      else { if(typeof row.data!=='string' || !row.data.trim()) throw new Error('EMPTY_RESULT'); result=JSON.parse(row.data.replace(/^\uFEFF/,'').trim()); }
    } catch(e) { return fail(index,'INVALID_JSON','三连未返回可解析的单一 JSON 对象，请查看对应任务运行详情。'); }
    if(!object(result)||Object.keys(result).length!==2||!object(result.Questions)||!object(result.detail)
      ||!Array.isArray(result.Questions.questions)||result.Questions.question_count!==result.Questions.questions.length) {
      return fail(index,'INVALID_RESULT','三连结果不符合 Questions/detail 契约，请检查三连实际运行版本。');
    }
    const q=result.Questions, d=result.detail;
    if(q.question_count>5 || (q.question_count===0?q.generation_status!=='insufficient':q.generation_status!=='success') ||
       typeof q.cancer_type!=='string' || typeof q.second_cancer_type!=='string' ||
       (Object.keys(d).length && (d.cancer_type!==q.cancer_type || d.second_cancer_type!==q.second_cancer_type)))
      return fail(index,'INVALID_TAXONOMY_OR_COUNT','两级癌种或实际题数不一致，请检查测试应用绑定。');
    return result;
  });
  return {output_data,output_json:JSON.stringify(output_data,null,2)};
}