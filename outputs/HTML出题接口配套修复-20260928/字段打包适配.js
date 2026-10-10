
function main(args) {
 const result=buildOriginalCase(args);
 const source=result.production_variables;
 if(!source||typeof source!=='object') throw new Error('病例字段整理未返回有效对象。');
 const fields=['case_id','case_title','disease','case_context','learning_points','case_mode','case_timeline','biomarkers','decision_points','adverse_events','evidence_notes','case_intro_images','cancer_type','second_cancer_type'];
 const payload={};
 for(const key of fields){
   if(key==='case_intro_images'){payload[key]=[];continue;}
   if(source[key]!=null&&typeof source[key]!=='string')throw new Error('病例字段类型错误：'+key);
   payload[key]=source[key]??'';
 }
 return {...result,case_payload_json:JSON.stringify(payload)};
}
