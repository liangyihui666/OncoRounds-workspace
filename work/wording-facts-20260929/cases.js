test('题干尾句规范化不改临床前提、选项、答案或解析，不改变原始对象',()=>{
 const normalize=vm.runInNewContext(fs.readFileSync('work/wording-facts-20260929/wording.js','utf8')+'\nnormalizeQuestionWording');
 const x=objDraft();x.questions[0].question='患者有活动性出血。关于下一步方案，下列哪项最符合当前指南推荐？';
 const raw=JSON.stringify(x),y=plain(normalize(x));
 assert.equal(y.questions[0].question,'患者有活动性出血。关于下一步方案，以下哪项正确？');
 assert.equal(JSON.stringify(x),raw);
 const q={...y.questions[0],question:x.questions[0].question};assert.deepEqual(q,x.questions[0]);
 assert.deepEqual(plain(normalize(y)),y);
 const z={questions:[{question:'研究中哪项不符合指南推荐？'},{question:'研究是否符合指南推荐的入组条件？'}]};assert.deepEqual(plain(normalize(z)),z);
});
test('首轮与最终程序装配同步改写问法，公开题目仍是五题原顺序',()=>{
 const x=objDraft();x.questions[1].question='在当前病例条件下，以下哪项最符合指南建议？';
 for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2']){
  const a=fn(id)({candidate_json:JSON.stringify(x),evidence_pool:pool,second_cancer_type:'直肠癌'});assert.equal(a.structure_decision,'PASS');
  assert.equal(JSON.parse(a.candidate_json_passthrough).questions[1].question,'在当前病例条件下，以下哪项正确？');
 }
 const f=finish(assemble(x),x);assert.equal(f.status,'OUTPUT_READY');
 assert.equal(outerRun(f.publication_payload_json).final_data.questions[1].question,'在当前病例条件下，以下哪项正确？');
});
test('第二轮列出限定词丢失、病例事实和序贯同期疑点，不将其当作硬医学裁决',()=>{
 const x=objDraft();x.questions[0].question='患者白细胞下降，治疗期间加用某药，以下哪项正确？';x.questions[0].options[0]='永久停药';x.questions[0].answer_text='永久停药';
 const p=structuredClone(pool);p.records[0].raw_snippet='进展后序贯换线；根据病情可能需要永久停用或减量。';
 const r=JSON.parse(fn('v12RevisionInput')({previous_candidate:JSON.stringify(x),evidence_pool:p,case_packet:JSON.stringify({adverse_events:'仅记载白细胞减少'})}).system_text);
 const q=r.review_plan.question_checks[0];for(const c of ['CASE_FACT_TRACE','QUALIFIER_LOSS_CHECK','SEQUENCE_VS_COMBINATION'])assert(q.applicability_review_cues.some(s=>s.startsWith(c)));
 assert(q.fact_review.includes('病例原句'));assert.equal(q.structural_defects.length,0);
 assert.equal(r.evidence_pool.records[0].snippet,p.records[0].raw_snippet);
});
test('当前真实批次10例50题：四行完整、无内部编号，无全同答案',()=>{
 const current=load('work/batch-20260929/results.json');assert.equal(current.length,10);
 for(const r of current){assert.equal(r.Questions.questions.length,5);assert.equal(r.Questions.question_count,5);assert(r.Questions.missing_information.length>0);assert(new Set(r.Questions.questions.map(q=>q.answer)).size>1);
  for(const q of r.Questions.questions){assert(q.keyPoint.trim());assert.equal(q.explain.split('\n').length,4);assert.equal(q.options[q.answer],q.answer_text);assert(!/\b(?:GA|GB|GS|CS|IR)\d+\b/.test(JSON.stringify(q)));}
 }
 const normal=vm.runInNewContext(fs.readFileSync('work/wording-facts-20260929/wording.js','utf8')+'\nnormalizeQuestionWording');
 const changed=[];current.forEach((r,i)=>normal({questions:r.Questions.questions}).questions.forEach((q,j)=>{if(q.question!==r.Questions.questions[j].question)changed.push({output_index:i+1,question_id:q.id,before:r.Questions.questions[j].question,after:q.question});assert.deepEqual(plain({...q,question:r.Questions.questions[j].question}),r.Questions.questions[j]);}));
 assert(changed.length>0);
 fs.writeFileSync(dir+'题干措辞回放.json',JSON.stringify({model_rerun:false,medical_content_changed:false,changed_count:changed.length,changes:changed},null,2));
});
