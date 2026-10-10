const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const dir='outputs/答后答案与病例对照-20261008';fs.mkdirSync(dir,{recursive:true});
const childSource='C:/Users/admin/.codex/attachments/ee08e3f4-ba8a-4c91-bab7-23c021a21be7/已粘贴的文本.txt';
const outerSource='outputs/OCR文本清洗-完整工作流-20261008/OCR文本清洗与五题生成-完整工作流.json';
const child=JSON.parse(fs.readFileSync(childSource)),outer=JSON.parse(fs.readFileSync(outerSource));
const helper=fs.readFileSync(__dirname+'/after-answer.js','utf8'),prompt=fs.readFileSync(__dirname+'/prompt.txt','utf8');
const item=(w,id,key)=>w.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key===key);
function replace(s,old,next){assert(s.includes(old),'missing replacement: '+old.slice(0,100));return s.replace(old,next);}
for(const id of ['sR35QbYF2xamDQR3','v12RevisionGenerator']){
 const p=item(child,id,'systemPrompt');p.value=replace(p.value,'每题恰好14键：','每题恰好15键：');
 p.value=replace(p.value,'evidence_summary、verification。','evidence_summary、verification、after_answer。');p.value+=prompt;
}
for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2']){
 const c=item(child,id,'code');let s=c.value;
 s=replace(s,'"verification"\n  ];','"verification",\n    "after_answer"\n  ];');
 s=replace(s,'"keyPoint"\n  ];','"keyPoint",\n    "after_answer"\n  ];');
 s=replace(s,'check.decision=check.errors.length?',`for(const message of afterAnswerErrors(q,packet)) fail('AFTER_ANSWER_INVALID',message);\n    check.decision=check.errors.length?`);
 s=replace(s,"['verification','question','options','explain','keyPoint','evidence_summary']","['verification','question','options','explain','keyPoint','evidence_summary','after_answer']");
 c.value=helper+'\n'+s;
}
const final=item(child,'v12FinalPublicationNormalize','code');
final.value=helper+'\n'+replace(final.value,' const evidenceVerification=parse(inputs.evidence_verification);'," for(const q of arr(p?.questions)) for(const e of afterAnswerErrors(q)) errors.push((q.id||'题目')+'：'+e);\n const evidenceVerification=parse(inputs.evidence_verification);");
final.value=final.value.replace("workflow_revision:'20260929-error-return'","workflow_revision:'20261008-after-answer-v1'");
const check=item(outer,'bJcPjyWI8hiwuVOS','code');
check.value=helper+'\n'+replace(check.value,'errors.push(...teachingErrors(q));','errors.push(...teachingErrors(q), ...afterAnswerErrors(q,caseData));');
const assembly=item(outer,'jKqMCN8eJKvkngnI','code');
assembly.value=helper+'\n'+replace(assembly.value,'keyPoint: q.keyPoint, guidelineRef: q.guidelineRef };','keyPoint: q.keyPoint, guidelineRef: q.guidelineRef, after_answer: q.after_answer };');
assembly.value=replace(assembly.value,'const target=originalAnswerIndex;','const comparisonErrors=afterAnswerErrors(q); if(comparisonErrors.length) throw new Error(comparisonErrors.join("；"));\n    const target=originalAnswerIndex;');
const files={'01-五题出题子应用-完整工作流.json':child,'02-OCR清洗与五题生成-完整工作流.json':outer};
for(const [f,w] of Object.entries(files)){for(const n of w.nodes)for(const i of n.inputs)if(i.key==='code')new vm.Script(i.value);fs.writeFileSync(dir+'/'+f,JSON.stringify(w,null,2));}
fs.writeFileSync(dir+'/修改记录.json',JSON.stringify({child_source:childSource,outer_source:outerSource,contract_extension:'questions[].after_answer.schema_version=1.0',child_nodes_changed:['题目生成-首轮','题目修订-第二轮','首轮格式预检','最终程序检查与引用装配','整理最终输出'],outer_nodes_changed:['单组候选检查与终稿输入','json生成'],retrieval_model_and_edges_unchanged:true,online_verified:false,medical_review_status:'not_performed',api_calls:0},null,2));
console.log(dir);
