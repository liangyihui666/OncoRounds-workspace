const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const dir='outputs/批量五题兼容修复-20260928/';
const load=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const old=load('C:/Users/admin/.codex/attachments/98fdca72-1835-4c6a-83d9-65c1eb5a32e9/已粘贴的文本.txt');
const next=load(dir+'批量生成-五题兼容修复版.json');
const actual=load('C:/Users/admin/.codex/attachments/18abe43c-7155-4385-ac3f-cee0da276ab2/已粘贴的文本.txt').output_data;
const input=(id,key,d=next)=>d.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key===key).value;
const fn=(id,d=next)=>vm.runInNewContext(input(id,'code',d)+'\nmain');
const run=fn('batchFinal20260909'),plain=x=>JSON.parse(JSON.stringify(x)),row=x=>({success:true,data:JSON.stringify(x)});
const checks=[];function test(name,cb){cb();checks.push({name,pass:true});}
test('原版真实五题输出被错误拒绝，修正版原样接受',()=>{
 const args={results:[row(actual)],expected_count:1};
 assert.equal(fn('batchFinal20260909',old)(args).output_data[0].error.code,'INVALID_TAXONOMY_OR_COUNT');
 const r=run(args);assert.deepEqual(plain(r.output_data[0]),actual);assert.equal(r.batch_report.status,'complete');
});
test('一至四题不能作为成功病例通过',()=>{
 for(let count=1;count<5;count++){
  const x=structuredClone(actual);x.Questions.questions=x.Questions.questions.slice(0,count);x.Questions.question_count=count;
  const r=run({results:[row(x)],expected_count:1});assert.equal(r.output_data[0].error.code,'INCOMPLETE_QUESTION_SET');assert.equal(r.batch_report.complete_count,0);
 }
});
test('十文件混合成功失败保持位置、病例页和重试索引',()=>{
 const rows=Array.from({length:10},()=>row(actual));
 rows[1]={success:false,message:'synthetic failure',data:null};rows[5]={success:true,data:'{bad'};
 const zero=structuredClone(actual);Object.assign(zero.Questions,{question_count:0,questions:[],generation_status:'insufficient',missing_information:['无完整题组']});rows[8]=row(zero);
 const r=run({results:rows,expected_count:10});assert.equal(r.output_data.length,10);assert.equal(r.output_data[1].error.file_index,2);
 assert.equal(r.output_data[5].error.file_index,6);assert.deepEqual(plain(r.output_data[8]),zero);
 assert.deepEqual(plain(r.batch_report.retry_file_indices),[2,6,9]);assert.equal(r.batch_report.complete_count,7);assert.equal(r.batch_report.incomplete_count,1);assert.equal(r.batch_report.failed_count,2);
});
test('批量中断占位保留，结果数量不一致明确拒绝',()=>{
 const r=run({results:null,expected_count:3});assert.equal(r.output_data.length,3);assert.equal(r.batch_report.failed_count,3);
 assert.throws(()=>run({results:[row(actual)],expected_count:2}),/数量不一致/);
 assert.throws(()=>run({results:{},expected_count:2}),/不是数组/);
});
test('新展示契约和历史两级癌种均兼容，冲突仍拒绝',()=>{
 const x=structuredClone(actual);x.Questions.second_cancer_type='直肠癌';x.detail.second_cancer_type='直肠癌';
 assert.equal(run({results:[row(x)],expected_count:1}).batch_report.complete_count,1);
 x.detail.second_cancer_type='测试冲突';assert.equal(run({results:[row(x)],expected_count:1}).output_data[0].error.code,'INVALID_TAXONOMY');
});
test('病例标识、题数、答案及题目ID错误被隔离',()=>{
 for(const mutate of [x=>x.detail.case_id='OTHER',x=>x.Questions.question_count=4,x=>x.Questions.questions[0].answer_text='错误映射',x=>x.Questions.questions[1].id=x.Questions.questions[0].id]){
 const x=structuredClone(actual);mutate(x);assert(run({results:[row(x)],expected_count:1}).output_data[0].error);
 }
});
test('每个并行任务只绑定自己的单文件数组，不重复传整批',()=>{
 const prep=fn('batchPrep20260909')({files:['https://example.test/a.html','https://example.test/b.html']});
 assert.deepEqual(plain(prep.file_batches),[['https://example.test/a.html'],['https://example.test/b.html']]);
 const refs=input('iW8Qg5stNA8T2Qp9','fileUrlList');assert.deepEqual(refs,[['kWC4W3Kz5lNbIlo8','loopStartInput']]);
 for(let index=0;index<2;index++){
 const state={kWC4W3Kz5lNbIlo8:{loopStartInput:prep.file_batches[index]}};
 const resolved=refs.map(([node,key])=>state[node][key]).flat();assert.deepEqual(plain(resolved),[prep.file_batches[index][0]]);
 }
});
test('文件数量与无效项校验保留',()=>{
 const prep=fn('batchPrep20260909');for(const files of [[],Array(11).fill('file'),[''],[null]])assert.throws(()=>prep({files}));
 assert.equal(prep({files:Array.from({length:10},(_,i)=>'file'+i)}).expected_count,10);
});
test('代码语法、连线、应用绑定、并发设置及位置保持',()=>{
 assert.deepEqual(next.edges,old.edges);assert.deepEqual(next.chatConfig,old.chatConfig);
 for(const n of next.nodes){const before=old.nodes.find(b=>b.nodeId===n.nodeId);assert.deepEqual(n.position,before.position);if(n.flowNodeType==='code')new vm.Script(input(n.nodeId,'code'));if(n.pluginId)assert.equal(n.pluginId,before.pluginId);}
 assert.equal(input('rv8pvsOmvinDpzaN','parallelRunMaxConcurrency'),10);assert.equal(input('rv8pvsOmvinDpzaN','parallelRunMaxRetryTimes'),0);
 assert.deepEqual(input('batchFinal20260909','results'),[['rv8pvsOmvinDpzaN','parallelFullResults']]);
});
fs.writeFileSync(dir+'离线检查报告.json',JSON.stringify({checks,check_count:checks.length,online_verified:false,real_output_replay:true,native_parallel_runtime_executed:false,called_app_version_verified:false},null,2));
console.log(checks.length+' checks passed');
