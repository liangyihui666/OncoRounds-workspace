const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const dir='outputs/证据原句核对与进阶出题-20260929/',manifest=JSON.parse(fs.readFileSync(dir+'修改记录.json'));
const load=p=>JSON.parse(fs.readFileSync(p,'utf8')),w=Object.fromEntries(Object.entries(manifest.files).map(([k,p])=>[k,load(dir+p)]));
const original=Object.fromEntries(Object.entries(manifest.bases).map(([k,p])=>[k,load(manifest.sourceDir+'/'+p)]));
const code=(role,id)=>w[role].nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='code').value;
const fn=(id,role='child')=>vm.runInNewContext(code(role,id)+'\nmain');
const plain=x=>JSON.parse(JSON.stringify(x)),results=[];
function test(name,f){f();results.push({name,pass:true});}
const verify=vm.runInNewContext(fs.readFileSync('work/evidence-depth-20260929/verification.js','utf8')+'\nverifyCandidateEvidence');
const packet={case_id:'TEST',case_context:'测试患者出现条件甲，另一检查结果乙尚未回报。',case_timeline:'阶段一｜使用测试方案；阶段二｜患者拒绝再次放疗。',disease:'测试疾病',biomarkers:'标志物丙阳性。'};
const body='【仅用于程序测试，不是医学依据】条件甲且满足乙时可考虑方案甲；尚未满足乙时继续评估，不直接实施该方案。方案乙适用于条件丙。基线至少1个病灶，数值为0.5，不可改成5。';
const records=Array.from({length:5},(_,i)=>({evidence_id:'E'+(i+1),doc_id:'testdoc'+i,split_index:0,type:'guideline',authority:'测试机构',source_title:'测试指南'+i,source_version:'2026',source_section:'',source_url:'',hard_evidence_type:'指南',reasoning_eligible:true,raw_snippet:body,snippet:'摘要不得作为全文替代'}));
const pool={records,retrieval_health:{ok:true,errors:[]},compression_report:{kept_total:5}};
function draft(){return {schema_version:'1.1',generation_status:'success',case_summary:'仅用于程序契约测试',question_count:5,difficulty:'进阶',missing_information:[],risk_message:'',questions:Array.from({length:5},(_,i)=>({id:'Q'+(i+1),type:'治疗决策',phase:'阶段'+i,timepoint:'阶段二',question:'在测试条件'+i+'下，下列哪项正确？',options:['方案甲'+i,'方案乙'+i,'方案丙'+i,'方案丁'+i],answer:0,answer_text:'方案甲'+i,keyPoint:'测试条件限定原则'+i,explain:{A:'测试记录支持在该条件下采用此方案。',B:'该方案需要题干尚未满足的条件。',C:'该方案适用的情境与此时点不同。',D:'该方案不满足题干已知的条件。'},evidence_id:'E'+(i+1),support_mode:'hard',evidence_summary:'测试记录明确区分适用条件',verification:{quotes:Object.fromEntries(['A','B','C','D'].map(k=>[k,['条件甲且满足乙时可考虑方案甲']])),case_facts:[{field:'case_context',quote:'另一检查结果乙尚未回报'}],closest_alternative:'B',decision_boundary:'测试中乙尚未回报，不能默认已满足；条件改变时须重新匹配条款。'}}))};}
const assemble=(d,id='v12AssemblyR2',p=pool,c=packet)=>fn(id)({candidate_json:typeof d==='string'?d:JSON.stringify(d),evidence_pool:p,case_packet:c,second_cancer_type:'直肠癌'});
function finish(a,d=draft(),overrides={}){return fn('v12FinalPublicationNormalize')({candidate_json:a.candidate_json_passthrough,structure_decision:a.structure_decision,structure_errors:a.structure_errors,structure_warnings:a.structure_warnings,cited_evidence:a.cited_evidence_json,evidence_pool:pool,evidence_verification:a.evidence_verification,case_id:'TEST',second_cancer_type:'直肠癌',second_round_raw:JSON.stringify(d),first_round_raw:'首轮测试',...overrides});}
function outer(env){const p=fn('bJcPjyWI8hiwuVOS','outer')({group1:env,case_packet:JSON.stringify(packet)});return fn('jKqMCN8eJKvkngnI','outer')({candidate_pool:p.candidate_pool,case_id:'TEST',case_context:packet.case_context,case_timeline:packet.case_timeline,second_cancer_type:'直肠癌',transport_mode:'__ONCOROUNDS_BATCH_V2__'});}
test('三个工作流全部代码节点语法通过',()=>{for(const role of Object.keys(w))for(const n of w[role].nodes)for(const i of n.inputs)if(i.key==='code')new vm.Script(i.value);});
test('仅修改六个子应用节点，外层、检索、模型配置与原连线保持',()=>{
 assert.deepEqual(w.outer,original.outer);assert.deepEqual(w.batch,original.batch);assert.deepEqual(w.child.edges,original.child.edges);
 const allowed=new Set(manifest.changes.map(n=>n.id));assert.equal(allowed.size,6);
 for(const n of w.child.nodes){const b=original.child.nodes.find(x=>x.nodeId===n.nodeId);if(!allowed.has(n.nodeId))assert.deepEqual(n,b);for(const i of b.inputs)if(!['code','systemPrompt'].includes(i.key))assert.deepEqual(n.inputs.find(j=>j.key===i.key),i);}
});
test('所有代码变量和文本模板引用有效',()=>{
 for(const workflow of Object.values(w))for(const n of workflow.nodes)for(const i of n.inputs){
  const check=(id,out)=>{if(id==='VARIABLE_NODE_ID'){assert(workflow.chatConfig.variables.some(v=>v.key===out));return;}const src=workflow.nodes.find(x=>x.nodeId===id);assert(src,n.name+'缺节点');assert(src.outputs.some(o=>o.id===out),n.name+'缺输出');};
  if(i.selectedType==='reference'&&Array.isArray(i.value)){
   if(typeof i.value[0]==='string')check(...i.value);else for(const ref of i.value)if(Array.isArray(ref))check(...ref);
  }
  if(i.key!=='code'&&typeof i.value==='string')for(const m of i.value.matchAll(/\{\{\$([^.$]+)\.([^$]+)\$\}\}/g))check(m[1],m[2]);
 }
});
test('五题20个选项原句均核对，完整四行解析与选项顺序保持',()=>{
 const d=draft(),before=JSON.stringify(d);
 for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2']){const a=assemble(d,id);assert.equal(a.structure_decision,'PASS',JSON.stringify(a.structure_errors));assert.equal(a.evidence_verification.decision,'PASS');assert.equal(a.evidence_verification.question_checks.length,5);
 const p=JSON.parse(a.candidate_json_passthrough);p.questions.forEach((q,i)=>{assert.deepEqual(q.options,d.questions[i].options);assert.equal(q.explain.split('\n').length,4);assert(!('verification' in q));});}
 assert.equal(JSON.stringify(d),before);
});
test('旧稿缺核对材料不得直接放行，第二轮能看到逐题缺口',()=>{
 const d=draft();for(const q of d.questions)delete q.verification;
 const a=assemble(d);assert.equal(a.structure_decision,'FAIL');assert(a.structure_errors.some(s=>s.includes('VERIFICATION_MISSING')));
 const r=JSON.parse(fn('v12RevisionInput')({previous_candidate:JSON.stringify(d),case_packet:packet,evidence_pool:pool,structure_errors:a.structure_errors}).system_text);
 assert.equal(r.review_plan.evidence_verification.question_checks.length,5);assert(r.review_plan.evidence_verification.errors.some(s=>s.includes('Q5')));
 assert.equal(r.evidence_pool.records[0].snippet,body);
});
const rejects=[
 ['伪造原句',d=>d.questions[0].verification.quotes.A=['不存在的指南原句不能自动通过']],
 ['从摘要借句',d=>d.questions[0].verification.quotes.B=['摘要不得作为全文替代']],
 ['把至少改为至多',d=>d.questions[0].verification.quotes.C=['基线至多1个病灶，数值为0.5']],
 ['把0.5改成5',d=>d.questions[0].verification.quotes.D=['基线至少1个病灶，数值为5']],
 ['删除否定',d=>d.questions[0].verification.quotes.A=['尚未满足乙时继续评估，直接实施该方案']],
 ['不连续原句拼接',d=>d.questions[0].verification.quotes.A=['条件甲且满足乙时可考虑方案甲；方案乙适用于条件丙']],
 ['原句仅关键词',d=>d.questions[0].verification.quotes.A=['可考虑']],
 ['缺一个选项原句',d=>delete d.questions[0].verification.quotes.D],
 ['原句数组为空',d=>d.questions[0].verification.quotes.D=[]],
 ['病例事实不在原字段',d=>d.questions[0].verification.case_facts[0].quote='患者确认满足全部用药条件'],
 ['不把候选决策当病例事实',d=>d.questions[0].verification.case_facts[0].field='decision_points'],
 ['竞争项不能是正确项',d=>d.questions[0].verification.closest_alternative='A'],
 ['缺判别依据',d=>d.questions[0].verification.decision_boundary='']
];
for(const [name,mutate] of rejects)test(name+'会拦截',()=>{const d=draft();mutate(d);for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2'])assert.equal(assemble(d,id).structure_decision,'FAIL');assert.equal(finish(assemble(d),d).output_ready,false);});
test('另一记录有完全相同引文也不能借用',()=>{
 const d=draft();d.questions[0].verification.quotes.A=['另一记录独有的真实语句且长度足够'];const p=structuredClone(pool);p.records[1].raw_snippet+='另一记录独有的真实语句且长度足够';
 assert(assemble(d,'v12AssemblyR2',p).structure_errors.some(s=>s.includes('Q1 [OPTION_QUOTE_NOT_FOUND]')));
});
test('真正原文的不等号、数值和否定可以逐字通过',()=>{
 const d=draft(),p=structuredClone(pool);p.records[0].raw_snippet+='入组要求≤1个病灶，排除≥2个病灶；该测试句不代表医学事实。';
 d.questions[0].verification.quotes.A=['入组要求≤1个病灶，排除≥2个病灶'];assert.equal(assemble(d,'v12AssemblyR2',p).structure_decision,'PASS');
 d.questions[0].verification.quotes.A=['入组要求≥1个病灶，排除≥2个病灶'];assert.equal(assemble(d,'v12AssemblyR2',p).structure_decision,'FAIL');
});
test('容忍空白排版差异，但不删除英文单词边界',()=>{
 const d=draft(),p=structuredClone(pool);p.records[0].raw_snippet+=' Patients\n  with condition A may receive treatment B.\nThere is no where clause for this example.';
 d.questions[0].verification.quotes.A=['Patients with condition A may receive treatment B.'];let r=assemble(d,'v12AssemblyR2',p);assert.equal(r.structure_decision,'PASS');assert.equal(r.evidence_verification.question_checks[0].option_checks[0].quotes[0].match_mode,'layout_whitespace_only');
 d.questions[0].verification.quotes.A=['There is nowhere clause for this example.'];assert.equal(assemble(d,'v12AssemblyR2',p).structure_decision,'FAIL');
});
test('返回原句上下文、定位及重复出现次数，不裁掉限定词',()=>{
 const d=draft(),p=structuredClone(pool);p.records[0].raw_snippet='仅限阶段甲，'+body+'\n'+body;
 const r=assemble(d,'v12AssemblyR2',p).evidence_verification.question_checks[0];
 assert.equal(r.option_checks[0].quotes[0].occurrences,2);assert(r.option_checks[0].quotes[0].contexts[0].text.includes('仅限阶段甲'));assert.equal(r.source_locator.doc_id,'testdoc0');
});
test('未提供病例包或病例原句缺失时不能跳过核对',()=>{
 for(const c of [undefined,null,{},'{invalid'])assert.equal(assemble(draft(),'v12AssemblyR2',pool,c===undefined?{}:c).structure_decision,'FAIL');
});
test('文字匹配不冒充语义支持：无关真引文仍需模型/人工复核',()=>{
 const d=draft();d.questions[0].options[0]='无关且没有医学依据的测试主张';d.questions[0].answer_text=d.questions[0].options[0];
 const r=verify(d,pool,packet);assert.equal(r.decision,'PASS');assert.equal(r.semantic_support,'not_independently_verified');
 // This deliberately documents the limit, rather than claiming code understands medicine.
});
test('核对通过后才能完整五题输出，诊断附带原句但公开题目不泄露内部字段',()=>{
 const d=draft(),a=assemble(d),f=finish(a,d),env=JSON.parse(f.publication_payload_json);
 assert.equal(f.status,'OUTPUT_READY');assert.equal(f.publishable,false);assert.equal(env.medical_review_status,'not_performed');assert.equal(env.workflow_revision,manifest.revision);
 assert.equal(env.diagnostics.evidence_verification.decision,'PASS');assert.equal(env.diagnostics.evidence_verification.question_checks[0].option_checks.length,4);
 assert(!JSON.parse(f.final_response_json).questions.some(q=>'verification' in q));
 for(const report of [null,{...a.evidence_verification,decision:'FAIL'},{...a.evidence_verification,question_checks:a.evidence_verification.question_checks.slice(0,4)}])assert.equal(finish(a,d,{evidence_verification:report}).status,'FORMAT_ERROR');
});
test('1至4题不计成功，零题证据不足也无需伪造核对材料',()=>{
 for(let count=1;count<5;count++){const d=draft();d.questions=d.questions.slice(0,count);d.question_count=count;const f=finish(assemble(d),d);assert.equal(f.status,'INCOMPLETE_QUESTION_SET');assert.equal(f.output_ready,false);}
 const d={...draft(),generation_status:'insufficient',questions:[],question_count:0,missing_information:['缺少可支持决策的正式证据'],risk_message:'不能安全出题'};assert.equal(finish(assemble(d),d).status,'STOP_INSUFFICIENT');
});
test('解析、引用定位与题量规则仍会拦截，不被新核对掩盖',()=>{
 for(const mutate of [d=>delete d.questions[4].explain.D,d=>d.questions[0].answer_text='错配',d=>d.questions[0].evidence_id='MISSING',d=>d.question_count=4,d=>d.questions[0].options[1]=d.questions[0].options[0]]){const d=draft();mutate(d);assert.equal(assemble(d).structure_decision,'FAIL');}
 assert.equal(assemble('{broken').structure_decision,'FAIL');assert.equal(assemble(draft(),'v12AssemblyR2',{...pool,retrieval_health:{ok:false,errors:[{lane:'test',message:'failed'}]}}).structure_decision,'FAIL');
});
test('新诊断贯穿单例和批量，失败仍为原文件槽位',()=>{
 const good=outer(finish(assemble(draft())).publication_payload_json),bad=draft();bad.questions[4].verification.quotes.D=['模型编造的一条完全不存在的原句'];
 const failure=outer(finish(assemble(bad),bad).publication_payload_json);
 const r=fn('batchFinal20260909','batch')({expected_count:2,results:[good,failure].map(x=>({success:true,data:x.response_json}))});
 assert.equal(r.batch_report.complete_count,1);assert.equal(r.batch_report.failed_count,1);assert.equal(r.batch_report.items[1].code,'FORMAT_ERROR');assert.equal(r.output_data[1].Questions.question_count,0);
 const diagnostics=r.batch_report.items[1].execution_report.source_groups[0].workflow_diagnostics;
 assert(diagnostics.evidence_verification.errors.some(e=>e.includes('Q5 [OPTION_QUOTE_NOT_FOUND]')));
 assert(diagnostics.second_round_raw.includes('模型编造'));assert.equal(r.output_data[0].Questions.question_count,5);
 fs.writeFileSync(dir+'诊断传递测试样例.json',JSON.stringify({synthetic:true,not_medical_content:true,batch_report:plain(r.batch_report)},null,2));
});
test('真实旧结果缺少原句材料会明示待补，不冒充已通过加强核对',()=>{
 const pair=load('work/flash-plus-pair-20260929/flash.json'),g=pair.selection_report.source_groups[0];
 const d={questions:pair.final_data.questions.map(q=>({...q,evidence_id:g.workflow_diagnostics.question_evidence_bindings.find(b=>b.question_id===q.id).evidence_id}))};
 const r=verify(d,{records:g.workflow_diagnostics.cited_evidence_snapshot},{});
 assert.equal(r.decision,'FAIL');assert.equal(r.question_checks.length,5);assert(r.question_checks.every(x=>x.errors.some(e=>e.code==='VERIFICATION_MISSING')));
});
test('旧批量十例公开接口仍兼容，不能由此宣称新原句门槛已过',()=>{
 const old=load('work/latest-batch-20260929/results.json').output_data;
 const r=fn('batchFinal20260909','batch')({expected_count:10,results:old.map(data=>({success:true,data}))});assert.equal(r.batch_report.complete_count,7);assert.equal(r.batch_report.incomplete_count,3);
});
test('内部14字段示例与检查同步，外层公开结构保持原样',()=>{
 const prompt=w.child.nodes.find(n=>n.nodeId==='sR35QbYF2xamDQR3').inputs.find(i=>i.key==='systemPrompt').value;
 const sample=JSON.parse(prompt.split('\n').find(s=>s.startsWith('{"schema_version"')));assert.equal(Object.keys(sample).length,8);assert.equal(Object.keys(sample.questions[0]).length,14);assert(!prompt.includes('13字段'));
 assert(prompt.includes('不输出自评高分'));assert(prompt.includes('病例依赖检查'));
 const single=outer(finish(assemble(draft())).publication_payload_json);assert.deepEqual(Object.keys(single.output_data),['Questions','detail']);assert(!JSON.stringify(single.output_data).includes('verification'));
});
fs.writeFileSync(dir+'离线检查报告.json',JSON.stringify({check_count:results.length,checks:results,online_verified:false,medical_correctness_verified:false,real_model_generation:false,synthetic_fixtures_not_medical_evidence:true,quote_matching_does_not_verify_entailment:true},null,2));
console.log(results.length+' checks passed');
