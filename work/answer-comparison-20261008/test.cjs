const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const dir='outputs/答后答案与病例对照-20261008';
const child=JSON.parse(fs.readFileSync(dir+'/01-五题出题子应用-完整工作流.json'));
const outer=JSON.parse(fs.readFileSync(dir+'/02-OCR清洗与五题生成-完整工作流.json'));
const originalChild=JSON.parse(fs.readFileSync('C:/Users/admin/.codex/attachments/ee08e3f4-ba8a-4c91-bab7-23c021a21be7/已粘贴的文本.txt'));
const originalOuter=JSON.parse(fs.readFileSync('outputs/OCR文本清洗-完整工作流-20261008/OCR文本清洗与五题生成-完整工作流.json'));
const code=(w,id)=>w.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='code').value;
const fn=(w,id)=>vm.runInNewContext(code(w,id)+'\nmain');
const plain=v=>JSON.parse(JSON.stringify(v));
const errorsFor=vm.runInNewContext(fs.readFileSync(__dirname+'/after-answer.js','utf8')+'\nafterAnswerErrors');
const empty=()=>({status:'not_reported',field:'',quote:''});
const known=quote=>({status:'documented',field:'case_timeline',quote});
const packet={case_id:'TEST',case_title:'离线结构测试（非医学病例）',case_context:'测试患者出现条件甲，另一检查结果乙尚未回报。',case_timeline:'阶段一｜患者接受方案甲。\n阶段二｜原文记录患者选择方案乙，原因是患者拒绝方案甲。\n阶段三｜复查结果改善。',disease:'测试疾病',biomarkers:'标志物丙阳性。',case_mode:'全程管理',decision_points:'测试决策'};
function after(status='unknown'){return {schema_version:'1.0',actual_management:empty(),actual_outcome:empty(),comparison:{status,explanation:status==='not_comparable'?'本题为假设延伸，原病例无对应处理及结局。':'原文未记载本题对应实际处理，无法判断一致性。'},difference_reason:empty()};}
const body='【程序测试，非医学证据】条件甲且满足乙时可考虑方案甲；未满足乙时须继续评估。方案乙适用于条件丙。';
const records=Array.from({length:5},(_,i)=>({evidence_id:'E'+(i+1),doc_id:'testdoc'+i,split_index:0,type:'guideline',authority:'测试机构',source_title:'测试指南'+i,source_version:'2026',source_section:'',source_url:'',hard_evidence_type:'指南',reasoning_eligible:true,raw_snippet:body,snippet:body}));
const pool={records,retrieval_health:{ok:true,errors:[]},compression_report:{kept_total:5}};
function draft(){return {schema_version:'1.1',generation_status:'success',case_summary:'离线结构测试',question_count:5,difficulty:'进阶',missing_information:[],risk_message:'',questions:Array.from({length:5},(_,i)=>({id:'Q'+(i+1),type:'治疗决策',phase:'阶段'+i,timepoint:'阶段二',question:'测试条件'+i+'下，下列哪项正确？',options:['方案甲'+i,'方案乙'+i,'方案丙'+i,'方案丁'+i],answer:0,answer_text:'方案甲'+i,keyPoint:'测试原则'+i,explain:{A:'该条件下有测试证据支持。',B:'需要题干尚未满足的条件。',C:'该方案适用其他情境。',D:'该措施不符合现有条件。'},evidence_id:'E'+(i+1),support_mode:'hard',evidence_summary:'测试记录明确区分条件',verification:{quotes:Object.fromEntries(['A','B','C','D'].map(k=>[k,['条件甲且满足乙时可考虑方案甲']])),case_facts:[{field:'case_context',quote:'另一检查结果乙尚未回报'}],closest_alternative:'B',decision_boundary:'尚未确认乙满足，不能自动采用方案。'},after_answer:after()}))};}
const checks=[];function test(name,f){try{f();checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:e.message});}}
const assemble=(d,id='v12AssemblyR2')=>fn(child,id)({candidate_json:JSON.stringify(d),evidence_pool:pool,case_packet:packet,second_cancer_type:'直肠癌'});
function finalize(a,d){return fn(child,'v12FinalPublicationNormalize')({candidate_json:a.candidate_json_passthrough,structure_decision:a.structure_decision,structure_errors:a.structure_errors,structure_warnings:a.structure_warnings,cited_evidence:a.cited_evidence_json,evidence_pool:pool,evidence_verification:a.evidence_verification,case_id:'TEST',second_cancer_type:'直肠癌',second_round_raw:JSON.stringify(d)});}
test('图、检索节点、模型、配置及非目标代码保持',()=>{
 for(const [w,old,ids] of [[child,originalChild,['sR35QbYF2xamDQR3','v12RevisionGenerator','cmuTcUhJefVm2DC6','v12AssemblyR2','v12FinalPublicationNormalize']],[outer,originalOuter,['bJcPjyWI8hiwuVOS','jKqMCN8eJKvkngnI']]]){
  assert.deepEqual(w.edges,old.edges);assert.deepEqual(w.chatConfig,old.chatConfig);assert.equal(w.nodes.length,old.nodes.length);
  for(const n of w.nodes){const prev=old.nodes.find(p=>p.nodeId===n.nodeId);if(!ids.includes(n.nodeId))assert.deepEqual(n,prev);assert.deepEqual(n.inputs.filter(i=>i.key==='model'),prev.inputs.filter(i=>i.key==='model'));}
 }
});
test('全部代码语法、边及变量引用有效',()=>{
 for(const w of [child,outer]){const ids=new Set(w.nodes.map(n=>n.nodeId));for(const e of w.edges){assert(ids.has(e.source));assert(ids.has(e.target));}
  for(const n of w.nodes)for(const i of n.inputs){if(i.key==='code')new vm.Script(i.value);
   const ref=(a,b)=>{if(a==='VARIABLE_NODE_ID')return;const s=w.nodes.find(x=>x.nodeId===a);assert(s&&s.outputs.some(o=>o.id===b),n.name+':'+a+'.'+b);};
   if(i.selectedType==='reference'&&Array.isArray(i.value))for(const r of typeof i.value[0]==='string'?[i.value]:i.value)if(Array.isArray(r))ref(...r);
   if(i.key!=='code'&&typeof i.value==='string')for(const m of i.value.matchAll(/\{\{\$([^.$]+)\.([^$]+)\$\}\}/g))ref(m[1],m[2]);
  }
 }
});
test('两轮15字段契约一致，输出保留对照而移除内部verification',()=>{
 for(const id of ['sR35QbYF2xamDQR3','v12RevisionGenerator']){const p=child.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='systemPrompt').value;assert(p.includes('每题恰好15键'));assert(!p.includes('每题恰好14键'));}
 for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2']){const d=draft(),a=assemble(d,id);assert.equal(a.structure_decision,'PASS',JSON.stringify(a.structure_errors));const f=finalize(a,d);assert.equal(f.output_ready,true);assert.equal(f.publishable,false);const selected=JSON.parse(f.final_response_json);assert.equal(selected.questions.length,5);for(const q of selected.questions){assert.deepEqual(q.after_answer,after());assert(!q.verification);}}
});
test('记录明确的不同处理及原因可回溯，未知结局不导致零题',()=>{
 const d=draft();d.questions[0].after_answer={schema_version:'1.0',actual_management:known('患者选择方案乙'),actual_outcome:known('复查结果改善'),comparison:{status:'different',explanation:'参考方案甲，病例选择方案乙；原文记载患者拒绝方案甲。此为结构测试。'},difference_reason:known('患者拒绝方案甲')};
 assert.equal(assemble(d).structure_decision,'PASS');assert.equal(finalize(assemble(d),d).output_ready,true);
});
test('不同处理但无原因必须明确未说明，不补造原因',()=>{
 const d=draft(),a=d.questions[0].after_answer;a.actual_management=known('患者接受方案甲');a.comparison={status:'different',explanation:'处理存在差异，原文未说明差异原因。'};assert.equal(assemble(d).structure_decision,'PASS');
 a.comparison.explanation='因药物费用高而选择其他方案。';assert.equal(assemble(d).structure_decision,'FAIL');
});
test('篡改处理、结局、原因、原文与摘要冲突均拒绝',()=>{
 for(const key of ['actual_management','actual_outcome','difference_reason']){const d=draft();d.questions[0].after_answer[key]=known('完全未发生的事情');assert.equal(assemble(d).structure_decision,'FAIL');}
 const q=draft().questions[0];q.after_answer.actual_management=known('患者接受方案甲');assert(errorsFor(q,{...packet,case_source_text:'原文仅记载患者接受方案乙。'}).length>0);
});
test('未知不能冒充一致；假设题不能冒充实际治疗',()=>{
 const d=draft();d.questions[0].after_answer.comparison.status='consistent';assert.equal(assemble(d).structure_decision,'FAIL');
 const q=draft().questions[0];q.question='【延伸情境】假设发生条件乙，下列哪项正确？';assert(errorsFor(q,packet).length>0);q.after_answer=after('not_comparable');assert.equal(errorsFor(q,packet).length,0);
});
test('缺少及畸形字段返回检查错误，不引发worker异常',()=>{
 for(const v of [null,{}, {...after(),actual_management:null},{...after(),comparison:null},{...after(),difference_reason:null}]){const q=draft().questions[0];q.after_answer=v;assert(errorsFor(q,packet).length>0);}
 const d=draft();delete d.questions[0].after_answer;assert.equal(assemble(d).structure_decision,'FAIL');
});
test('错误答案、重复选项、假引文、不足五题仍不能完成',()=>{
 for(const edit of [d=>d.questions[0].answer_text='错',d=>d.questions[0].options[1]=d.questions[0].options[0],d=>d.questions[0].verification.quotes.A=['这是从未存在的证据'],d=>{d.questions.pop();d.question_count=4;}]){const d=draft();edit(d);assert.equal(finalize(assemble(d),d).output_ready,false);}
});
test('子应用→候选检查→外层字母答案输出，五题新字段逐字保留',()=>{
 const d=draft(),a=assemble(d),f=finalize(a,d);
 const p=fn(outer,'bJcPjyWI8hiwuVOS')({group1:f.publication_payload_json,case_packet:packet}).candidate_pool;
 assert.equal(p.candidate_count,5);
 const result=fn(outer,'jKqMCN8eJKvkngnI')({...packet,candidate_pool:p,difficulty:'进阶',second_cancer_type:'直肠癌'});
 const output=JSON.parse(result.response_json);
 assert.equal(output.Questions.question_count,5);
 output.Questions.questions.forEach(q=>{assert.deepEqual(q.after_answer,after());assert.equal(q.options[q.answer],q.answer_text);});
 fs.writeFileSync(dir+'/字段示例-仅程序测试非医学病例.json',JSON.stringify(plain(output),null,2));
});
fs.writeFileSync(dir+'/离线检查结果.json',JSON.stringify({checks,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,api_calls:0,online_verified:false,medical_review_status:'not_performed',local_frontend_modified:false},null,2));
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,failures:checks.filter(c=>!c.pass)},null,2));if(checks.some(c=>!c.pass))process.exitCode=1;
