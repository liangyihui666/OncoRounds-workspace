function sourceSection(cleaned,label){
  const s=String(cleaned||''),start=s.indexOf('【'+label+'】');if(start<0)return '';
  const tail=s.slice(start+label.length+2),end=tail.search(/【(?:来源类型|清洗状态|患者病例正文|文章导语与二次资料|专家观点|图片索引|冲突与不确定项|敏感信息提示|已移除内容类别|来源说明)】/);
  return (end<0?tail:tail.slice(0,end)).trim();
}
// Only for locating patient passages, never for rewriting their clinical content.
// Retain offsets into the source and restore the source passage after matching.
function caseSourceLayout(value){
  const base=sourceLayout(value),tokens=[];
  for(let i=0;i<base.tokens.length;i++){
    const t=base.tokens[i];
    if(t.c===' '&&base.tokens[i+1]?.c==='。')continue;
    tokens.push({...t,c:/[“”]/.test(t.c)?'"':t.c});
  }
  return {text:tokens.map(t=>t.c).join(''),tokens};
}
function checkCaseSource(cleaned,documentText){
  const state=sourceSection(cleaned,'清洗状态').replace(/[。；;\s]/g,'');
  if(state!=='clean')throw new Error('CASE_SOURCE_REVIEW_REQUIRED：清洗状态为'+(state||'缺失')+'，应先核对原文，不进入出题。');
  const body=sourceSection(cleaned,'患者病例正文');
  if(body.length<20||/^(?:无|未提供|未找到)/.test(body))throw new Error('CASE_SOURCE_EMPTY：未提取到患者正文。');
  const source=String(documentText||''),original=caseSourceLayout(source);
  if(!original.text)throw new Error('CASE_SOURCE_EMPTY：缺少文档解析原文。');
  const lines=body.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),matches=[],unmatched=[];
  for(let i=0;i<lines.length;i++){
    const needle=caseSourceLayout(lines[i]).text,at=needle?original.text.indexOf(needle):-1;
    if(at<0){unmatched.push(i+1);continue;}
    const start=original.tokens[at].start,end=original.tokens[at+needle.length-1].end;
    const text=source.slice(start,end);
    matches.push({line:i+1,start,end,text,match_mode:text===lines[i]?'exact':'display_layout_only'});
  }
  if(unmatched.length)throw new Error('CASE_SOURCE_REWRITE：清洗正文有'+unmatched.length+'段未能回溯文档原句（段号'+unmatched.join(',')+'）。已兼容中文双引号和句号前空格；请检查文字、数值或段落拼接差异。');
  return {body:matches.map(m=>m.text).join('\n\n'),report:{
    scope:'literal_source_trace_not_medical_validation',status:'PASS',normalization_policy:'case-display-layout-1.2',
    patient_paragraph_count:lines.length,matched_paragraph_count:matches.length,
    display_normalized_paragraph_count:matches.filter(m=>m.match_mode==='display_layout_only').length,
    source_restored:true,paragraph_matches:matches.map(({text,...m})=>m),
    semantic_support:'not_independently_verified'
  }};
}
