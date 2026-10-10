const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const out='outputs/精简冻结版-五题-20260929',base='outputs/参考版恢复-五题适配-20260929';
// Reuse the existing contract regressions without changing their pass criteria.
let childTest=fs.readFileSync('work/reference-workflow-20260929/test-child.cjs','utf8').replaceAll(base,out);
new Function('require','__dirname',childTest)(require,path.resolve('work/reference-workflow-20260929'));
let outerTest=fs.readFileSync('work/reference-workflow-20260929/test.cjs','utf8').replaceAll(base,out)
 .replace("'t7eXTzfAM2QUzvvK','ogy1PAMdD268kXeo','ddwhzFImUXV1QTsA'","'t7eXTzfAM2QUzvvK','ddwhzFImUXV1QTsA'")
 .replace('参考版上传、读取、清洗、提取、病例映射逐节点保持','参考版上传、读取、清洗、提取及子应用调用逐节点保持');
new Function('require','__dirname',outerTest)(require,path.resolve('work/reference-workflow-20260929'));
const names={child:'01-出题子应用.json',outer:'02-HTML单例外层.json',batch:'03-批量生成.json'};
const read=(dir,r)=>JSON.parse(fs.readFileSync(dir+'/'+names[r]));
const w=Object.fromEntries(Object.keys(names).map(r=>[r,read(out,r)])),old=Object.fromEntries(Object.keys(names).map(r=>[r,read(base,r)]));
const code=(graph,id)=>graph.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='code').value;
const fn=(graph,id)=>vm.runInNewContext(code(graph,id)+'\nmain',{URL});
const plain=v=>JSON.parse(JSON.stringify(v)),checks=[];
function test(name,run){try{run();checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:e.message});}}
test('只改登记节点，完整检索分支/模型/图连接和运行配置未变',()=>{
 const changed=JSON.parse(fs.readFileSync(out+'/修改记录.json')).changes;
 for(const r of Object.keys(w)){
  assert.deepEqual(w[r].edges,old[r].edges);assert.deepEqual(w[r].chatConfig,old[r].chatConfig);
  assert.equal(w[r].nodes.length,old[r].nodes.length);
  const ids=changed.filter(c=>c.role===r).map(c=>c.id);
  for(const n of w[r].nodes){const prev=old[r].nodes.find(o=>o.nodeId===n.nodeId);
   if(!ids.includes(n.nodeId))assert.deepEqual(n,prev);
   assert.deepEqual(n.inputs.filter(i=>i.key==='model'),prev.inputs.filter(i=>i.key==='model'));
  }
 }
});
test('第二轮原样收到首轮核对结果和完整证据，包括首轮未使用来源；无结果不假报通过',()=>{
 const verification={status:'failed',question_checks:[{id:'Q1',errors:['引文不存在']}]};
 const pool={records:[{evidence_id:'E1',snippet:'压缩片段',raw_snippet:'完整原文：保留数值≤1和否定条件。'},{evidence_id:'E2',snippet:'首轮未使用的完整第二条正文'}]};
 const draft={questions:[],question_count:0},args={previous_candidate:JSON.stringify(draft),case_packet:{case_context:'尚未确认'},evidence_pool:pool,evidence_verification:verification};
 const r=JSON.parse(fn(w.child,'v12RevisionInput')(args).system_text);
 assert.deepEqual(r.program_precheck.evidence_verification,verification);
 assert.equal(r.evidence_pool.records[0].snippet,pool.records[0].raw_snippet);
 assert.equal(r.evidence_pool.records[1].snippet,pool.records[1].snippet);
 assert.deepEqual(r.previous_candidate,draft);assert(!r.review_plan);
 delete args.evidence_verification;
 assert.equal(JSON.parse(fn(w.child,'v12RevisionInput')(args).system_text).program_precheck.evidence_verification.status,'not_available');
 const input=w.child.nodes.find(n=>n.nodeId==='v12RevisionInput').inputs.find(i=>i.key==='evidence_verification');
 assert.deepEqual(input.value,['cmuTcUhJefVm2DC6','evidence_verification']);
});
test('删除三组侧重后病例映射和14字段载荷逐字保持',()=>{
 const fixture=JSON.parse(fs.readFileSync('work/blank-six-20260929/CASE-794E8394.json'));
 const args={case_json:JSON.stringify({...fixture,learning_points_candidate:fixture.learning_points,decision_points_candidate:fixture.decision_points})};
 const before=plain(fn(old.outer,'ogy1PAMdD268kXeo')(args)),after=plain(fn(w.outer,'ogy1PAMdD268kXeo')(args));
 for(const k of ['learning_points_a','learning_points_b','learning_points_c']){assert(k in before);delete before[k];assert(!(k in after));}
 assert.deepEqual(after,before);
});
test('六份历史最终返回与精简前完全一致，不把已知失败变成成功',()=>{
 for(const f of fs.readdirSync('work/blank-six-20260929').filter(f=>/^CASE-[A-Z0-9]+\.json$/.test(f))){
  const args=JSON.parse(fs.readFileSync('work/blank-six-20260929/'+f));delete args.extraction_check;
  const before=plain(fn(old.outer,'jKqMCN8eJKvkngnI')(args)),after=plain(fn(w.outer,'jKqMCN8eJKvkngnI')(args));assert.deepEqual(after,before);
 }
});
const reports=['五题核心回归.json','恢复版接口回归.json'].map(f=>JSON.parse(fs.readFileSync(out+'/'+f)));
const all=[...reports.flatMap(r=>r.checks),...checks];
const summary={checks:all,passed:all.filter(c=>c.pass).length,failed:all.filter(c=>!c.pass).length,online_verified:false,clinical_quality_verified:false,api_calls:0};
fs.writeFileSync(out+'/离线检查结果.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify({passed:summary.passed,failed:summary.failed,failures:all.filter(c=>!c.pass)},null,2));
if(summary.failed)process.exitCode=1;
