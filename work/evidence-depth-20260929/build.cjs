const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const dir='outputs/证据原句核对与进阶出题-20260929',sourceDir='outputs/全流程复核优化-20260929';fs.mkdirSync(dir,{recursive:true});
const files={child:'01-出题子应用-证据与进阶加强版.json',outer:'02-HTML单例外层-配套版.json',batch:'03-批量生成-配套版.json'};
const bases={child:'01-出题子应用-全流程优化版.json',outer:'02-HTML单例外层-全流程优化版.json',batch:'03-批量生成-全流程优化版.json'};
const base=Object.fromEntries(Object.entries(bases).map(([k,p])=>[k,JSON.parse(fs.readFileSync(path.join(sourceDir,p),'utf8'))]));
const w=structuredClone(base),revision='20260929-evidence-depth-five';
const n=(id)=>w.child.nodes.find(n=>n.nodeId===id),input=(id,key)=>n(id).inputs.find(i=>i.key===key);
const once=(s,a,b)=>{assert.equal(s.split(a).length,2,a);return s.replace(a,b);};
const helper=fs.readFileSync(path.join(__dirname,'verification.js'),'utf8');
function ref(id,key,value,type='object') {const template=n(id).inputs.find(i=>i.selectedType==='reference');n(id).inputs.push({...structuredClone(template),key,label:key,valueType:type,required:false,value});}
function output(id,key,type='object'){n(id).outputs.push({id:key,key,type:'dynamic',valueType:type,label:key,description:'原句存在性与结构核对，不代表医学支持已验证'});}
const depth=fs.readFileSync(path.join(__dirname,'depth-prompt.txt'),'utf8').trim(),anchors=fs.readFileSync(path.join(__dirname,'anchor-prompt.txt'),'utf8').trim();
let common=input('sR35QbYF2xamDQR3','systemPrompt').value;
const first=common.indexOf('先定五个不同决策：'),end=common.indexOf('至少3题依据正式指南');
common=common.slice(0,first)+depth+'\n'+common.slice(end);
common=common.replaceAll('每题恰好13字段','每题恰好14字段').replaceAll('检查13字段','检查14字段');
common=once(common,'输出协议：',anchors+'\n\n输出协议：');
const exampleStart=common.indexOf('{"schema_version"'),exampleEnd=common.indexOf('\n',exampleStart);
const sample=JSON.parse(common.slice(exampleStart,exampleEnd));sample.questions[0].verification={quotes:{A:['对应记录连续原句'],B:['对应记录连续原句'],C:['对应记录连续原句'],D:['对应记录连续原句']},case_facts:[{field:'case_timeline',quote:'病例原句'}],closest_alternative:'B',decision_boundary:'病例关键条件与B方案适用边界'};
common=common.slice(0,exampleStart)+JSON.stringify(sample)+common.slice(exampleEnd);
input('sR35QbYF2xamDQR3','systemPrompt').value=common;
input('v12RevisionGenerator','systemPrompt').value=`这是第二轮也是最后一轮。输出完整修订稿，不输出审核报告。先处理evidence_verification的失败：补真实原句、改错引文或整体换题；不得用无关真引文凑字段。对每个匹配原句读取上下文，再检查它是否支持选项全部措施和排除理由、是否适用于患者时点。程序原句匹配PASS不等于医学支持成立。
再按verification.case_facts、closest_alternative与decision_boundary核对进阶性：是否真有竞争方案，病例条件是否改变取舍；不达标者在已有事实和证据内重写，不能用虚构条件加难。结合原有source_review、case_constraints、set_review和option_variety_review消除错配与重复，只改有缺陷题，保持合格题顺序。仍不足五题据实说明。

${common}`;
for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2']){
 ref(id,'case_packet',['v12CasePacket','v12CasePacketObject']);output(id,'evidence_verification');
 let code=input(id,'code').value;
 code=once(code,'    "support_mode",\n    "evidence_summary"','    "support_mode",\n    "evidence_summary",\n    "verification"');
 code=once(code,'  const errors = [];',`  let evidenceVerification={version:'option-anchors-1.0',scope:'literal_source_presence_and_shape_only',decision:'NOT_RUN',semantic_support:'not_independently_verified',errors:[],question_checks:[]};
  const errors = [];`);
 code=once(code,'      structure_decision: decision,','      evidence_verification:evidenceVerification,\n      structure_decision: decision,');
 code=once(code,'  const variety = optionVarietyReview(questions);',`  let casePacket=source.case_packet;
  if(typeof casePacket==='string'){try{casePacket=JSON.parse(casePacket);}catch(_){casePacket=null;}}
  evidenceVerification=verifyCandidateEvidence(candidate,poolResult.pool,casePacket);
  for(const check of evidenceVerification.question_checks)for(const issue of check.errors){
    fail(check.question_id+' ['+issue.code+'] '+issue.message,
      questionTask(check.question_id,issue.code,['verification','question','options','explain','keyPoint','evidence_summary'],'对照绑定全文与病例补齐真实核对材料；不支持现题时整体换题，不能伪造引文。'));
  }
  const variety = optionVarietyReview(questions);`);
 input(id,'code').value=helper+'\n'+code;
}
// Recompute from raw draft as well, so malformed or legacy drafts are sent for repair rather than silently accepted.
let rev=input('v12RevisionInput','code').value;
rev=once(rev,'review_all_questions:true,','review_all_questions:true,evidence_verification:verifyCandidateEvidence(previous,pool,casePacket),');
rev=rev.replaceAll('每题13字段','每题14字段，verification须包含四项证据原句、关键病例原句与竞争方案判别依据');
input('v12RevisionInput','code').value=helper+'\n'+rev;
ref('v12FinalPublicationNormalize','evidence_verification',['v12AssemblyR2','evidence_verification']);
let final=input('v12FinalPublicationNormalize','code').value;
final=once(final,' const valid=errors.length===0;',` const evidenceVerification=parse(inputs.evidence_verification);
 if(Array.isArray(p?.questions)&&p.questions.length>0){
   const checks=evidenceVerification?.question_checks;
   if(evidenceVerification?.version!=='option-anchors-1.0'||evidenceVerification?.decision!=='PASS'||!Array.isArray(checks)||checks.length!==p.questions.length||checks.some((c,i)=>c.question_id!==p.questions[i]?.id||c.decision!=='PASS'))errors.push('EVIDENCE_VERIFICATION_FAILED：未取得与全部题号对应的原句核对通过结果。');
 }
 const valid=errors.length===0;`);
final=once(final,'question_evidence_bindings:questionBindings','evidence_verification:evidenceVerification||null,question_evidence_bindings:questionBindings');
final=once(final,'20260929-full-review-five',revision);
input('v12FinalPublicationNormalize','code').value=final;
// Same outer/batch transport already carries the new nested diagnostics; these two files are unchanged copies.
const changes=[];
for(const role of Object.keys(w)){
 assert.deepEqual(w[role].edges,base[role].edges);
 for(const node of w[role].nodes){const old=base[role].nodes.find(x=>x.nodeId===node.nodeId);if(JSON.stringify(node)!==JSON.stringify(old))changes.push({role,id:node.nodeId,name:node.name});}
 fs.writeFileSync(path.join(dir,files[role]),JSON.stringify(w[role],null,2));
}
fs.writeFileSync(path.join(dir,'首轮出题提示词.txt'),common);
fs.writeFileSync(path.join(dir,'第二轮修订提示词.txt'),input('v12RevisionGenerator','systemPrompt').value);
fs.writeFileSync(path.join(dir,'修改记录.json'),JSON.stringify({revision,sourceDir,bases,files,changes,internal_question_fields:14,public_contract_unchanged:true,models_unchanged:true,graph_unchanged:true,retrieval_unchanged:true,outer_and_batch_unchanged:true,online_run:false,quote_presence_is_not_semantic_support:true},null,2));
console.log(JSON.stringify({dir,changes,prompt_chars:{first:common.length,second:input('v12RevisionGenerator','systemPrompt').value.length}}));
