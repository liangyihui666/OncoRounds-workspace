function sourceSection(cleaned,label){
  const s=String(cleaned||''),start=s.indexOf('【'+label+'】');if(start<0)return '';
  const tail=s.slice(start+label.length+2),end=tail.search(/【(?:来源类型|清洗状态|患者病例正文|文章导语与二次资料|专家观点|图片索引|冲突与不确定项|敏感信息提示|已移除内容类别|来源说明)】/);
  return (end<0?tail:tail.slice(0,end)).trim();
}
function checkCaseSource(cleaned,documentText){
  const state=sourceSection(cleaned,'清洗状态').replace(/[。；;\s]/g,'');
  if(state!=='clean')throw new Error('CASE_SOURCE_REVIEW_REQUIRED：清洗状态为'+(state||'缺失')+'，应先核对原文，不进入出题。');
  const body=sourceSection(cleaned,'患者病例正文');
  if(body.length<20||/^(?:无|未提供|未找到)/.test(body))throw new Error('CASE_SOURCE_EMPTY：未提取到患者正文。');
  const original=sourceLayout(documentText).text;
  if(!original)throw new Error('CASE_SOURCE_EMPTY：缺少文档解析原文。');
  const lines=body.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const unmatched=lines.map((s,i)=>({line:i+1,text:s})).filter(r=>!original.includes(sourceLayout(r.text).text));
  if(unmatched.length)throw new Error('CASE_SOURCE_REWRITE：清洗正文有'+unmatched.length+'段未能回溯文档原句（段号'+unmatched.map(x=>x.line).join(',')+'）。保留原文段落，不摘要或拼接。');
  return {body,report:{scope:'literal_source_trace_not_medical_validation',status:'PASS',patient_paragraph_count:lines.length,matched_paragraph_count:lines.length,semantic_support:'not_independently_verified'}};
}
