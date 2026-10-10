const batch=load(dir+'03-批量生成-全流程优化版.json'),runBatch=fn('batchFinal20260909',batch);
function outerTransport(env,mode='__ONCOROUNDS_BATCH_V2__'){
 const c=fn('bJcPjyWI8hiwuVOS',outer)({group1:env,case_packet:JSON.stringify({case_id:'TEST'})});
 return fn('jKqMCN8eJKvkngnI',outer)({candidate_pool:c.candidate_pool,case_id:'TEST',second_cancer_type:'直肠癌',case_context:'脱敏测试',transport_mode:mode,extraction_check:{scope:'test'}});
}
const completeEnv=()=>finish(assemble(objDraft()),objDraft()).publication_payload_json;
test('三个工作流全部节点语法和新增变量引用合法',()=>{
 for(const w of [child,outer,batch]){
  const ids=new Set(w.nodes.map(n=>n.nodeId));
  for(const n of w.nodes){
   for(const i of n.inputs){if(i.key==='code')new vm.Script(i.value);if(i.selectedType==='reference'&&Array.isArray(i.value)&&typeof i.value[0]==='string'){
    assert(ids.has(i.value[0]));assert(w.nodes.find(x=>x.nodeId===i.value[0]).outputs.some(o=>o.id===i.value[1]),n.name+'.'+i.key);
   }}
  }
 }
});
test('病例限制原句保留时点和拒绝范围，专家意见不写进患者事实',()=>{
 const extraction={...payload,learning_points_candidate:payload.learning_points,decision_points_candidate:payload.decision_points};
 const cleaned='【患者病例正文】\n2021年9月患者拒绝再次放疗，T-DXd获取受限。\n【专家观点】\n患者不应拒绝所有治疗。';
 const result=fn('ogy1PAMdD268kXeo',outer)({case_json:JSON.stringify(extraction),cleaned_text:cleaned});
 const p=JSON.parse(result.case_payload_json);assert.equal(Object.keys(p).length,14);
 assert(p.evidence_notes.includes('2021年9月患者拒绝再次放疗，T-DXd获取受限。'));assert(!p.evidence_notes.includes('不应拒绝所有'));
 assert.equal(p.case_timeline,extraction.case_timeline);assert.equal(result.evidence_notes,p.evidence_notes);
 assert.equal(result.extraction_check.retained_excerpts.length,1);
});
test('缺正文不从点评恢复事实，已有原句不重复追加',()=>{
 const guard=vm.runInNewContext(fs.readFileSync('work/full-review-20260929/constraint-guard.js','utf8')+'\npreserveConstraintExcerpts');
 const s={evidence_notes:'已有记录',case_timeline:'2021年患者拒绝再次放疗。'};
 assert.equal(guard(s,'【专家观点】患者拒绝治疗。').patient_section_found,false);assert.equal(s.evidence_notes,'已有记录');
 assert.equal(guard(s,'【患者病例正文】\n2021年患者拒绝再次放疗。\n【专家观点】其他').retained_excerpts.length,0);
});
test('真实病例限制片段回放保留拒绝放疗和药物获取受限',()=>{
 const source=fs.readFileSync('work/batch2-20260929/163395.txt','utf8');
 const line=source.split(/\r?\n/).find(x=>x.includes('拒绝再次放疗'));assert(line);
 const guard=vm.runInNewContext(fs.readFileSync('work/full-review-20260929/constraint-guard.js','utf8')+'\npreserveConstraintExcerpts');
 const p={case_timeline:'2021年9月开始RC48。',evidence_notes:''};
 guard(p,'【患者病例正文】\n'+line+'\n【专家观点】无');
 assert(p.evidence_notes.includes('拒绝再次放疗'));assert(p.evidence_notes.includes('T-DXd'));assert(p.evidence_notes.includes('2019 年 4 月'));
});
test('B路真实使用后线决策点，保留治疗与分子信息，最长480字符',()=>{
 const input={disease:'乳腺癌',case_timeline:'一线｜使用mFOLFOX6治疗；后线｜停用原方案，改为其他治疗',biomarkers:'KRAS未突变；HER2阳性',decision_points:'复评｜脑膜转移｜后线与局部协调；患者拒绝再次放疗'};
 const r=fn('nWJ1txLnlLszyUU5')(input);assert(r.system_text.includes('脑膜转移'));assert(r.system_text.includes('拒绝再次放疗'));assert(r.system_text.includes('mFOLFOX6'));assert(r.system_text.includes('KRAS'));
 assert(r.system_text.length<=480);assert(r.query_report.selected_segments.decision_points.length>0);
 const max=fn('nWJ1txLnlLszyUU5')({...input,disease:'癌'.repeat(130),decision_points:'后线'+ '测'.repeat(97),case_timeline:'治疗'+'测'.repeat(112),biomarkers:'HER2'+'测'.repeat(65)});assert(max.system_text.length<=480);
});
test('两个主要提示词缩短，第二轮不再20次重复相同核对指令，全文仍完整',()=>{
 const stats=load(dir+'修改记录.json');for(const p of stats.promptStats)assert(p.after<p.before);
 const r=JSON.parse(fn('v12RevisionInput')({previous_candidate:JSON.stringify(objDraft()),evidence_pool:pool}).system_text);
 assert(r.review_plan.question_checks.every(q=>q.option_review.length===4&&q.option_review.every(o=>!('review_required' in o))));
 assert.equal(r.evidence_pool.records[0].snippet,records[0].raw_snippet);
});
test('失败时保留两轮原文及可解析草稿，不擅自宣称截断原因',()=>{
 const x=objDraft();delete x.questions[4].keyPoint;const a=assemble(x);
 const r=fn('v12FinalPublicationNormalize')({candidate_json:a.candidate_json_passthrough,structure_decision:a.structure_decision,structure_errors:a.structure_errors,first_round_raw:'首轮原文',second_round_raw:JSON.stringify(x),second_cancer_type:'直肠癌'});
 const env=JSON.parse(r.publication_payload_json);assert.equal(r.status,'FORMAT_ERROR');assert.equal(env.diagnostics.first_round_raw,'首轮原文');assert.equal(env.diagnostics.parsed_second_round_draft.questions.length,5);assert.equal(env.diagnostics.model_execution.finish_reason,null);
 assert.equal(JSON.parse(r.final_response_json).question_count,0);
});
test('单例默认仍仅Questions和detail；批量显式模式才携带诊断',()=>{
 const single=outerTransport(completeEnv(),'普通输入'),transport=outerTransport(completeEnv());
 assert.deepEqual(Object.keys(JSON.parse(single.response_json)),['Questions','detail']);
 assert.deepEqual(JSON.parse(single.output_json),JSON.parse(transport.output_json));
 const t=JSON.parse(transport.response_json);assert.equal(t.record_type,'oncorounds_batch_item');assert.equal(t.execution_report.source_groups[0].workflow_revision,'20260929-full-review-five');
 assert(t.execution_report.source_groups[0].workflow_diagnostics.cited_evidence_snapshot.length===5);
});
test('子应用到单例再到批量：版本、失败类型、原文诊断全程保留且顺序不变',()=>{
 const good=outerTransport(completeEnv());
 const x=objDraft();delete x.questions[4].explain.D;
 const bad=outerTransport(finish(assemble(x),x).publication_payload_json);
 const empty={...objDraft(),generation_status:'insufficient',question_count:0,questions:[],missing_information:['暂无对应证据'],risk_message:'返回记录不足以支持完整决策'};
 const insufficient=outerTransport(finish(assemble(empty),empty).publication_payload_json);
 const r=runBatch({expected_count:3,results:[good,bad,insufficient].map(v=>({success:true,data:v.response_json}))});
 assert.equal(r.batch_report.complete_count,1);assert.equal(r.batch_report.failed_count,1);assert.equal(r.batch_report.incomplete_count,1);
 assert.equal(r.batch_report.items[1].code,'FORMAT_ERROR');assert.equal(r.batch_report.items[2].code,'STOP_INSUFFICIENT');
 assert(r.batch_report.items[1].execution_report.source_groups[0].workflow_diagnostics.second_round_raw.includes('Q5'));
 assert.deepEqual(plain(r.batch_report.retry_file_indices),[2,3]);assert.equal(r.output_data.length,3);
 assert.deepEqual(Object.keys(JSON.parse(r.response_json)),['output_data','batch_report']);
 fs.writeFileSync(dir+'诊断传递测试样例.json',JSON.stringify({synthetic_contract_fixture:true,result:plain(r.batch_report)},null,2));
});
test('批量拒绝状态矛盾、错病例报告、错误解析标签和重复选项',()=>{
 const t=JSON.parse(outerTransport(completeEnv()).response_json);
 for(const mutate of [x=>x.execution_report.status='FORMAT_ERROR',x=>x.execution_report.case_id='WRONG',x=>x.output_data.Questions.questions[0].explain='A｜不正确：错误标签',x=>x.output_data.Questions.questions[0].options.B=x.output_data.Questions.questions[0].options.A]){
  const x=structuredClone(t);mutate(x);const r=runBatch({expected_count:1,results:[{success:true,data:x}]});assert.equal(r.batch_report.complete_count,0);assert.equal(r.batch_report.failed_count,1);
 }
});
test('上一批真实十例输出兼容保留7例完成、3例未完成，旧格式不臆测失败类型',()=>{
 const old=load('work/latest-batch-20260929/results.json').output_data;
 const r=runBatch({expected_count:10,results:old.map(data=>({success:true,data}))});
 assert.equal(r.batch_report.complete_count,7);assert.equal(r.batch_report.incomplete_count,3);assert.equal(r.batch_report.failed_count,0);
 assert(r.batch_report.items.filter(x=>x.status==='incomplete').every(x=>x.code==='NO_COMPLETE_QUESTION_SET'&&x.execution_report===null));
 fs.writeFileSync(dir+'上批十例兼容回放.json',JSON.stringify({scope:'transport_and_structure_only',model_rerun:false,medical_correctness_verified:false,batch_report:plain(r.batch_report)},null,2));
});
test('批量失败槽位保留，非法JSON与执行错误不当成证据不足',()=>{
 const r=runBatch({expected_count:3,results:[{success:false},{success:true,data:'not json'},null]});
 assert.deepEqual(plain(r.batch_report.items.map(x=>x.code)),['CHILD_WORKFLOW_ERROR','INVALID_JSON','BATCH_INTERRUPTED']);assert.equal(r.output_data.length,3);
});
test('三层模板引用、应用调用绑定及模型配置保持可追溯',()=>{
 const manifest=load(dir+'修改记录.json');
 for(const [role,w] of Object.entries({child,outer,batch})){
  const original=load(manifest.sources[role]);assert.deepEqual(w.edges,original.edges);
  for(const n of w.nodes){
   const old=original.nodes.find(x=>x.nodeId===n.nodeId);
   if(n.flowNodeType==='appModule')assert.equal(n.pluginId,old.pluginId);
   if(n.flowNodeType==='chatNode')for(const i of n.inputs.filter(i=>i.key!=='systemPrompt'))assert.deepEqual(i,old.inputs.find(x=>x.key===i.key));
   for(const i of n.inputs)if(i.key!=='code'&&typeof i.value==='string')for(const m of i.value.matchAll(/\{\{\$([^.$]+)\.([^$]+)\$\}\}/g)){
    const target=w.nodes.find(x=>x.nodeId===m[1]);assert(target,n.name+'缺少变量节点');assert(target.outputs.some(o=>o.id===m[2]),n.name+'缺少变量输出');
   }
  }
 }
 assert.equal(outer.nodes.find(n=>n.nodeId==='ddwhzFImUXV1QTsA').pluginId,'6a96a10d67bd869e3352af48');
 assert.equal(batch.nodes.find(n=>n.nodeId==='iW8Qg5stNA8T2Qp9').pluginId,'6a991c7e2a5b103c1841ea95');
});
