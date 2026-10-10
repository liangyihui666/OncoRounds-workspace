// Visible prose limits. Original source metadata and internal audit records are exempt.
const PROSE_LIMITS={question:100,explain:100,keyPoint:35,phase:16,timepoint:40,answer_text:40};
function proseSize(s){return typeof s==='string'?Array.from(s).length:0;}
function questionLengthProblems(q){
  const issues=[];
  for(const [field,max] of Object.entries(PROSE_LIMITS))if(proseSize(q?.[field])>max)issues.push({field,max,actual:proseSize(q[field])});
  const options=Array.isArray(q?.options)?q.options:Object.values(q?.options||{});
  options.forEach((v,i)=>{if(proseSize(v)>40)issues.push({field:'options.'+i,max:40,actual:proseSize(v)});});
  const evidence=q?.guidelineRef?.evidence_summary??q?.evidence_summary;
  if(proseSize(evidence)>80)issues.push({field:'evidence_summary',max:80,actual:proseSize(evidence)});
  return issues;
}
function briefReasons(values,report){
  return [...new Set((Array.isArray(values)?values:[]).filter(x=>typeof x==='string'&&x.trim()).map(s=>{
    if(proseSize(s)<=120)return s;
    report.push({field:'missing_information',original:s,action:'short_notice'});
    return '部分缺口说明较长，请在运行记录中查看完整内容。';
  }))];
}
