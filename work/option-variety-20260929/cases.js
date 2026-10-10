test('布局在首次生成前产生，100个病例均覆盖ABCD且只有一个字母重复',()=>{
 const run=vm.runInNewContext(fs.readFileSync('work/option-variety-20260929/options.js','utf8')+'\nanswerPositionPlan');const plans=[];
 for(let i=0;i<100;i++){const p={case_id:'TEST-'+i,case_title:'病例'+i},before=JSON.stringify(p),a=plain(run(p));
  assert.equal(a.assignments.length,5);assert.deepEqual(a.assignments.map(x=>x.id),['Q1','Q2','Q3','Q4','Q5']);
  assert.equal(new Set(a.assignments.map(x=>x.answer)).size,4);assert.equal(Math.max(...[0,1,2,3].map(n=>a.assignments.filter(x=>x.answer===n).length)),2);
  assert(a.assignments.every((x,j)=>x.letter==='ABCD'[x.answer]&&(!j||x.answer!==a.assignments[j-1].answer)));
  assert.deepEqual(plain(run(p)),a);assert.equal(JSON.stringify(p),before);plans.push(a.assignments.map(x=>x.letter).join(''));
 }assert(new Set(plans).size>10);
});
test('首轮文本引用真实布局输出，14字段病例不增加公共字段，第二轮计算同一计划',()=>{
 const result=plain(fn('v12CasePacket')({case_json:JSON.stringify(payload)}));
 const base=load('outputs/上传版证据范围修复-20260929/01-出题子应用-Flash证据范围修复版.json');
 const before=plain(fn('v12CasePacket',base)({case_json:JSON.stringify(payload)}));
 const {answer_position_plan_json,...rest}=result;assert.deepEqual(rest,before);assert.equal(Object.keys(result.case_packet).length,14);
 const r=JSON.parse(fn('v12RevisionInput')({case_packet:result.case_packet_json}).system_text);
 assert.deepEqual(r.review_plan.answer_position_plan,JSON.parse(answer_position_plan_json));
 const node=child.nodes.find(n=>n.nodeId==='v12CasePacket'),out=node.outputs.filter(o=>o.id==='answerPositionPlanJson');assert.equal(out.length,1);assert.equal(out[0].key,'answer_position_plan_json');assert.equal(out[0].valueType,'string');
 assert(child.nodes.find(n=>n.nodeId==='lUxTeIqSf0zHu2BL').inputs.find(i=>i.key==='system_textareaInput').value.includes('{{$v12CasePacket.answerPositionPlanJson$}}'));
});
test('跨题定位相同与近似选项，保留否定、剂量小数及必要术语，不据此自动判医学错误',()=>{
 const run=vm.runInNewContext(fs.readFileSync('work/option-variety-20260929/options.js','utf8')+'\noptionVarietyReview');
 const qs=[{id:'Q1',answer:0,options:['需先评估患者当前病情再决定下一步治疗','无需进一步检查即可直接开始治疗','甲','乙']},{id:'Q2',answer:0,options:['需先评估患者当前病情，再决定下一步治疗','无需重新检查即可直接开始治疗','丙','丁']}];
 const before=JSON.stringify(qs),r=plain(run(qs));assert.equal(r.scope,'lexical_review_not_medical_verdict');assert.equal(r.repeated_correct_pairs.length,1);
 assert(r.recurring_templates.some(t=>t.code==='NO_EVALUATION'));assert.equal(r.repeated_correct_pairs[0].left.question_id,'Q1');assert.equal(JSON.stringify(qs),before);
 const numeric=plain(run([{id:'Q1',answer:0,options:['该方案应使用药物1.5mg每次口服治疗']},{id:'Q2',answer:0,options:['该方案应使用药物15mg每次口服治疗']} ]));
 assert(!numeric.similar_option_pairs.some(p=>p.match==='exact_after_punctuation'));
 assert.equal(plain(run([null,{options:null},{}])).scope,'lexical_review_not_medical_verdict');
});
test('预检和最终装配暴露复用警告，但不改选项、答案或解析，不造成完整题组归零',()=>{
 const x=objDraft();for(const q of x.questions){q.options[0]='根据既定临床条件选择适用治疗方案';q.answer_text=q.options[0];}const before=JSON.stringify(x);for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2']){
  const r=fn(id)({candidate_json:before,evidence_pool:pool,second_cancer_type:'直肠癌'});assert.equal(r.structure_decision,'PASS');assert(r.structure_warnings.some(w=>w.startsWith('OPTION_REUSE')));
  const saved=JSON.parse(r.candidate_json_passthrough);saved.questions.forEach((q,i)=>{assert.deepEqual(q.options,x.questions[i].options);assert.equal(q.answer,x.questions[i].answer);});
 }assert.equal(JSON.stringify(x),before);assert.equal(finish(assemble(x),x).status,'OUTPUT_READY');
});
test('最新35题实测：识别全B与重复模板，生成前计划不同于全B，原始结果逐字不变',()=>{
 const batch=load('work/latest-batch-20260929/results.json'),report=[];const run=vm.runInNewContext(fs.readFileSync('work/option-variety-20260929/options.js','utf8')+'\n({answerPositionPlan,optionVarietyReview})');
 for(const [i,v]of batch.output_data.entries()){
  const snapshot=JSON.stringify(v),p={case_id:v.Questions.case_id,case_title:v.detail.home.display_title},plan=plain(run.answerPositionPlan(p)),review=plain(run.optionVarietyReview(v.Questions.questions));
  if(i===0){assert.deepEqual(review.answer_counts,[0,5,0,0]);assert(review.concentrated);assert(review.recurring_templates.length>0);assert.equal(new Set(plan.assignments.map(x=>x.answer)).size,4);}
  assert.equal(JSON.stringify(v),snapshot);report.push({index:i+1,title:p.case_title,original_question_count:v.Questions.question_count,plan,review});
 }
 assert(report.filter(r=>r.review.recurring_templates.length).length>=3);
 fs.writeFileSync(dir+'最新35题重复与布局回放.json',JSON.stringify({model_rerun:false,original_answers_changed:false,scope:'lexical_diagnostics_and_predraft_plan_only',report},null,2));
});
