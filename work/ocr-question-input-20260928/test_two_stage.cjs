const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const dir='outputs/两阶段出题修订-20260928/';
const load=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const d=load(dir+'01-出题子应用-两阶段修订.json'),base=load('outputs/当前证据与历史对比-20260928/01-出题子应用-当前证据与历史对比.json');
const outer=load(dir+'02-HTML测试外层-兼容版.json');
const nodes=new Map(d.nodes.map(n=>[n.nodeId,n]));
const code=id=>nodes.get(id).inputs.find(i=>i.key==='code').value;
const fn=id=>vm.runInNewContext(code(id)+'\nmain');
const results=[];function test(name,f){f();results.push({name,pass:true});}
test('全部代码节点语法有效',()=>{for(const n of d.nodes)for(const i of n.inputs||[])if(i.key==='code')new vm.Script(i.value);});
test('连线及变量引用均存在，未引用删除节点',()=>{
 for(const e of d.edges){assert(nodes.has(e.source));assert(nodes.has(e.target));}
 function ref(n,k){assert(nodes.has(n),'missing '+n);assert(nodes.get(n).outputs.some(o=>o.id===k),'missing '+n+'.'+k);}
 function walk(v){if(Array.isArray(v)){if(v.length===2&&typeof v[0]==='string'&&nodes.has(v[0]))ref(...v);else for(const x of v)walk(x);}else if(v&&typeof v==='object'){for(const [k,x]of Object.entries(v)){if(k==='variable'&&Array.isArray(x)&&x.length===2)ref(...x);else walk(x);}}else if(typeof v==='string'){for(const m of v.matchAll(/\{\{\$([\w]+)\.([\w]+)\$\}\}/g))ref(m[1],m[2]);}}
 for(const n of d.nodes)for(const i of n.inputs||[])if(i.key!=='code')walk(i.value);
 const removed=base.nodes.filter(n=>!nodes.has(n.nodeId)).map(n=>n.nodeId);
 for(const n of d.nodes)for(const i of n.inputs||[])if(Array.isArray(i.value)&&i.value.length===2)assert(!removed.includes(i.value[0]));
});
test('每条出题路径必须经过第二轮且只有一个最终回复',()=>{
 const next=id=>d.edges.filter(e=>e.source===id).map(e=>e.target);
 function paths(id,seen=[]){assert(!seen.includes(id),'cycle');if(id==='yAFis8nTjSwUU5bC'){assert(seen.includes('v12RevisionGenerator'));return;}assert(next(id).length);for(const t of new Set(next(id)))paths(t,[...seen,id]);}
 paths('sR35QbYF2xamDQR3');assert.equal(d.nodes.filter(n=>n.flowNodeType==='answerNode').length,1);
});
test('检索和模型配置保持不变，仅两个出题模型',()=>{
 for(const n of d.nodes.filter(n=>n.flowNodeType==='tool'))assert.deepEqual(n,base.nodes.find(b=>b.nodeId===n.nodeId));
 for(const id of ['sR35QbYF2xamDQR3','v12RevisionGenerator'])assert.equal(nodes.get(id).inputs.find(i=>i.key==='model').value,'qwen3.8-flash');
 assert(!nodes.has('x5dghEdUbp0QQg4T'));assert(!nodes.has('v12ValidatorR2'));
});
const explain=['A｜不正确：该条件下不优先。','B｜正确：该条件与记录的适用范围一致。','C｜不正确：该行动适用于另一阶段。','D｜不正确：题干未满足该行动前提。'].join('\n');
const q={id:'Q1',type:'治疗决策',phase:'方案选择前',timepoint:'初诊时',question:'测试病例的方案如何选择？',options:['甲方案','乙方案','丙方案','丁方案'],answer:1,answer_text:'乙方案',explain,keyPoint:'依据适用条件进行决策',evidence_id:'E1',support_mode:'hard',evidence_summary:'支持条件下的方案选择'};
const record={evidence_id:'E1',doc_id:'test-doc',split_index:0,type:'guideline',authority:'测试机构',source_title:'测试指南',source_version:'2026',source_section:'',source_url:'',hard_evidence_type:'指南',reasoning_eligible:true,snippet:'压缩正文',raw_snippet:'完整正文：限既往未使用该方案的人群，保留排除条件。'};
const pool={records:[record],retrieval_health:{ok:true,errors:[]}};
const draft={schema_version:'1.1',generation_status:'success',case_summary:'脱敏测试病例',question_count:1,difficulty:'进阶',questions:[q],missing_information:['其余决策缺少支持'],risk_message:''};
const assemble=x=>fn('v12AssemblyR2')({candidate_json:typeof x==='string'?x:JSON.stringify(x),evidence_pool:pool,second_cancer_type:'直肠癌'});
const finish=a=>fn('v12FinalPublicationNormalize')({candidate_json:a.candidate_json_passthrough,structure_decision:a.structure_decision,structure_errors:a.structure_errors,structure_warnings:a.structure_warnings,cited_evidence:a.cited_evidence_json,case_id:'TEST',second_cancer_type:'直肠癌'});
test('修订输入保留完整证据限制且支持空首轮草稿',()=>{
 const r=JSON.parse(fn('v12RevisionInput')({case_packet:'{}',previous_candidate:'',evidence_pool:pool,structure_errors:['首轮为空']}).system_text);
 assert.equal(r.evidence_pool.records[0].snippet,record.raw_snippet);assert.equal(r.previous_candidate_raw,'');
});
let result;
test('修订后整题输出，保留答案解析与引用，不伪造医审',()=>{
 const a=assemble(draft);assert.equal(a.structure_decision,'PASS',JSON.stringify(a.structure_errors));
 result=finish(a);assert.equal(result.output_ready,true);assert.equal(result.publishable,false);
 const env=JSON.parse(result.publication_payload_json),got=JSON.parse(env.final_response_json);
 assert.equal(env.medical_review_status,'not_performed');assert.equal(env.selected_candidate_audit,null);assert.equal(env.selected_candidate_round,2);
 assert(!('validation_score' in env));assert(!('validation_decision' in env));
 assert.equal(got.questions[0].explain,explain);assert.equal(got.questions[0].guidelineRef.doc_id,'test-doc');
 assert.equal(env.selected_evidence_context.records[0].raw_snippet,record.raw_snippet);
});
test('空第二轮或非法JSON不会回退首轮',()=>{for(const x of ['','{oops'])assert.equal(finish(assemble(x)).output_ready,false);});
test('答案错配、缺解析、伪造引用与重复前缀被拦截',()=>{
 for(const patch of [{answer_text:'错误'},{explain:'只有总解析'},{evidence_id:'FAKE'},{options:['A)甲方案','乙方案','丙方案','丁方案']}]){
  const x=structuredClone(draft);Object.assign(x.questions[0],patch);assert.equal(finish(assemble(x)).output_ready,false);
 }
});
test('两道延伸题允许，三道拒绝',()=>{
 const x=structuredClone(draft);x.questions=[1,2].map(i=>({...q,id:'Q'+i,question:'【延伸情境】假设后续出现条件'+i+'，如何选择？'}));x.question_count=2;
 assert.equal(finish(assemble(x)).output_ready,true);
 x.questions.push({...x.questions[0],id:'Q3'});x.question_count=3;assert.equal(finish(assemble(x)).output_ready,false);
});
test('明确的零题与技术失败分别输出',()=>{
 const x={...draft,generation_status:'insufficient',question_count:0,questions:[],risk_message:'当前证据不足'};
 assert.equal(finish(assemble(x)).status,'STOP_INSUFFICIENT');assert.equal(finish(assemble('bad')).status,'FORMAT_ERROR');
});
test('外层兼容解析且不会宣称医学审核通过',()=>{
 const n=outer.nodes.find(n=>n.nodeId==='bJcPjyWI8hiwuVOS');const main=vm.runInNewContext(n.inputs.find(i=>i.key==='code').value+'\nmain');
 const r=main({group1:result.publication_payload_json,case_packet:JSON.stringify({case_id:'TEST',second_cancer_type:'直肠癌'})});
 fs.writeFileSync(dir+'外层兼容测试结果.json',JSON.stringify(r,null,2));
 assert.equal(r.candidate_pool.candidate_count,1);assert.equal(r.candidate_pool.groups[0].audit.availability,'not_provided');
 const finalNode=outer.nodes.find(n=>n.nodeId==='jKqMCN8eJKvkngnI');
 const finalMain=vm.runInNewContext(finalNode.inputs.find(i=>i.key==='code').value+'\nmain');
 const f=finalMain({candidate_pool:r.candidate_pool,agent_reply:'{}',case_id:'TEST',second_cancer_type:'直肠癌'});
 assert.equal(f.selection_report.medical_approval_confirmed,false);
 assert.equal(f.final_data.question_count,1);assert.equal(f.final_data.questions[0].explain,explain);
});
fs.writeFileSync(dir+'离线检查报告.json',JSON.stringify({checks:results,online_verified:false,medical_correctness_verified:false},null,2));
console.log(results.length+' checks passed');
