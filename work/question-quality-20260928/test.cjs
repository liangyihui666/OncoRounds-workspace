const fs=require('fs'),vm=require('vm');
// Reuse the existing behavioral suite against the new child and unchanged outer.
let suite=fs.readFileSync('work/full-workflow-audit-20260928/test.cjs','utf8');
suite=suite.replace("const slim=process.argv.includes('--slim');","const slim=false;");
suite=suite.replace(/const dir=.*?;\n/,"const dir='outputs/五题内容修订-20260928/';\n");
suite=suite.replace(/const child=load\(dir.*?;\n/,"const child=load(dir+'01-出题子应用-五题内容修订版.json'),outer=load('outputs/五题流程精简-20260928/02-HTML测试外层-五题精简版.json');\n");
const extra=String.raw`
test('仅修改四个目标节点，知识库选择、参数、绑定、全图连线原样保留',()=>{
 const base=load('outputs/恢复知识库检索-20260928/01-出题子应用-保留知识库精简版.json');
 assert.deepEqual(child.edges,base.edges);
 assert.deepEqual(child.nodes.map(n=>n.nodeId),base.nodes.map(n=>n.nodeId));
 const ids=new Set(['sR35QbYF2xamDQR3','v12RevisionGenerator','v12RevisionInput','v12FinalPublicationNormalize']);
 for(const n of child.nodes)if(!ids.has(n.nodeId))assert.deepEqual(n,base.nodes.find(b=>b.nodeId===n.nodeId));
});
test('真实五题的文字线索进入第二轮，程序PASS也逐题复核，且不自动删题',()=>{
 const actual=load('C:/Users/admin/.codex/attachments/18abe43c-7155-4385-ac3f-cee0da276ab2/已粘贴的文本.txt').final_data;
 const draftInput={...actual,questions:actual.questions.map((q,i)=>({...q,options:Object.values(q.options),answer:'ABCD'.indexOf(q.answer),evidence_id:'E'+(i+1)}))};
 const r=JSON.parse(fn('v12RevisionInput')({previous_candidate:JSON.stringify(draftInput),evidence_pool:pool,structure_decision:'PASS'}).system_text);
 assert.equal(r.program_precheck.decision,'PASS');assert.equal(r.review_plan.review_all_questions,true);
 assert.equal(r.review_plan.question_checks.length,5);assert.equal(r.completion_plan.missing_slot_count,0);
 assert.deepEqual(plain(r.review_plan.answer_counts),[5,0,0,0]);assert.equal(r.review_plan.toxicity_question_count,3);
 assert(r.review_plan.question_checks[0].review_cues.includes('准确分期'));
 assert(r.review_plan.question_checks[3].review_cues.some(s=>s.includes('本例后续DIC')));
 assert(r.review_plan.question_checks[4].review_cues.includes('所有'));
 assert.equal(r.evidence_pool.records[2].snippet,records[2].raw_snippet);
 assert.equal(r.previous_candidate_raw,JSON.stringify(draftInput));
});
test('格式损坏或零题仍将完整证据与任务交给第二轮，不产生虚构题目',()=>{
 const r=JSON.parse(fn('v12RevisionInput')({previous_candidate:'{bad',evidence_pool:pool,structure_decision:'FAIL'}).system_text);
 assert.equal(r.completion_plan.missing_slot_count,5);assert.equal(r.review_plan.question_checks.length,0);
 assert.equal(r.previous_candidate_raw,'{bad');assert.equal(r.evidence_pool.records.length,5);
});
test('最终引用正文和逐题定位通过外层进入调试报告，不进入学员题目与病例页',()=>{
 const f=finish(assemble(draft));const env=JSON.parse(f.publication_payload_json);
 assert.equal(env.workflow_revision,'20260928-quality-five');
 assert.equal(env.diagnostics.question_evidence_bindings.length,5);
 assert.equal(env.diagnostics.cited_evidence_snapshot.length,5);
 for(let i=0;i<5;i++){
   assert.equal(env.diagnostics.question_evidence_bindings[i].evidence_id,'E'+(i+1));
   assert.equal(env.diagnostics.cited_evidence_snapshot[i].snippet,records[i].raw_snippet);
 }
 const r=outerRun(f.publication_payload_json);
 assert.equal(r.selection_report.source_groups[0].workflow_diagnostics.cited_evidence_snapshot.length,5);
 for(const d of [r.final_data,r.case_page_data,r.output_data])assert(!JSON.stringify(d).includes('完整测试证据正文'));
});
test('引用不存在时调试定位保持未匹配，不补造原文',()=>{
 const x=structuredClone(draft);x.questions[0].evidence_id='UNKNOWN';
 const a=assemble(x);const env=JSON.parse(finish(a,x).publication_payload_json);
 assert.equal(env.output_ready,false);assert(!env.diagnostics.cited_evidence_snapshot.some(r=>r.evidence_id==='UNKNOWN'));
});
`;
suite=suite.replace('const datasetConfig=',extra+'\nconst datasetConfig=');
vm.runInThisContext('(function(require){'+suite+'\n})',{filename:'question-quality-behavioral-suite.cjs'})(require);
