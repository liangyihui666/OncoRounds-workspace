const fs=require('fs'),vm=require('vm');
let suite=fs.readFileSync('work/full-workflow-audit-20260928/test.cjs','utf8');
suite=suite.replace('const slim=process.argv.includes(\'--slim\');','const slim=false;');
suite=suite.replace(/const dir=.*?;\n/,"const dir='outputs/五题结构与证据边界修复-20260928/';\n");
suite=suite.replace(/const child=load\(dir.*?;\n/,"const child=load(dir+'01-出题子应用-五题结构与证据边界修复版.json'),outer=load('outputs/五题流程精简-20260928/02-HTML测试外层-五题精简版.json');\n");
const extra=String.raw`
const objDraft=()=>{const x=structuredClone(draft);for(const q of x.questions)q.explain=Object.fromEntries(q.explain.split('\n').map(s=>[s[0],s.slice(s.indexOf('：')+1)]));return x;};
test('修改六个节点，保留模型参数、知识库、所有输入引用及连线',()=>{
 const base=load('outputs/五题内容修订-20260928/01-出题子应用-五题内容修订版.json');
 assert.deepEqual(child.edges,base.edges);
 const ids=new Set(['sR35QbYF2xamDQR3','v12RevisionGenerator','v12RevisionInput','cmuTcUhJefVm2DC6','v12AssemblyR2','v12FinalPublicationNormalize']);
 assert.deepEqual(child.nodes.map(n=>n.nodeId),base.nodes.map(n=>n.nodeId));
 for(const n of child.nodes){
   const b=base.nodes.find(b=>b.nodeId===n.nodeId);
   if(!ids.has(n.nodeId))assert.deepEqual(n,b);
   assert.deepEqual(n.outputs,b.outputs);
   for(const i of n.inputs)if(!['code','systemPrompt'].includes(i.key))assert.deepEqual(i,b.inputs.find(j=>j.key===i.key));
 }
});
test('结构化解析从首轮到公开接口均输出四行字符串且不改变选项',()=>{
 const x=objDraft();const snapshot=JSON.stringify(x);
 for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2']){
   const a=fn(id)({candidate_json:x,evidence_pool:pool,second_cancer_type:'直肠癌'});
   assert.equal(a.structure_decision,'PASS');
   const pub=JSON.parse(a.candidate_json_passthrough);
   for(let i=0;i<5;i++){assert.equal(pub.questions[i].explain,explain);assert.deepEqual(pub.questions[i].options,x.questions[i].options);}
   assert.equal(JSON.stringify(x),snapshot,'adapter must not mutate raw input');
 }
 const f=finish(assemble(x),x);assert.equal(f.status,'OUTPUT_READY');assert.equal(f.publishable,false);
 assert.equal(JSON.parse(f.publication_payload_json).workflow_revision,'20260928-structured-five');
 const outerResult=outerRun(f.publication_payload_json);assert.equal(outerResult.final_data.question_count,5);
 for(const q of outerResult.final_data.questions)assert.equal(typeof q.explain,'string');
});
test('四种答案位置保留，程序仅生成正确标记，理由逐字保留',()=>{
 for(let answer=0;answer<4;answer++){
   const x=objDraft();x.questions[0].answer=answer;x.questions[0].answer_text=x.questions[0].options[answer];
   const a=assemble(x);assert.equal(a.structure_decision,'PASS');
   const q=JSON.parse(a.candidate_json_passthrough).questions[0];
   assert.equal(q.answer,answer);assert.deepEqual(q.options,x.questions[0].options);
   const rows=q.explain.split('\n');assert.equal(rows.length,4);
   rows.forEach((r,i)=>assert.equal(r,'ABCD'[i]+'｜'+(i===answer?'正确':'不正确')+'：'+x.questions[0].explain['ABCD'[i]]));
 }
});
test('缺解析、空理由、多余键、嵌套值、多行或自带判定标签均拦截且不补造',()=>{
 const mutations=[q=>delete q.explain.B,q=>q.explain.C=' ',q=>q.explain.E='多余',q=>q.explain.D={text:'内容'},q=>q.explain.A='理由\n新行',q=>q.explain.A='正确：重复标签',q=>q.explain.A='A｜正确：重复',q=>delete q.keyPoint,q=>q.keyPoint=''];
 for(const mutate of mutations){const x=objDraft();mutate(x.questions[1]);const a=assemble(x);assert.equal(a.structure_decision,'FAIL');const f=finish(a,x);assert.equal(f.status,'FORMAT_ERROR');assert.equal(f.output_ready,false);}
});
test('纯证据代号占位解析拦截，内容完整旧格式仍兼容',()=>{
 for(const text of ['IR02明确','该指南指出','原文','GB04支持']){const x=objDraft();x.questions[0].explain.A=text;assert.equal(assemble(x).structure_decision,'FAIL');}
 assert.equal(assemble(draft).structure_decision,'PASS');
});
test('数量不足依旧不冒充五题成功，结构化解析不造成绕过',()=>{
 for(const n of [1,2,3,4]){const x=objDraft();x.questions=x.questions.slice(0,n);x.question_count=n;const f=finish(assemble(x),x);assert.equal(f.status,'INCOMPLETE_QUESTION_SET');assert.equal(f.output_ready,false);}
});
test('第二轮逐题接收缺字段诊断、证据边界清单及对象解析文本线索',()=>{
 const x=objDraft();delete x.questions[1].keyPoint;delete x.questions[1].explain.C;x.questions[2].explain.D='研究数值趋势不能直接写成无劣。';
 const r=JSON.parse(fn('v12RevisionInput')({previous_candidate:JSON.stringify(x),evidence_pool:pool,structure_decision:'FAIL'}).system_text);
 assert(r.review_plan.question_checks[1].structural_defects.some(s=>s.includes('keyPoint')));
 assert(r.review_plan.question_checks[1].structural_defects.some(s=>s.startsWith('C解析')));
 assert(r.review_plan.question_checks[2].review_cues.includes('无劣'));
 assert.equal(r.review_plan.evidence_scope_checklist.length,6);
 assert.equal(r.previous_candidate_raw,JSON.stringify(x));
 assert.equal(r.evidence_pool.records[0].snippet,records[0].raw_snippet);
});
test('真实失败回放：Q2/Q4缺失仍拒绝；第二轮输入明确指出两题缺口',()=>{
 const text=fs.readFileSync('C:/Users/admin/.codex/attachments/ed9da0e6-e284-4207-b3c6-a7941dcb6766/已粘贴的文本.txt','utf8');
 // Read-only repair of illegal pasted outer escapes. Do not alter inner model JSON or runtime parser.
 let repaired='',inside=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){inside=!inside;repaired+=c;}else if(inside&&c==='\\'){const n=text[++i];if(!'"\\/bfnrtu'.includes(n))repaired+='\\';repaired+='\\'+n;}else repaired+=c;}
 const data=JSON.parse(repaired),raw=JSON.parse(data.second_round_raw);
 const a=fn('v12AssemblyR2')({candidate_json:data.second_round_raw,evidence_pool:data.evidence_pool,second_cancer_type:data.second_cancer_type});
 assert.equal(a.structure_decision,'FAIL');
 for(const id of ['Q2','Q4'])assert(a.structure_errors.some(s=>s.includes(id)&&s.includes('keyPoint')));
 const r=JSON.parse(fn('v12RevisionInput')({previous_candidate:data.second_round_raw,evidence_pool:data.evidence_pool,structure_decision:'FAIL',structure_errors:a.structure_errors}).system_text);
 for(const id of ['Q2','Q4']){const q=r.review_plan.question_checks.find(q=>q.question_id===id);assert(q.structural_defects.some(s=>s.includes('keyPoint')));assert(q.structural_defects.some(s=>s.includes('1行')));}
 assert.equal(r.evidence_pool.records.length,19);
 assert.equal(raw.questions[1].explain,'A｜正确：IR02明确');
 fs.writeFileSync(dir+'真实失败回放.json',JSON.stringify({case_id:data.case_id,question_count:raw.questions.length,structure_decision:a.structure_decision,structure_errors:a.structure_errors,revision_question_checks:r.review_plan.question_checks,model_rerun:false,medical_correctness_verified:false},null,2));
});
test('引用原文诊断保留，模型内部对象不污染公开接口',()=>{
 const x=objDraft();const env=JSON.parse(finish(assemble(x),x).publication_payload_json);
 assert.equal(env.diagnostics.cited_evidence_snapshot.length,5);
 assert.equal(env.diagnostics.cited_evidence_snapshot[0].snippet,records[0].raw_snippet);
 for(const q of JSON.parse(env.final_response_json).questions){assert.equal(typeof q.explain,'string');assert(!('structural_defects' in q));assert(!('evidence_id' in q));}
});
test('新版子应用经现有单例外层进入批量终稿，十份五题输出均兼容',()=>{
 const x=objDraft(),single=outerRun(finish(assemble(x),x).publication_payload_json).output_data;
 const batch=load('outputs/批量五题兼容修复-20260928/批量生成-五题兼容修复版.json');
 const run=fn('batchFinal20260909',batch);
 const r=run({results:Array.from({length:10},()=>({success:true,data:JSON.stringify(single)})),expected_count:10});
 assert.equal(r.batch_report.complete_count,10);assert.equal(r.output_data.length,10);
 for(const item of r.output_data){assert.equal(item.Questions.question_count,5);for(const q of item.Questions.questions)assert.equal(typeof q.explain,'string');}
});
`;
suite=suite.replace('const datasetConfig=',extra+'\nconst datasetConfig=');
vm.runInThisContext('(function(require){'+suite+'\n})',{filename:'structured-five-suite.cjs'})(require);
