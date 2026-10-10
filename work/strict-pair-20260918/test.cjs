const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'outputs/双工作流-统一限字V5-20260918');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const child=read(path.join(out,'题目生成-统一限字V5-测试版.json')),parent=read(path.join(out,'最终出题-统一限字V5-测试版.json'));
const oldChild=read(path.join(__dirname,'child-source.json')),oldParent=read(path.join(__dirname,'parent-source.json'));
const clone=x=>JSON.parse(JSON.stringify(x));const tests=[];
function test(name,fn){try{fn();tests.push({name,status:'PASS'});}catch(e){tests.push({name,status:'FAIL',error:e.stack});}}
const node=(w,id)=>w.nodes.find(n=>n.nodeId===id);
const code=(w,id)=>node(w,id).inputs.find(i=>i.key==='code').value;
function run(w,id,input){const c=vm.createContext({input:clone(input)});vm.runInContext(code(w,id)+'\nresult=main(input)',c,{timeout:5000});return clone(c.result);}
const ref={evidence_type:'指南',doc_id:'test-source',split_index:1,type:'guideline',authority:'测试来源',source_title:'标题'.repeat(90),source_version:'2024',source_section:'原章节',source_url:'https://example.org/'+('a'.repeat(180)),evidence_summary:'本条用于离线格式校验。'};
const q={id:'Q1',type:'诊断与分期',phase:'初诊',timepoint:'2024.03',question:'如何评估当前病情？',options:['核对已有病例信息','忽略所有检查结果','随意补充缺失数据','直接复制其他病例'],answer:0,answer_text:'核对已有病例信息',explain:'先核对已有信息及缺口，不补造患者事实。',keyPoint:'依据实际资料评估。',guidelineRef:ref};
const packet={case_id:'CASE-TEST',case_title:'测试病例',disease:'乳腺癌',second_cancer_type:'乳腺癌',cancer_type:'乳腺癌',case_context:'40岁女性，乳腺癌术后复发，本次就诊评估病情。',case_timeline:'2024.03：复查结果未明确。',biomarkers:'受体状态未提供。',learning_points:'评估重点',difficulty:'进阶'};
const cand=qs=>({schema_version:'1.1',generation_status:qs.length?'success':'insufficient',case_summary:'测试病例摘要。',difficulty:'进阶',question_count:qs.length,questions:clone(qs),missing_information:[],risk_message:''});
function childFinal(qs,extra={}){return run(child,'v12FinalPublicationNormalize',{...packet,r1_candidate:JSON.stringify(cand(qs)),r1_decision:'REVISE',r1_score:50,...extra});}
function parentFinal(qs,extra={}){
 const p=run(parent,'bJcPjyWI8hiwuVOS',{group1:JSON.stringify(cand(qs)),case_packet:{...packet,...extra}});
 return run(parent,'jKqMCN8eJKvkngnI',{...packet,candidate_pool:p.candidate_pool,agent_reply:JSON.stringify({selected_ids:p.candidate_pool.candidates.map(c=>c.candidate_id),edits:[]}),...extra});
}
test('两套全部代码可编译，节点输入输出引用及连线可定位',()=>{
 for(const w of [child,parent]){
  const ids=new Map(w.nodes.map(n=>[n.nodeId,n]));
  for(const n of w.nodes){if(n.flowNodeType==='code')new vm.Script(code(w,n.nodeId));
   for(const i of n.inputs){const v=i.value;if(i.selectedType==='reference'&&Array.isArray(v)&&v.length===2&&typeof v[0]==='string'&&v[0]!=='VARIABLE_NODE_ID'){
    assert(ids.has(v[0]),n.name);assert(ids.get(v[0]).outputs.some(o=>o.id===v[1]||o.key===v[1]),n.name+' '+v[1]);
   }}
  }for(const e of w.edges){assert(ids.has(e.source));assert(ids.has(e.target));}
 }
});
test('无新增调用、连线/模型/检索参数/应用绑定不变',()=>{
 for(const [a,b] of [[child,oldChild],[parent,oldParent]]){
  assert.deepEqual(a.edges,b.edges);assert.deepEqual(a.chatConfig,b.chatConfig);assert.equal(a.nodes.length,b.nodes.length);
  a.nodes.forEach((n,i)=>{assert.equal(n.nodeId,b.nodes[i].nodeId);assert.deepEqual(n.outputs,b.nodes[i].outputs);
   for(const inp of n.inputs.filter(x=>!['code','systemPrompt'].includes(x.key)))assert.deepEqual(inp,b.nodes[i].inputs.find(x=>x.key===inp.key));
  });
 }
});
test('四个生成/修订/医审提示词统一限字，无旧160/70字指令',()=>{
 for(const id of ['sR35QbYF2xamDQR3','v12RevisionGenerator','x5dghEdUbp0QQg4T','v12ValidatorR2']){
  const s=node(child,id).inputs.find(i=>i.key==='systemPrompt').value;
  assert(s.includes('统一展示长度合同V5'));assert(s.includes('每个选项≤40字'));assert(!/question≤160|explain≤160|keyPoint≤70/.test(s));
 }
});
const limits={question:100,explain:100,keyPoint:35,phase:16,timepoint:40,answer_text:40};
for(const [field,max] of Object.entries(limits))test(field+'在上限接收，超1字在子/父最终回退均被拦截',()=>{
 for(const delta of [0,1]){
  const item=clone(q);item[field]='字'.repeat(max+delta);if(field==='answer_text')item.options[0]=item[field];
  const c=JSON.parse(childFinal([item]).final_response_json);const p=parentFinal([item]).output_data;
  assert.equal(c.question_count,delta?0:1);assert.equal(p.Questions.question_count,delta?0:1);
  if(delta){assert.deepEqual(p.detail,{});assert(p.Questions.missing_information.length);}
 }
});
test('所有选项及证据摘要上限生效，正确答案一致',()=>{
 for(const option of [0,1,2,3])for(const size of [40,41]){
  const x=clone(q);x.options[option]='项'.repeat(size);x.answer_text=x.options[x.answer];
  assert.equal(JSON.parse(childFinal([x]).final_response_json).question_count,size===40?1:0);
  const p=parentFinal([x]).output_data.Questions;assert.equal(p.question_count,size===40?1:0);
  if(p.question_count)assert.equal(p.questions[0].answer_text,p.questions[0].options[p.questions[0].answer]);
 }
 for(const size of [80,81]){const x=clone(q);x.guidelineRef.evidence_summary='据'.repeat(size);assert.equal(parentFinal([x]).output_data.Questions.question_count,size===80?1:0);assert.equal(JSON.parse(childFinal([x]).final_response_json).question_count,size===80?1:0);}
});
test('医审REVISE仍输出限字内题目，来源名称章节链接完整保留',()=>{
 const c=childFinal([q]);assert.equal(c.validation_decision,'REVISE');assert(c.output_ready);assert.equal(c.publishable,false);
 const p=parentFinal([q]).output_data;assert.equal(p.Questions.question_count,1);assert.deepEqual(p.Questions.questions[0].guidelineRef,ref);
});
test('1至5题实际计数，过滤超长题后连续编号，审计不错误重绑定',()=>{
 for(let count=1;count<=5;count++){
  const qs=Array.from({length:count},(_,i)=>({...clone(q),id:'Q'+(i+1),question:'测试决策'+i+'？'}));
  const p=parentFinal(qs).output_data;assert.equal(p.Questions.question_count,count);assert.equal(p.detail.decision_point_count,count);
 }
 const long={...clone(q),question:'长'.repeat(101)},good={...clone(q),id:'Q2'};
 const r=childFinal([long,good],{r1_decision:'PASS',r1_publishable:true,r1_feedback:JSON.stringify({round:1,medical_auditable:true})});
 const e=JSON.parse(r.publication_payload_json);const c=JSON.parse(r.final_response_json);assert.equal(c.questions[0].id,'Q1');assert.equal(r.publishable,false);assert.equal(e.audit_applies_to_selected_candidate,false);assert.equal(e.length_report.rounds[0].removed[0].original_question.question,long.question);
 const p=parentFinal([long,good]);assert.equal(p.final_data.question_count,1);assert.equal(p.final_data.questions[0].id,'Q1');assert.equal(p.selection_report.length_report.removed_questions.length,1);
});
test('第二轮全超长退首轮限字内结果，第二轮有效时优先，合并失败回退',()=>{
 const long={...clone(q),question:'长'.repeat(101)};const good={...clone(q),question:'第二轮决策如何评估？'};
 for(const [item,patch,round] of [[long,'PASS',1],[good,'PASS',2],[good,'FAIL',1]]){
  const r=childFinal([q],{r2_candidate:JSON.stringify(cand([item])),r2_patch_decision:patch,r2_decision:'REVISE'});const e=JSON.parse(r.publication_payload_json);assert.equal(e.selected_candidate_round,round);assert.equal(JSON.parse(r.final_response_json).question_count,1);
 }
});
test('超长且无法分句的病程不回退展示，原文内部保留',()=>{
 const long='未证实'+('检查内容'.repeat(80));const r=parentFinal([q],{case_timeline:JSON.stringify(['2024.03：'+long,'术后3个月：复查待回报。'])});
 const t=r.case_page_data.overview.tabs.find(x=>x.id==='timeline').timeline_items;
 assert(t.every(x=>Array.from(x.detail).length<=90));assert(t[0].detail.includes('暂不展示'));assert.equal(t[1].date,'术后3个月');assert.equal(r.selection_report.length_report.display_fallbacks[0].original,long);
});
test('正常限长病程保留，页面字段边界和所有序列化输出一致',()=>{
 const r=parentFinal([q],{case_timeline:['2024.03：检查未见明确变化。','治疗效果待回报。']});const d=r.output_data.detail;
 assert(d.home.display_title.length<=14);assert(d.home.description.length<=48);assert(d.overview.hero.title.length<=14);assert(d.overview.hero.subtitle.length<=40);
 const timeline=d.overview.tabs.find(x=>x.id==='timeline').timeline_items;assert.equal(timeline[1].date,'时间未详');assert.equal(timeline[0].detail,'检查未见明确变化。');
 for(const x of d.overview.tabs.find(x=>x.id==='summary').summary_items)assert(x.value.length<=50);
 assert.deepEqual(JSON.parse(r.output_json),r.output_data);assert.deepEqual(JSON.parse(r.final_json),r.final_data);assert.deepEqual(JSON.parse(r.case_page_json),r.case_page_data);
});
test('机械硬检两轮都生成精确长度修订任务',()=>{
 const {guidelineRef,...internal}=clone(q);internal.evidence_id='E1';internal.support_mode='hard';internal.evidence_summary='测试摘要';
 for(const nid of ['cmuTcUhJefVm2DC6','v12AssemblyR2']){
  const x={...internal,question:'长'.repeat(101),phase:'阶'.repeat(17),timepoint:'时'.repeat(41),explain:'析'.repeat(101),keyPoint:'要'.repeat(36),options:['选'.repeat(41),...internal.options.slice(1)],answer_text:'选'.repeat(41)};
  const result=run(child,nid,{candidate_json:JSON.stringify(cand([x])),evidence_pool:{records:[]},second_cancer_type:'乳腺癌'});
  for(const field of ['QUESTION_LENGTH','EXPLAIN_LENGTH','KEYPOINT_LENGTH','PHASE_LENGTH','TIMEPOINT_LENGTH','OPTION_LENGTH'])assert(result.repair_tasks.some(t=>t.code===field),nid+' '+field);
 }
});
test('Unicode按字符而非UTF16码元统一计数',()=>{
 const x={...clone(q),question:'𠀀'.repeat(100)};assert.equal(JSON.parse(childFinal([x]).final_response_json).question_count,1);assert.equal(parentFinal([x]).output_data.Questions.question_count,1);
 x.question+='𠀀';assert.equal(JSON.parse(childFinal([x]).final_response_json).question_count,0);
});
test('44例220条引用回归：保留题来源不变，超长题有明确原因和内部记录',()=>{
 const rows=read(path.join(root,'work/detail-edit/original-guidelines-recovery-inventory.json'));
 const limitCode=fs.readFileSync(path.join(__dirname,'limits.js'),'utf8');let total=0;
 for(const row of rows){
  const ctx=vm.createContext({qs:clone(row.original_questions)});vm.runInContext(limitCode+'\nexpected=qs.filter(q=>!questionLengthProblems(q).length)',ctx);const expected=clone(ctx.expected);
  const r=parentFinal(row.original_questions);assert.equal(r.final_data.question_count,expected.length);
  r.final_data.questions.forEach((item,i)=>assert.deepEqual(item.guidelineRef,expected[i].guidelineRef));
  assert.equal(r.selection_report.length_report.removed_questions.length,row.original_questions.length-expected.length);total+=row.original_questions.length;
 }assert.equal(total,220);
});
const report={passed:tests.filter(x=>x.status==='PASS').length,failed:tests.filter(x=>x.status==='FAIL').length,tests,online_tested:false};
fs.writeFileSync(path.join(out,'离线校验报告.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(report.failed)process.exit(1);
