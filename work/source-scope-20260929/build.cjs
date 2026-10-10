const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const source='C:/Users/admin/.codex/attachments/00063ce5-cdef-4bc1-a44d-d812d02ee114/已粘贴的文本.txt';
const dir='outputs/上传版证据范围修复-20260929';fs.mkdirSync(dir,{recursive:true});
const base=JSON.parse(fs.readFileSync(source,'utf8')),w=structuredClone(base);
const input=(id,key)=>w.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key===key);
const once=(s,a,b)=>{assert.equal(s.split(a).length,2,a);return s.replace(a,b);};
const scope=fs.readFileSync(path.join(__dirname,'scope.js'),'utf8');
for(const id of ['v11EvidenceRegistryInitial','v11EvidenceRegistry']){
 const c=input(id,'code');c.value=scope.slice(0,scope.indexOf('function caseConstraintIndex'))+'\n'+once(c.value,'records.push(record);','record.scope_index = evidenceScopeIndex(record);\n      records.push(record);');
}
const old=input('sR35QbYF2xamDQR3','systemPrompt').value;
const prompt=fs.readFileSync(path.join(__dirname,'rules.txt'),'utf8').trim()+'\n\n'+old.slice(old.indexOf('输出协议：'));
input('sR35QbYF2xamDQR3','systemPrompt').value=prompt;
input('v12RevisionGenerator','systemPrompt').value=`这是第二轮也是最后一轮出题调用，只输出修订后的完整JSON。程序PASS不代表医学合格。
先看case_constraints的原句，保留患者拒绝、可及性、既往治疗及耐受性限制，再看set_review排除重复或过浅考点。逐题先核对source_review的阶段/部位/脚注/研究名线索，再完成option_review四项复核；不得只润色现有答案。重点逐字对照错误项理由、keyPoint和evidence_summary是否越界，原文没给的其他研究或药物优先级不能补进来。来源自身的强措辞不能只因“必须”二字就判幻觉。
source_review、case_constraints及其他关键词提示都是定位线索，非自动医学裁决；未命中仍核对全部题目。证据不能支持当前问题时整体换成有依据的不同决策，不将正文限定删掉后在摘要里宣称已支持。structural_defects须修复；无法补齐据实说明，不伪造事实。只重写有缺陷题，保留合格选项顺序。\n\n`+prompt;
let c=input('v12RevisionInput','code').value;
c=scope+'\n'+c;
c=once(c,'option_review:buildOptionReview(q),','option_review:buildOptionReview(q),source_review:sourceReviewTasks(q,matches.length===1?matches[0]:null,casePacket),');
c=once(c,'review_all_questions:true,','review_all_questions:true,case_constraints:caseConstraintIndex(casePacket),');
input('v12RevisionInput','code').value=c;
const node=w.nodes.find(n=>n.nodeId==='v12RevisionInput');assert.equal(node.catchError,true);node.catchError=false;
const catchEdges=w.edges.filter(e=>e.source==='v12RevisionInput'&&e.sourceHandle.includes('catch'));
assert.equal(catchEdges.length,1);assert.equal(catchEdges[0].target,'v12RevisionGenerator');
w.edges=w.edges.filter(e=>!catchEdges.includes(e));
input('v12FinalPublicationNormalize','code').value=once(input('v12FinalPublicationNormalize','code').value,'20260929-unique-advanced-five','20260929-source-scope-five');
const changed=w.nodes.filter((n,i)=>JSON.stringify(n)!==JSON.stringify(base.nodes[i]));assert.equal(changed.length,6);
const file=path.join(dir,'01-出题子应用-Flash证据范围修复版.json');fs.writeFileSync(file,JSON.stringify(w,null,2));
for(const n of changed){const key=n.inputs.some(i=>i.key==='code')?'code':'systemPrompt';fs.writeFileSync(path.join(dir,n.name+(key==='code'?'-代码.js':'-系统提示词.txt')),n.inputs.find(i=>i.key===key).value);}
fs.writeFileSync(path.join(dir,'修改记录.json'),JSON.stringify({source,source_sha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),revision:'20260929-source-scope-five',changed_nodes:changed.map(n=>({id:n.nodeId,name:n.name})),removed_error_edge:catchEdges[0],nodes:w.nodes.length,edges:w.edges.length,models_unchanged:true,retrieval_calls_unchanged:true,public_contract_unchanged:true,online_run:false,prompt_lengths:{before:old.length,after:prompt.length},upstream_html_extraction_included:false},null,2));
console.log(file);
