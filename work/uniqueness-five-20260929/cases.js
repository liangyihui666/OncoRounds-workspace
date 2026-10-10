test('四项复核表保留各选项、答案和对象解析，不生成医学判定或改动输入',()=>{
 const x=objDraft();x.questions[0].answer=2;x.questions[0].answer_text=x.questions[0].options[2];
 const before=JSON.stringify(x),r=JSON.parse(fn('v12RevisionInput')({previous_candidate:before,evidence_pool:pool}).system_text);
 const q=r.review_plan.question_checks[0];assert.equal(q.option_review.length,4);
 q.option_review.forEach((row,i)=>{assert.equal(row.option,'ABCD'[i]);assert.equal(row.text,x.questions[0].options[i]);assert.equal(row.draft_reason,x.questions[0].explain['ABCD'[i]]);assert.equal(row.draft_selected,i===2);assert(!('verdict' in row));});
 assert.equal(JSON.stringify(x),before);assert.equal(r.review_plan.set_review.questions.length,5);
 assert.equal(r.review_plan.set_review.scope,'review_tasks_not_medical_verdict');
});
test('兼容旧四行解析，缺行不按位置错配，也不补造解释',()=>{
 const x=structuredClone(draft);x.questions[0].explain='A｜正确：甲理由\nC｜不正确：丙理由\nD｜不正确：丁理由';
 const r=JSON.parse(fn('v12RevisionInput')({previous_candidate:JSON.stringify(x),evidence_pool:pool}).system_text);
 const q=r.review_plan.question_checks[0];assert(q.structural_defects.some(s=>s.includes('3行')));
 assert.equal(q.option_review[1].draft_reason,'');assert.equal(q.option_review[2].draft_reason,'C｜不正确：丙理由');
});
test('分期、ADC和常规流程只是复核线索，未命中题仍有四项复核，证据不改写',()=>{
 const x=objDraft();x.questions[0].question='讨论分期及MDT评估后使用RC48的适用条件，以下哪项正确？';
 const p=structuredClone(pool);p.records[0].raw_snippet='CheckMate 9DW要求≤1个可测量病灶。';const before=JSON.stringify(p);
 const r=JSON.parse(fn('v12RevisionInput')({previous_candidate:JSON.stringify(x),evidence_pool:p}).system_text);
 assert.equal(r.review_plan.set_review.questions[0].review_cues.length,3);
 assert.equal(r.review_plan.question_checks[1].option_review.length,4);
 assert.equal(r.evidence_pool.records[0].snippet,p.records[0].raw_snippet);assert.equal(JSON.stringify(p),before);
});
test('Qwen3.5真实50题仅回放复核输入，200项一一对应且BBBBB不被程序洗牌',()=>{
 const batch=load('work/qwen35-results-20260929/results.json');assert.equal(batch.length,10);
 const report=[];
 for(const [i,item]of batch.entries()){
  const original=JSON.stringify(item);const x=structuredClone(item.Questions);
  // Public options/answer are letter keyed; adapt back to the internal candidate contract.
  x.questions=x.questions.map(q=>({...q,options:['A','B','C','D'].map(k=>q.options[k]),answer:'ABCD'.indexOf(q.answer)}));
  assert.equal(x.questions.length,5);const before=JSON.stringify(x);
  const r=JSON.parse(fn('v12RevisionInput')({previous_candidate:before,evidence_pool:{records:[]}}).system_text);
  assert.equal(r.review_plan.question_checks.length,5);
  for(const [j,q]of r.review_plan.question_checks.entries()){
   assert.equal(q.option_review.length,4);q.option_review.forEach((row,k)=>assert.equal(row.text,x.questions[j].options[k]));
   assert.equal(q.option_review.filter(row=>row.draft_selected).length,1);
  }
  assert.equal(r.previous_candidate_raw,before);assert.equal(JSON.stringify(x),before);assert.equal(JSON.stringify(item),original);
  report.push({index:i+1,case_id:x.case_id,question_count:x.questions.length,option_review_count:20,answer_counts:r.review_plan.answer_counts,set_review:r.review_plan.set_review});
 }
 assert.deepEqual(report[4].answer_counts,[0,5,0,0]);
 fs.writeFileSync(dir+'Qwen3.5真实50题复核输入回放.json',JSON.stringify({scope:'review_input_transport_only',public_letter_fields_adapted_to_internal:true,full_evidence_available:false,model_rerun:false,medical_correctness_verified:false,rows:report},null,2));
});
