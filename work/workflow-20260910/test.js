const fs=require('fs'), path=require('path'), vm=require('vm'), assert=require('assert/strict');
const base=__dirname, root=path.resolve(base,'../..');
const flows=Object.fromEntries(['generator','triple','batch'].map(t=>[t,JSON.parse(fs.readFileSync(t==='generator' && process.env.ONCOROUNDS_TEST_GENERATOR ? process.env.ONCOROUNDS_TEST_GENERATOR : path.join(base,t+'-updated.json'),'utf8'))]));
const results=[];
function test(name,fn){try{fn();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',error:e.stack});console.error(name,e.message);}}
function run(t,id,input){const n=flows[t].nodes.find(n=>n.nodeId===id); const code=n.inputs.find(i=>i.key==='code').value;
  // Match FastGPT runtime.ts -> codeSandbox.ts: only canEdit inputs enter main(inputs).
  const dynamicInputs=Object.fromEntries(n.inputs.filter(i=>i.canEdit).map(i=>[i.key,input[i.key]]));
  const context=vm.createContext({inputs:JSON.parse(JSON.stringify(dynamicInputs)),URL, console});new vm.Script(code+'\nresult=main(inputs);').runInContext(context,{timeout:6000});return JSON.parse(JSON.stringify(context.result));}
const tax=JSON.parse(fs.readFileSync(path.join(root,'config/tumor-taxonomy/tumor-display-mapping-draft.json'),'utf8'));
function classification(second,disease='原发诊断'){return run('triple','ogy1PAMdD268kXeo',{case_json:JSON.stringify({case_id:'CASE-T',case_title:'测试病例',disease,second_cancer_type:second})});}
const record={doc_id:'DOC-A1',split_index:0,type:'guideline',authority:'测试来源',source_title:'测试分期指南',source_version:'2024',source_section:'分期',source_url:'https://example.org/staging',snippet:'初诊患者应按检查结果评估临床分期，指南推荐结合影像和病理。'};
const rawBody=record.snippet+'限制条件：仅适用于指定人群；'.repeat(110)+'不可扩大到其他治疗阶段。';
function question(i=1,eid='GS1'){return {id:'Q'+i,type:'诊断与分期',phase:'初诊',timepoint:'初诊阶段'+i,question:'决策点'+i+'应如何评估？',options:['核对原始检查结果','采用第二项检查','采用第三项检查','采用第四项检查'],answer:0,answer_text:'核对原始检查结果',explain:'结合已记录的证据决定下一步，不能补造结果。',keyPoint:'决定因素'+i,evidence_id:eid,support_mode:'hard',evidence_summary:'按照检查结果进行分期'};}
function candidate(n=5){return {schema_version:'1.1',generation_status:n?'success':'insufficient',case_summary:'匿名测试病例',question_count:n,difficulty:'进阶',questions:Array.from({length:n},(_,i)=>question(i+1)),missing_information:n?[]:['未提供可形成题目的病例事实'],risk_message:n?'':'资料不足'};}
function publicCandidate(n=5){const c=candidate(n); c.questions=c.questions.map(q=>{const {evidence_id,support_mode,evidence_summary,...r}=q;return {...r,guidelineRef:{...record,evidence_summary}};});return c;}
const audit=(round,decision='REVISE',n=5)=>({round,decision,medical_auditable:true,patch_merge_decision:'PASS',question_checks:Array.from({length:n},(_,i)=>({id:'Q'+(i+1),passed:decision==='PASS',problems:decision==='PASS'?[]:['待复核限制条件'],revision:decision==='PASS'?'':'保留适用条件'}))});
function norm(n=5,extra={}){return run('generator','v12FinalPublicationNormalize',{r1_candidate:JSON.stringify(publicCandidate(n)),r1_decision:'REVISE',r1_score:35,r1_publishable:false,r1_feedback:JSON.stringify(audit(1,'REVISE',n)),r1_cited_evidence:JSON.stringify([record]),case_id:'CASE-T',case_title:'匿名测试',disease:'乳腺癌伴肺转移',second_cancer_type:'乳腺癌',...extra});}
function pool(n=5){return {schema_version:'triple-selection-1.0',candidate_count:n,case_packet:{case_id:'CASE-T'},groups:[{group_id:'G1',parse_status:'OK'}],candidates:publicCandidate(n).questions.map((q,i)=>({candidate_id:'G1_Q'+(i+1),group_id:'G1',source_question_id:q.id,question:q,source_question_audit:{id:q.id,passed:false,problems:['待复核']},evidence_status:'located'}))};}
function select(p,reply){return run('triple','jKqMCN8eJKvkngnI',{candidate_pool:p,agent_reply:reply,case_id:'CASE-T',disease:'乳腺癌伴肺转移',second_cancer_type:'乳腺癌',case_title:'匿名测试病例',case_context:'已提供病例事实',case_timeline:'初诊：完成病理检查',biomarkers:'未详',decision_points:'评估方案',learning_points:'真实病例决策',difficulty:'进阶',case_image_index:''});}

test('全部代码节点通过JavaScript语法解析',()=>{for(const d of Object.values(flows))for(const n of d.nodes)for(const i of n.inputs)if(i.key==='code')new vm.Script(i.value);});
test('全部连线、变量引用、节点输入输出ID可解析',()=>{
  const issues=[];
  for(const [tag,d] of Object.entries(flows)){
    const ids=new Map(d.nodes.map(n=>[n.nodeId,new Set(n.outputs.flatMap(o=>[o.id,o.key]))]));
    ids.set('VARIABLE_NODE_ID',new Set(d.chatConfig.variables.map(v=>v.key)));
    const check=(a,b,where)=>{if(!ids.has(a))issues.push(`${tag}/${where}:未知节点${a}`);else if(!ids.get(a).has(b))issues.push(`${tag}/${where}:未知输出${a}.${b}`);};
    function walk(v,where){if(Array.isArray(v)){if(v.length===2&&v.every(x=>typeof x==='string')&&(ids.has(v[0])||v[0]==='VARIABLE_NODE_ID'))check(v[0],v[1],where);else v.forEach(x=>walk(x,where));}
      else if(v&&typeof v==='object')Object.values(v).forEach(x=>walk(x,where));
      else if(typeof v==='string')for(const m of v.matchAll(/\{\{\$([^.$]+)\.([^$]+)\$\}\}/g))check(m[1],m[2],where);}
    for(const n of d.nodes){assert.equal(new Set(n.inputs.map(i=>i.key)).size,n.inputs.length);assert.equal(new Set(n.outputs.map(o=>o.id)).size,n.outputs.length);for(const i of n.inputs)if(i.key!=='code'&&i.key!=='systemPrompt')walk(i.value,n.nodeId+'.'+i.key);}
    for(const e of d.edges){assert(ids.has(e.source)&&ids.has(e.target));assert(e.sourceHandle.startsWith(e.source+'-')||e.sourceHandle==='selectedTools');}
  }assert.deepEqual(issues,[]);
});
test('132个二级名称按项目映射，未确认一级留空',()=>{assert.equal(tax.length,132);for(const r of tax){const c=classification(r.second_cancer_type);assert.equal(c.cancer_type,r.cancer_type);assert.equal(c.second_cancer_type,r.second_cancer_type);if(!r.cancer_type)assert(c.taxonomy_warnings.length);}});
test('未知二级与全文转移部位不猜分类',()=>{assert.equal(classification('未知癌','肺肝多发转移').cancer_type,'');assert.equal(classification('乳腺癌','乳腺癌伴肺转移').cancer_type,'胸部肿瘤');assert.equal(classification('胰腺癌','胰腺癌伴肝转移').cancer_type,'消化系统肿瘤');assert.equal(classification('直肠癌').second_cancer_type,'直肠癌');assert.equal(classification('胰腺神经内分泌肿瘤').cancer_type,'神经内分泌肿瘤');});
test('桌面15份病例分类回归及Questions/detail一致',()=>{
  const dir='C:/Users/admin/Desktop/题目',files=fs.readdirSync(dir).filter(f=>f.endsWith('.json'));assert.equal(files.length,15);
  const expected={'37BF6300':'乳腺癌','DE70CBF4':'乳腺癌','C38F9D7E':'乳腺癌','B559946D':'乳腺癌','51D1DA57':'乳腺癌','B5FF3EFE':'乳腺癌','902F741C':'乳腺癌','7D7C02B3':'胰腺癌','CA70947A':'胰腺癌','F5639B6F':'胃癌','8C6E34E9':'胃癌','BE8833A9':'直肠癌','A8792225':'直肠癌','55BF9202':'食管癌','761970EB':'胰腺神经内分泌肿瘤'};
  const summary=[];
  for(const f of files){const d=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8').replace(/^\uFEFF/,''));const q=d.Questions;const c=classification(q.second_cancer_type);
    assert.equal(c.second_cancer_type,expected[q.case_id.replace('CASE-','')]);assert.equal(c.cancer_type,q.cancer_type);if(Object.keys(d.detail).length)assert.equal(c.second_cancer_type,d.detail.second_cancer_type);
    summary.push({file:f,case_id:q.case_id,cancer_type:c.cancer_type,second_cancer_type:c.second_cancer_type});}
  fs.writeFileSync(path.join(base,'classification-regression.json'),JSON.stringify(summary,null,2));
});
test('A1结果与错误进入最终池，原始正文不截断，筛选JSON不携带原文',()=>{
  const out=run('generator','v11EvidenceRegistry',{guideline_a_staging:[{...record,snippet:rawBody}],guideline_a_staging_error:'测试错误诊断'});
  assert(out.evidence_pool.records.length);const r=out.evidence_pool.records[0];assert.equal(r.doc_id,record.doc_id);assert.equal(r.split_index,0);assert.equal(r.raw_snippet,rawBody);assert(r.snippet.length<r.raw_snippet.length);
  assert(!JSON.parse(out.evidence_pool_json).records[0].raw_snippet);assert(out.retrieval_errors.some(e=>e.lane==='guideline_a_staging'));
});
for(let n=1;n<=5;n++)test('装配、审核原文、输出与详情实际'+n+'题',()=>{
  const r={...record,evidence_id:'GS1',raw_snippet:rawBody,hard_evidence_type:'指南',reasoning_eligible:true,eligibility_class:'hard'};
  const a=run('generator','cmuTcUhJefVm2DC6',{candidate_json:JSON.stringify(candidate(n)),evidence_pool:{records:[r],retrieval_health:{ok:true}}});
  const c=JSON.parse(a.candidate_json_passthrough);assert.equal(c.questions.length,n);assert.equal(JSON.parse(a.validator_evidence_json)[0].snippet,rawBody);
  assert.equal(c.questions[0].guidelineRef.doc_id,record.doc_id);assert.equal(c.questions[0].guidelineRef.split_index,0);
  const normalized=norm(n);assert.equal(normalized.status,'OUTPUT_READY');assert.equal(normalized.publishable,false);assert.equal(normalized.validation_decision,'REVISE');
  const out=select(pool(n),'NOT_JSON');assert.equal(out.output_data.Questions.question_count,n);assert.equal(out.output_data.detail.decision_point_count,n);
  assert.equal(out.output_data.Questions.cancer_type,'胸部肿瘤');assert.equal(out.output_data.detail.second_cancer_type,'乳腺癌');
  for(const q of out.output_data.Questions.questions)assert.equal(q.answer_text,q.options[q.answer]);
});
test('零题返回insufficient和空detail，仍携带两级癌种',()=>{const out=select(pool(0),'{}').output_data;assert.equal(out.Questions.generation_status,'insufficient');assert.equal(out.Questions.question_count,0);assert.deepEqual(out.detail,{});assert.equal(out.Questions.second_cancer_type,'乳腺癌');assert(out.Questions.missing_information.length);assert.equal(norm(0).status,'STOP_INSUFFICIENT');});
test('第二轮有效部分题优先，真实REVISE不改为PASS',()=>{const out=norm(5,{r2_candidate:JSON.stringify(publicCandidate(2)),r2_decision:'REVISE',r2_score:20,r2_feedback:JSON.stringify(audit(2,'REVISE',2)),r2_patch_decision:'PASS'});const env=JSON.parse(out.publication_payload_json);assert.equal(env.selected_candidate_round,2);assert.equal(out.validation_decision,'REVISE');assert.equal(JSON.parse(out.final_response_json).question_count,2);assert.equal(out.publishable,false);});
for(const mode of ['parse','merge','empty'])test('第二轮'+mode+'失败回退首轮并绑定首轮审核与证据',()=>{const out=norm(3,{r2_candidate:mode==='parse'?'BAD':JSON.stringify(publicCandidate(mode==='empty'?0:2)),r2_decision:'REVISE',r2_score:0,r2_patch_decision:mode==='merge'?'FAIL':'PASS',r2_feedback:JSON.stringify(audit(2,'REVISE',2))});const env=JSON.parse(out.publication_payload_json);assert.equal(env.selected_candidate_round,1);assert.equal(JSON.parse(out.final_response_json).question_count,3);assert(env.fallback_reason);assert.equal(env.selected_candidate_audit.round,1);assert.equal(env.selected_evidence_context.round,1);});
test('重复候选合并、错误ID回退、优先减少审核问题',()=>{const p=pool(5);p.candidates.push({...p.candidates[0],candidate_id:'G2_Q1',group_id:'G2'});p.candidate_count++;
  p.candidates[4].source_question_audit={passed:true,problems:[]};const r=select(p,'{"selected_ids":["FAKE"]}');assert.equal(r.output_data.Questions.question_count,5);assert.equal(r.selection_report.selection_method,'deterministic_fallback');assert.equal(r.selection_report.selected[0].candidate_id,'G1_Q5');assert(!r.selection_report.selected.some(q=>q.candidate_id==='G2_Q1'));});
test('合法模型ID保留选择顺序，不重写题目医学内容',()=>{const ids=['G1_Q3','G1_Q2','G1_Q1'];const out=select(pool(3),JSON.stringify({selected_ids:ids}));assert.equal(out.selection_report.selection_method,'model_ids');assert.deepEqual(out.selection_report.selected.map(q=>q.candidate_id),ids);assert.equal(out.output_data.Questions.questions[0].question,publicCandidate(3).questions[2].question);});
test('三组候选可读新输出包，审核未通过仍入池',()=>{const r=norm(2);const out=run('triple','bJcPjyWI8hiwuVOS',{group1:r.publication_payload_json,group2:'BAD_JSON',group3:r.publication_payload_json,case_packet:{case_id:'CASE-T',second_cancer_type:'乳腺癌',cancer_type:'胸部肿瘤'}});assert.equal(out.candidate_pool.candidate_count,4);assert.equal(out.candidate_pool.groups[1].parse_status,'ERROR');assert.equal(out.candidate_pool.candidates[0].source_question_audit.passed,false);});
test('10文件按顺序保留单文件失败位置',()=>{const one=select(pool(1),'{}').output_data;const rows=Array.from({length:10},(_,i)=>({success:true,data:JSON.stringify({...one,Questions:{...one.Questions,case_id:'FILE-'+i}})}));rows[4]={success:false,error:'模拟失败'};const out=run('batch','batchFinal20260909',{results:rows,expected_count:10}).output_data;assert.equal(out.length,10);assert.equal(out[4].error.file_index,5);for(let i=0;i<10;i++)if(i!==4)assert.equal(out[i].Questions.case_id,'FILE-'+i);});
test('上传1至10、并发10、重试0、完整结果汇总配置',()=>{
  const p=flows.batch.nodes.find(n=>n.flowNodeType==='parallelRun');const val=k=>p.inputs.find(i=>i.key===k).value;
  assert.equal(Number(val('parallelRunMaxConcurrency')),10);assert.equal(Number(val('parallelRunMaxRetryTimes')),0);
  const f=flows.batch.nodes.find(n=>n.nodeId==='batchFinal20260909').inputs.find(i=>i.key==='results');assert.equal(f.value[1],'parallelFullResults');
  const files=Array.from({length:10},(_,i)=>'https://example.org/'+i+'.pdf');const out=run('batch','batchPrep20260909',{files});assert.equal(out.expected_count,10);assert.deepEqual(out.file_batches,files.map(f=>[f]));assert.throws(()=>run('batch','batchPrep20260909',{files:files.concat('https://example.org/11.pdf')}));
});
test('无不良事件跳过不良反应检索',()=>{for(const adverse_events of ['', '无不良反应','未见明显不良反应']){const out=run('generator','v11IraeSplitInitial',{adverse_events});assert.equal(out.has_a,false);assert.equal(out.has_b,false);assert.equal(out.query_a,'');assert.equal(out.query_b,'');assert.equal(out.needs_fallback,false);}});
test('模型、检索参数保持，清洗提取终选关思考、独立审核保留思考',()=>{for(const tag of ['generator','triple','batch']){const old=JSON.parse(fs.readFileSync(path.join(base,tag+'-original.json'),'utf8'));for(const n of flows[tag].nodes){const prev=old.nodes.find(o=>o.nodeId===n.nodeId);for(const i of n.inputs)if(['model','similarity','limit','searchMode','usingReRank','datasets'].includes(i.key))assert.deepEqual(i.value,prev.inputs.find(x=>x.key===i.key)?.value);}}
  for(const id of ['glGeIMqOVaSRs5jF','t7eXTzfAM2QUzvvK','ltrYX3w0AXTIiF0r'])assert.equal(flows.triple.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='aiChatReasoning').value,false);
  for(const id of ['x5dghEdUbp0QQg4T','v12ValidatorR2'])assert.equal(flows.generator.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='aiChatReasoning').value,true);
});
test('部分题医审PASS保留低分，不按75分阈值重写判定',()=>{
  const review={decision:'PASS',score:60,fatal_errors:[],question_checks:audit(1,'PASS',2).question_checks,repair_tasks:[],recommended_revision_mode:'',revision_instruction:'',missing_information:[],general_feedback:'逐题核验通过'};
  const out=run('generator','v11ReviewMerge',{structure_decision:'PASS',structure_errors:[],structure_warnings:[],medical_auditable:true,mechanical_revision_mode:'',mechanical_repair_tasks:[],candidate_internal_json:JSON.stringify(candidate(2)),candidate_public_json:JSON.stringify(publicCandidate(2)),review_text:JSON.stringify(review)});
  assert.equal(out.decision,'PASS');assert.equal(out.score,60);assert.equal(out.publishable,true);assert.equal(JSON.parse(out.feedback_json).raw_medical_decision,'PASS');
});
for(let n=1;n<=5;n++)test('PATCH '+n+'题只改授权题，其他题原样继承',()=>{
  const prev=candidate(n),raw=JSON.stringify(prev,null,2); const q={...prev.questions[0],explain:'修订解析：明确限制条件，不能把当前结论扩大到其他场景。'};
  const out=run('generator','v12PatchMerge',{previous_internal_json:raw,repair_packet:JSON.stringify({revision_mode:'PATCH',repair_tasks:[{target_ids:['Q1'],code:'EXPLANATION',fields:['explain'],message:'修订解析'}],preserve_ids:prev.questions.slice(1).map(q=>q.id)}),patch_json:JSON.stringify({revision_mode:'PATCH',generation_status:'success',replacements:[q],missing_information:[],risk_message:''})});
  assert.equal(out.merge_decision,'PASS',JSON.stringify(out.merge_errors));const actual=JSON.parse(out.merged_internal_json);assert.equal(actual.question_count,n);assert.deepEqual(actual.questions.slice(1),prev.questions.slice(1));assert.deepEqual(out.preserved_ids,prev.questions.slice(1).map(q=>q.id));assert.equal(actual.questions[0].explain,q.explain);
});
test('FULL从无可解析首轮恢复2题，无固定五题要求',()=>{
  const out=run('generator','v12PatchMerge',{previous_internal_json:'BROKEN',repair_packet:JSON.stringify({revision_mode:'FULL',repair_tasks:[{target_ids:['Q1','Q2','Q3','Q4','Q5'],code:'REVIEW_REVISE',fields:['question','options','answer','explain'],message:'重建实际题目'}],preserve_ids:[]}),patch_json:JSON.stringify({revision_mode:'FULL',generation_status:'success',case_summary:'匿名病例',replacements:candidate(2).questions,missing_information:['其他决策资料不详'],risk_message:'只形成2题'})});
  assert.equal(out.merge_decision,'PASS',JSON.stringify(out.merge_errors));assert.equal(JSON.parse(out.merged_internal_json).question_count,2);
});
test('FULL局部修订继承未授权题；越权修改必须失败',()=>{
  const prev=candidate(3),packet={revision_mode:'FULL',repair_tasks:[{target_ids:['Q1'],code:'EXPLANATION',fields:['explain'],message:'修订解析'}],preserve_ids:['Q2','Q3']};
  const patch={revision_mode:'FULL',generation_status:'success',case_summary:prev.case_summary,replacements:[{...prev.questions[0],explain:'修订解析且保留适用条件'}],missing_information:[],risk_message:''};
  const runPatch=p=>run('generator','v12PatchMerge',{previous_internal_json:JSON.stringify(prev),repair_packet:JSON.stringify(packet),patch_json:JSON.stringify(p)});
  const out=runPatch(patch);assert.equal(out.merge_decision,'PASS',JSON.stringify(out.merge_errors));assert.deepEqual(JSON.parse(out.merged_internal_json).questions.slice(1),prev.questions.slice(1));
  patch.replacements.push({...prev.questions[1],explain:'越权修改'});assert.equal(runPatch(patch).merge_decision,'FAIL');
});
test('三组汇合等待全部结果；有向图无修订循环、错误分支可达',()=>{
  for(const [tag,d] of Object.entries(flows)){
    const visited=new Set(),active=new Set();function visit(id){assert(!active.has(id),tag+'存在意外循环');if(visited.has(id))return;active.add(id);for(const e of d.edges.filter(e=>e.source===id))visit(e.target);active.delete(id);visited.add(id);}for(const n of d.nodes)visit(n.nodeId);
    for(const n of d.nodes.filter(n=>n.catchError))assert(d.edges.some(e=>e.source===n.nodeId&&e.sourceHandle===n.nodeId+'-source_catch-right'),tag+':错误捕获未接线 '+n.nodeId);
  }
  const incoming=flows.triple.edges.filter(e=>e.target==='bJcPjyWI8hiwuVOS');assert.equal(incoming.length,6);
  // For an acyclic join, FastGPT requires no waiting incoming edge and at least one active edge.
  const ready=states=>states.every(s=>s!=='waiting')&&states.includes('active');assert.equal(ready(['active','skipped','waiting','waiting','waiting','waiting']),false);assert.equal(ready(['active','skipped','skipped','active','active','skipped']),true);
});
test('全部代码参数按平台动态参数规则注册，界面引用不会被沙箱丢弃',()=>{
  for(const [t,d] of Object.entries(flows))for(const n of d.nodes.filter(n=>n.flowNodeType==='code')){
    assert(n.inputs.some(i=>i.key==='system_addInputParam'));
    for(const i of n.inputs.filter(i=>!['code','codeType','system_addInputParam'].includes(i.key)))assert.equal(i.canEdit,true,t+'/'+n.name+'/'+i.key);
  }
});
test('实际肝癌病例的全局变量经过平台取参进入case_packet',()=>{
  const source=JSON.parse(fs.readFileSync('C:/Users/admin/.codex/attachments/6e23a83c-69e6-4b1d-8480-1ce8d34b43ec/pasted-text.txt','utf8')).production_variables;
  const variables=Object.fromEntries(flows.generator.chatConfig.variables.map(v=>[v.key,source[v.label]]));
  const n=flows.generator.nodes.find(n=>n.nodeId==='v12CasePacket');
  const resolved=Object.fromEntries(n.inputs.filter(i=>Array.isArray(i.value)&&i.value[0]==='VARIABLE_NODE_ID').map(i=>[i.key,variables[i.value[1]]]));
  const out=run('generator','v12CasePacket',resolved);assert.equal(out.case_packet.cancer_type,'消化系统肿瘤');assert.equal(out.case_packet.second_cancer_type,'肝癌');assert.deepEqual(out.case_packet.taxonomy_warnings,[]);
});
test('子调用异常消息按真实代码参数入口进入候选池诊断',()=>{
  const out=run('triple','bJcPjyWI8hiwuVOS',{group1:'',group2:'',group3:'',group1_error:'模拟子工作流超时',case_packet:{case_id:'CASE-T'}});
  assert.equal(out.candidate_pool.groups[0].error_code,'CHILD_WORKFLOW_ERROR');assert.equal(out.candidate_pool.groups[0].error,'模拟子工作流超时');
});
fs.writeFileSync(process.env.ONCOROUNDS_TEST_REPORT || path.join(base,'test-results.json'),JSON.stringify(results,null,2));
console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length}));
process.exitCode=results.some(r=>r.status==='FAIL')?1:0;
