// Checks source presence and shape only. A matched quotation does NOT prove entailment.
function verifyCandidateEvidence(candidate, pool, packet) {
  const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
  const text=v=>typeof v==='string'&&v.trim().length>0;
  const fields=['disease','case_context','case_timeline','biomarkers','adverse_events','evidence_notes'];
  const records=Array.isArray(pool?.records)?pool.records:[];
  const letters=['A','B','C','D'];
  const report={version:'option-anchors-1.0',scope:'literal_source_presence_and_shape_only',decision:'PASS',semantic_support:'not_independently_verified',errors:[],question_checks:[]};
  function findQuote(body,quote){
    if(!text(body)||!text(quote))return {matched:false,match_mode:null,occurrences:0,contexts:[]};
    // Collapse whitespace runs, but do not remove word boundaries or alter signs/negation/numbers.
    let compact='',positions=[];
    for(let i=0;i<body.length;i++){
      if(/\s/.test(body[i])){if(!compact.endsWith(' ')){compact+=' ';positions.push(i);}}
      else {compact+=body[i];positions.push(i);}
    }
    const needle=quote.replace(/\s+/g,' ').trim();let offset=0,count=0;const contexts=[];
    while(needle&&offset<=compact.length){
      const at=compact.indexOf(needle,offset);if(at<0)break;
      const start=positions[at],end=positions[at+needle.length-1]+1;count++;
      if(contexts.length<2)contexts.push({start,end,text:body.slice(Math.max(0,start-100),Math.min(body.length,end+100))});
      offset=at+needle.length;
    }
    return {matched:count>0,match_mode:count?(body.includes(quote)?'exact':'layout_whitespace_only'):null,occurrences:count,contexts};
  }
  const questions=Array.isArray(candidate?.questions)?candidate.questions:[];
  for(let qi=0;qi<questions.length;qi++){
    const q=questions[qi],id=text(q?.id)?q.id:'Q'+(qi+1);
    const check={question_id:id,evidence_id:q?.evidence_id||'',errors:[],option_checks:[],case_fact_checks:[],decision_design:null};
    const fail=(code,message)=>check.errors.push({code,message});
    const matches=records.filter(r=>r&&r.evidence_id===q?.evidence_id);
    const record=matches.length===1?matches[0]:null;
    const body=text(record?.raw_snippet)?record.raw_snippet:record?.snippet;
    check.source_locator=record?{doc_id:record.doc_id,split_index:record.split_index}:null;
    if(!record||!text(body))fail('ANCHOR_SOURCE','绑定记录不唯一或没有正文，无法核对原句。');
    const v=q?.verification;
    if(!object(v)){
      fail('VERIFICATION_MISSING','缺少verification：须提供四选项原句、病例原句及竞争方案判别依据。');
    }else{
      const keys=['quotes','case_facts','closest_alternative','decision_boundary'];
      if(Object.keys(v).length!==4||!keys.every(k=>Object.prototype.hasOwnProperty.call(v,k)))fail('VERIFICATION_SHAPE','verification必须恰好包含quotes、case_facts、closest_alternative、decision_boundary。');
      if(!object(v.quotes)||Object.keys(v.quotes).length!==4||!letters.every(k=>Object.prototype.hasOwnProperty.call(v.quotes,k)))fail('OPTION_QUOTES_SHAPE','quotes必须为A/B/C/D四键对象。');
      for(const letter of letters){
        const quotes=v.quotes?.[letter];const rows=[];
        if(!Array.isArray(quotes)||quotes.length<1||quotes.length>2)fail('OPTION_QUOTE_COUNT',letter+'须提供1至2段绑定正文的连续原句。');
        else for(const quote of quotes){
          if(!text(quote)||quote.trim().length<8||quote.length>180){fail('OPTION_QUOTE_LENGTH',letter+'原句须为8至180字符的非空字符串，不是关键词或整篇复制。');rows.push({quote,matched:false});continue;}
          const found=findQuote(body,quote);rows.push({quote,...found});
          if(!found.matched)fail('OPTION_QUOTE_NOT_FOUND',letter+'原句未在本题绑定正文中找到；不能改写、拼接、从另一片段借用或修正符号。');
        }
        check.option_checks.push({option:letter,quotes:rows});
      }
      if(!Array.isArray(v.case_facts)||v.case_facts.length<1||v.case_facts.length>3)fail('CASE_FACT_COUNT','case_facts须含1至3条决定本题取舍的病例原句。');
      else for(const fact of v.case_facts){
        if(!object(fact)||Object.keys(fact).length!==2||!fields.includes(fact.field)||!text(fact.quote)||fact.quote.trim().length<2||fact.quote.length>160){fail('CASE_FACT_SHAPE','病例原句须为{field,quote}，字段来自病例事实，原句2至160字符。');continue;}
        const found=findQuote(packet?.[fact.field],fact.quote);check.case_fact_checks.push({...fact,...found});
        if(!found.matched)fail('CASE_FACT_NOT_FOUND','病例原句未在'+fact.field+'中找到；不得用候选决策、指南阈值或模型记忆补成患者事实。');
      }
      const selected=Number.isInteger(q?.answer)?letters[q.answer]:q?.answer;
      if(!letters.includes(v.closest_alternative)||v.closest_alternative===selected)fail('ALTERNATIVE_INVALID','closest_alternative必须是一个错误项字母，不得指向正确答案。');
      if(!text(v.decision_boundary)||v.decision_boundary.length>120)fail('BOUNDARY_MISSING','decision_boundary须用不超过120字符说明本例为何排除最接近方案，条件变化时其适用边界。');
      check.decision_design={closest_alternative:v.closest_alternative,decision_boundary:v.decision_boundary,
        review_required:'核对所列条件是否真的决定取舍，另一方案是否确有竞争力；场景与条件变化必须由绑定全文支持。字段齐全不等于达到进阶难度。'};
    }
    check.decision=check.errors.length?'FAIL':'PASS';report.question_checks.push(check);
    for(const e of check.errors)report.errors.push(id+' ['+e.code+'] '+e.message);
  }
  report.decision=report.errors.length?'FAIL':'PASS';
  return report;
}
