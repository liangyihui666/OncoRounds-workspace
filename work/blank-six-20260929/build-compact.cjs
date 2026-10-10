const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const base='outputs/证据原句核对与进阶出题-20260929/02-HTML单例外层-配套版.json';
const out='outputs/六例空返回排查-20260929';fs.mkdirSync(out,{recursive:true});
const before=JSON.parse(fs.readFileSync(base,'utf8')),after=structuredClone(before);
const node=after.nodes.find(n=>n.nodeId==='jKqMCN8eJKvkngnI'),input=node.inputs.find(i=>i.key==='code'),old=input.value;
const target='  return { ...result, case_page_json: JSON.stringify(detail, null, 2),\n    execution_report,response_json,output_data, output_json: JSON.stringify(output_data, null, 2) };';
assert.equal(old.split(target).length,2);
input.value=old.replace(target,'  // Downstream consumes only this envelope. Keep complete diagnostics once, without alias copies.\n  return { response_json };');
const unused=node.outputs.filter(o=>!['system_rawResponse','error','system_addOutputParam','response_json'].includes(o.id));
for(const n of after.nodes)if(n.nodeId!==node.nodeId)for(const i of n.inputs){
 const refs=JSON.stringify(i.value||'');if(refs.includes(node.nodeId))assert(refs.includes('response_json'),n.name+'依赖旧输出');
}
node.outputs=node.outputs.filter(o=>!unused.includes(o));
const results=[];const check=(name,fn)=>{fn();results.push({name,pass:true});};
check('只修改json生成一个节点，图、模型、检索及下游response_json引用不变',()=>{
 assert.deepEqual(after.edges,before.edges);for(const n of after.nodes)if(n.nodeId!==node.nodeId)assert.deepEqual(n,before.nodes.find(b=>b.nodeId===n.nodeId));
});
check('全部代码节点语法有效',()=>{for(const n of after.nodes)for(const i of n.inputs)if(i.key==='code')new vm.Script(i.value);});
const run=code=>vm.runInNewContext(code+'\nmain'),legacy=run(old),compact=run(input.value),sizes=[];
for(const file of fs.readdirSync(__dirname).filter(n=>/^CASE-[A-Z0-9]+\.json$/.test(n))){
 const x=JSON.parse(fs.readFileSync(path.join(__dirname,file),'utf8'));
 check(x.case_id+'：原样重放，题目/状态/原句诊断/失败草稿逐字不变',()=>{
  const a=legacy(x),b=compact(x);assert.deepEqual(Object.keys(b),['response_json']);assert.equal(b.response_json,a.response_json);
  const data=JSON.parse(b.response_json);assert.equal(data.output_data.Questions.question_count,x.candidate_pool.candidate_count);
  assert.equal(data.execution_report.status,x.candidate_pool.groups[0].flow_status);assert.equal(data.execution_report.publishable,false);
  sizes.push({case_id:x.case_id,status:data.execution_report.status,question_count:data.output_data.Questions.question_count,before_bytes:Buffer.byteLength(JSON.stringify(a)),after_bytes:Buffer.byteLength(JSON.stringify(b)),reduction_percent:+(100*(1-Buffer.byteLength(JSON.stringify(b))/Buffer.byteLength(JSON.stringify(a)))).toFixed(1)});
 });
 check(x.case_id+'：单例模式保持Questions/detail公开协议',()=>{
  const y={...x,transport_mode:''};const a=legacy(y),b=compact(y);assert.equal(b.response_json,a.response_json);assert.deepEqual(Object.keys(JSON.parse(b.response_json)),['Questions','detail']);
 });
}
fs.writeFileSync(out+'/02-HTML单例外层-精简返回版.json',JSON.stringify(after,null,2));
fs.writeFileSync(out+'/json生成-替换代码.js',input.value);
fs.writeFileSync(out+'/离线重放报告.json',JSON.stringify({base,online_verified:false,cause_not_confirmed:true,removed_output_aliases:unused.map(o=>o.key),checks:results,sizes},null,2));
console.log(JSON.stringify({checks:results.length,sizes},null,2));
