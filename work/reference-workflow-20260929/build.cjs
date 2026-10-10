const fs=require('fs'),assert=require('assert/strict');
const out='outputs/参考版恢复-五题适配-20260929';fs.mkdirSync(out,{recursive:true});
const reference=JSON.parse(fs.readFileSync(__dirname+'/input.json'));
const prior='outputs/HTML原句排版修复-20260929',diagnostic='outputs/错误返回定位版-20260929';
const read=(d,f)=>JSON.parse(fs.readFileSync(d+'/'+f));const outer=structuredClone(reference),current=read(prior,'02-HTML单例外层.json');
// Keep the known-working upload, reader, cleaner, extractor and case mapper exactly.
const removed=['ltrYX3w0AXTIiF0r','singleEditorialGate20260917'];
outer.nodes=outer.nodes.filter(n=>!removed.includes(n.nodeId));
outer.edges=outer.edges.filter(e=>!removed.includes(e.source)&&!removed.includes(e.target));
const candidate='bJcPjyWI8hiwuVOS',final='jKqMCN8eJKvkngnI';
for(const id of [candidate,final])outer.nodes[outer.nodes.findIndex(n=>n.nodeId===id)]=structuredClone(current.nodes.find(n=>n.nodeId===id));
outer.edges.push({source:candidate,target:final,sourceHandle:candidate+'-source-right',targetHandle:final+'-target-left'});
// The copied final node's extraction_check was introduced later; this reference
// case mapper does not produce it. Remove that optional input instead of a dangling ref.
const finalNode=outer.nodes.find(n=>n.nodeId===final);finalNode.inputs=finalNode.inputs.filter(i=>i.key!=='extraction_check');
const code=finalNode.inputs.find(i=>i.key==='code');code.value=code.value.replaceAll('20260929-html-five-contract-outer','20260929-reference-recovery');
outer.nodes.find(n=>n.nodeId==='bTxgvHEhA8qEPFTa').inputs.find(i=>i.key==='text').value='{{$'+final+'.response_json$}}';
// Preserve the reference JSON syntax recovery, but do not mutate clinical fields
// after parsing (the legacy block could discard "推算" and rewrite dates).
const repair=outer.nodes.find(n=>n.nodeId==='d4esByk5Pccmn1gH').inputs.find(i=>i.key==='code');
const a=repair.value.indexOf('  /**\n   * evidence_notes');assert(a>0);const b=repair.value.lastIndexOf('  return {');assert(b>a);
repair.value=repair.value.slice(0,a)+'  // 格式修复不改写日期、病史、不确定性或已解析字段。\n'+repair.value.slice(b);
outer.name='HTML单例-参考版恢复与五题适配';
const child=read(diagnostic,'01-出题子应用.json');
const batch=read(prior,'03-批量生成.json'),debugBatch=read(diagnostic,'03-批量生成.json');
batch.nodes.find(n=>n.nodeId==='batchFinal20260909').inputs.find(i=>i.key==='code').value=debugBatch.nodes.find(n=>n.nodeId==='batchFinal20260909').inputs.find(i=>i.key==='code').value.replaceAll('20260929-error-return-batch','20260929-reference-recovery-batch');
const workflows={child,outer,batch},names={child:'01-出题子应用.json',outer:'02-HTML单例外层.json',batch:'03-批量生成.json'};
for(const [role,w] of Object.entries(workflows))fs.writeFileSync(out+'/'+names[role],JSON.stringify(w,null,2));
fs.writeFileSync(out+'/修改记录.json',JSON.stringify({base:'用户确认以前能运行的0a5001c8附件',online_verified:false,known_working_components_preserved:['文件上传配置','文档解析及文件引用写法','HTML正文检查','正文清洗提示词与模型','病例结构化提取提示词与模型','代码运行与14字段病例接口'],removed:['外层终稿优化AI及条件节点','后来加入的患者整段逐字硬拦截','后来加入的集中错误分支与批量返回检查节点'],changes:['尾部适配当前五题契约、保留完整诊断、精简返回','格式修复解析后不再修改临床字段','批量空返回标记EMPTY_CHILD_RESPONSE','子应用保留两轮Flash及已有模型错误诊断'],models:{html_cleaner:'qwen3.5-plus-nothinking',case_extractor:'qwen3.5-plus-nothinking',question_rounds:'qwen3.8-flash'},nodes:Object.fromEntries(Object.entries(workflows).map(([r,w])=>[r,{nodes:w.nodes.length,edges:w.edges.length}]))},null,2));
console.log(out);
