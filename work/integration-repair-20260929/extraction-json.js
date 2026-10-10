function main({raw_json}) {
  let s=String(raw_json||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  // Repair literal control characters inside strings only; never guess missing quotes or facts.
  let text='',inside=false,escape=false;
  for(const c of s){if(inside&&escape){text+=c;escape=false;continue;}if(inside&&c==='\\'){text+=c;escape=true;continue;}if(c==='"')inside=!inside;if(inside&&c==='\n')text+='\\n';else if(inside&&c==='\r')text+='\\r';else if(inside&&c==='\t')text+='\\t';else text+=c;}
  let data;try{data=JSON.parse(text);}catch(e){throw new Error('CASE_JSON_INVALID：提取结果不是完整JSON；不猜测缺失引号或截断内容。');}
  // The shared parser also rejects duplicate keys; root field policy differs from question objects.
  const checked=parseQuestionContract(text);
  if(checked.error.startsWith('重复键：'))throw new Error('CASE_JSON_INVALID：'+checked.error);
  const fields=['case_id','case_title','disease','second_cancer_type','primary_diagnosis_text','classification_reason','case_context','case_timeline','biomarkers','learning_points_candidate','decision_points_candidate','adverse_events','evidence_notes','case_image_index','case_mode','difficulty'];
  if(!data||Array.isArray(data)||typeof data!=='object'||Object.keys(data).length!==fields.length||fields.some(k=>typeof data[k]!=='string'))throw new Error('CASE_SCHEMA_INVALID：须提供16个字符串字段。');
  return {repaired_json:JSON.stringify(data),repaired_data:data};
}
