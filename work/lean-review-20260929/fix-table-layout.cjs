const fs=require('fs'),assert=require('assert/strict'),vm=require('vm'),path=require('path');
const base='outputs/精简冻结版-五题-20260929',out='outputs/精简版-表格换行修复-20260929';
const w=JSON.parse(fs.readFileSync(base+'/01-出题子应用.json'));
const original=structuredClone(w);
for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2']){
 const input=w.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='code');
 const replacements=[
  ["const emit=(text,start,end)=>{for(const c of text)tokens.push({c,start,end});};", "const emit=(text,start,end,htmlBreak=false)=>{for(const c of text)tokens.push({c,start,end,htmlBreak});};"],
  ["emit(' ',i,i+m[0].length);i+=m[0].length;continue;}", "emit(' ',i,i+m[0].length,true);i+=m[0].length;continue;}"],
  ["if(!(cjk(flat[flat.length-1]?.c)&&cjk(tokens[j]?.c))&&flat.length)flat.push({c:' ',start:tokens[i].start,end:tokens[j-1].end});", "const left=flat[flat.length-1]?.c,right=tokens[j]?.c;\n      const htmlCjkBreak=tokens.slice(i,j).some(t=>t.htmlBreak)&&(cjk(left)||cjk(right));\n      if(!(cjk(left)&&cjk(right))&&!htmlCjkBreak&&flat.length)flat.push({c:' ',start:tokens[i].start,end:tokens[j-1].end});"],
  ['display-layout-1.1-no-clinical-rewrite','display-layout-1.2-html-cjk-break-no-clinical-rewrite']
 ];
 for(const [a,b]of replacements){assert(input.value.includes(a));assert.equal(input.value.split(a).length,2);input.value=input.value.replace(a,b);}
}
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(out+'/01-出题子应用.json',JSON.stringify(w,null,2));
for(const f of ['02-HTML单例外层.json','03-批量生成.json'])fs.copyFileSync(base+'/'+f,out+'/'+f);
const nodeCode=(wf,id)=>wf.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='code').value;
const get=(wf,id,name)=>vm.runInNewContext(nodeCode(wf,id)+'\n'+name);
const actual=JSON.parse(fs.readFileSync(__dirname+'/case-inspection.json'));
const diag=actual.candidate_pool.groups[0].workflow_diagnostics;
const q=diag.parsed_second_round_draft;
const pool={records:diag.cited_evidence_snapshot};
const packet=actual.candidate_pool.case_packet;
const checks=[];
function test(name,fn){try{fn();checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:e.message});}}
test('真实Q5修复前仅C/D引文不匹配；修复后两轮检查器均匹配，题目与证据不改写',()=>{
 const before=get(original,'v12AssemblyR2','verifyCandidateEvidence')(q,pool,packet);
 assert.equal(before.decision,'FAIL');assert.equal(before.question_checks[4].errors.length,2);
 const snapshot=JSON.stringify({q,pool,packet});
 for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2']){
  const r=get(w,id,'verifyCandidateEvidence')(q,pool,packet);
  assert.equal(r.decision,'PASS');
  for(const index of [2,3]){const match=r.question_checks[4].option_checks[index].quotes[0];assert.equal(match.match_mode,'display_layout_only');assert(match.contexts[0].text.includes('<br/>'));}
 }
 assert.equal(JSON.stringify({q,pool,packet}),snapshot);
});
test('只消除涉及中文的HTML显示换行；不吞并英文单词/数字/表格单元格/临床符号',()=>{
 const normal=get(w,'v12AssemblyR2','sourceLayout');
 assert.equal(normal('COOICANCER<br/>研究<br/>(NCT02881138)').text,normal('COOICANCER研究(NCT02881138)').text);
 for(const [a,b]of [['no<br/>where','nowhere'],['1<br/>2','12'],['甲</td><td>乙','甲乙'],['≤1','≥1'],['0.5','5'],['不可停药','可停药'],['NCT02881138','NCT03052634']])assert.notEqual(normal(a).text,normal(b).text);
});
test('错研究编号和跨单元格拼接引文仍拒绝',()=>{
 for(const quote of ['COOICANCER研究(NCT99999999)','COOICANCER研究(NCT02881138)I期研究']){
  const draft=structuredClone(q);draft.questions[4].verification.quotes.D=[quote];
  const r=get(w,'v12AssemblyR2','verifyCandidateEvidence')(draft,pool,packet);assert.equal(r.question_checks[4].decision,'FAIL');
 }
});
test('除两个节点的显示匹配代码外，模型/提示词/检索/拓扑/HTML与批量工作流逐字不变',()=>{
 const masked=structuredClone(w);
 for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2'])masked.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='code').value=nodeCode(original,id);
 assert.deepEqual(masked,original);
 for(const f of ['02-HTML单例外层.json','03-批量生成.json'])assert(fs.readFileSync(base+'/'+f).equals(fs.readFileSync(out+'/'+f)));
});
let regression=fs.readFileSync('work/reference-workflow-20260929/test-child.cjs','utf8').replaceAll('outputs/参考版恢复-五题适配-20260929',out);
new Function('require','__dirname',regression)(require,path.resolve('work/reference-workflow-20260929'));
const core=JSON.parse(fs.readFileSync(out+'/五题核心回归.json'));
const all=[...core.checks,...checks];
const report={checks:all,passed:all.filter(c=>c.pass).length,failed:all.filter(c=>!c.pass).length,actual_case_id:actual.case_id,scope:'literal_source_presence_only',semantic_support:'not_verified',medical_review_status:'not_performed',online_verified:false,api_calls:0};
fs.writeFileSync(out+'/离线检查结果.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(report.failed)process.exitCode=1;
