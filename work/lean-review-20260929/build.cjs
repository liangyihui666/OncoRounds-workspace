const fs=require('fs'),assert=require('assert/strict'),path=require('path');
const base='outputs/参考版恢复-五题适配-20260929',out='outputs/精简冻结版-五题-20260929';
const names={child:'01-出题子应用.json',outer:'02-HTML单例外层.json',batch:'03-批量生成.json'};
const old=Object.fromEntries(Object.entries(names).map(([r,f])=>[r,JSON.parse(fs.readFileSync(base+'/'+f))]));
const w=structuredClone(old),changes=[];
const node=(r,id)=>w[r].nodes.find(n=>n.nodeId===id);
function edit(r,id,key,transform,reason){const n=node(r,id),i=n.inputs.find(i=>i.key===key),before=i.value;i.value=transform(before);assert.notEqual(before,i.value);changes.push({role:r,id,name:n.name,field:key,before_chars:before.length,after_chars:i.value.length,reason});}
function cut(text,start,end){const a=text.indexOf(start),b=text.indexOf(end,a);assert(a>=0&&b>a,start);return text.slice(0,a)+text.slice(b);}
const prompt=fs.readFileSync(__dirname+'/prompt.txt','utf8').trim();
edit('child','sR35QbYF2xamDQR3','systemPrompt',()=>prompt,'将历史个案例外归并为通用的事实、证据适用性和唯一答案原则；保留输出契约');
edit('child','v12RevisionGenerator','systemPrompt',()=> '这是第二轮也是最后一轮。根据program_precheck与绑定原文返回完整替换稿，保留合格题，不只返回修改题。程序结果仅覆盖结构及字面回溯，仍须逐题核对证据适用性与唯一答案。\n\n'+prompt,'简化最后一轮职责；共用同一出题契约');
edit('child','v12RevisionInput','code',()=>fs.readFileSync('work/integration-repair-20260929/contract.js','utf8')+'\n'+fs.readFileSync(__dirname+'/revision-main.js','utf8'),'删除重复证据校验、特定药名/病例关键词触发器和重复题目摘要；只传一份病例、草稿、完整证据及预检报告');
const revision=node('child','v12RevisionInput'),input=structuredClone(revision.inputs.find(i=>i.key==='evidence_pool'));
Object.assign(input,{key:'evidence_verification',label:'evidence_verification',value:['cmuTcUhJefVm2DC6','evidence_verification']});revision.inputs.push(input);
for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2'])edit('child',id,'code',s=>cut(s,'  function readJsonStringEnd(', '  function parseCandidate('),'删除已被统一严格解析器替代的旧解析函数；保留当前重复键检查与有限结构归位');
for(const [r,id] of [['child','v12FinalPublicationNormalize'],['batch','batchFinal20260909']])edit(r,id,'code',s=>{assert.equal((s.match(/\bfailureEnvelope\b/g)||[]).length,1);return cut(s,'function failureEnvelope(', 'function teachingErrors(');},'删除已撤回错误分支留下的未调用函数；保留实际错误分类和脱敏');
const mapper=node('outer','ogy1PAMdD268kXeo'),focus=mapper.outputs.filter(o=>/^learning_points_[abc]$/.test(o.key));
assert.equal(focus.length,3);
for(const n of w.outer.nodes)if(n!==mapper)for(const o of focus){assert(!JSON.stringify(n).includes(o.id));assert(!JSON.stringify(n).includes(mapper.nodeId+'.'+o.key));}
edit('outer',mapper.nodeId,'code',s=>{
  const a=s.indexOf('  function focus(priority)'),b=s.indexOf('\n}\n\nfunction main(args)',a);assert(a>0&&b>a);
  return s.slice(0,a)+'  return { production_variables, ...production_variables };'+s.slice(b);
},'删除三组并行出题遗留教学侧重，当前单次子应用不使用这些输出');
mapper.outputs=mapper.outputs.filter(o=>!focus.includes(o));
const counts=graph=>({nodes:graph.nodes.length,edges:graph.edges.length,code_chars:graph.nodes.flatMap(n=>n.inputs).filter(i=>i.key==='code').reduce((s,i)=>s+i.value.length,0),system_prompt_chars:graph.nodes.flatMap(n=>n.inputs).filter(i=>i.key==='systemPrompt').reduce((s,i)=>s+i.value.length,0)});
fs.mkdirSync(out,{recursive:true});
for(const [r,f] of Object.entries(names))fs.writeFileSync(out+'/'+f,JSON.stringify(w[r],null,2));
fs.writeFileSync(out+'/修改记录.json',JSON.stringify({base:path.resolve(base),changes,removed_output_keys:focus.map(o=>o.key),stats:Object.fromEntries(Object.keys(w).map(r=>[r,{before:counts(old[r]),after:counts(w[r])}])),online_verified:false,clinical_quality_verified:false,api_calls:0},null,2));
console.log(JSON.stringify({out,changes:changes.map(c=>({node:c.name,before:c.before_chars,after:c.after_chars}))},null,2));
