const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..');
const out=path.join(root,'outputs/五题结构与证据边界修复-20260928');
fs.mkdirSync(out,{recursive:true});
const before=JSON.parse(fs.readFileSync(path.join(root,'outputs/五题内容修订-20260928/01-出题子应用-五题内容修订版.json'),'utf8'));
const child=structuredClone(before);
const input=(id,k)=>child.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key===k);
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8').trim();
function replaceOnce(s,a,b){assert.equal(s.split(a).length,2,'anchor '+a);return s.replace(a,b);}
input('sR35QbYF2xamDQR3','systemPrompt').value=read('generator.txt');
input('v12RevisionGenerator','systemPrompt').value=read('revision.txt')+'\n\n'+read('generator.txt');
for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2']){
  let code=input(id,'code').value;
  code=read('explanation_adapter.js')+'\n'+code;
  code=replaceOnce(code,'const candidate = candidateResult.parsed;','const candidate = normalizeExplanations(candidateResult.parsed);');
  // Keep internalRaw verbatim for diagnosis. Public assembly sees only normalized explanations.
  const anchor="if(typeof q.explain==='string'&&q.explain.length>800)";
  code=replaceOnce(code,anchor,`for(const row of rows){
   const reason=row.replace(/^[A-D]｜(?:正确|不正确)：/,'').trim();
   if(/^(?:[A-Z]{1,8}\\d+|该(?:记录|指南|研究)|指南|证据|原文)(?:明确|指出|提示|支持|建议)?[。；:：\\s]*$/.test(reason)) errors.push('解析只有证据指代，缺少实际理由');
 }
 `+anchor);
  input(id,'code').value=code;
}
let rev=input('v12RevisionInput','code').value;
rev=replaceOnce(rev,"const text=[q?.question,...(Array.isArray(q?.options)?q.options:[]),q?.explain,q?.keyPoint]",`const reasons=q?.explain&&typeof q.explain==='object'&&!Array.isArray(q.explain)?Object.values(q.explain):[q?.explain];
    const structural_defects=[];
    if(typeof q?.keyPoint!=='string'||!q.keyPoint.trim())structural_defects.push('keyPoint缺失或为空：必须撰写完整决策原则');
    if(q?.explain&&typeof q.explain==='object'&&!Array.isArray(q.explain)){
      for(const k of ['A','B','C','D'])if(typeof q.explain[k]!=='string'||!q.explain[k].trim())structural_defects.push(k+'解析缺失：必须补写实际理由');
      if(Object.keys(q.explain).some(k=>!['A','B','C','D'].includes(k)))structural_defects.push('explain只能包含A/B/C/D四键');
    }else{
      const rows=typeof q?.explain==='string'?q.explain.trim().split(/\\r?\\n/).filter(s=>s.trim()):[];
      if(rows.length!==4)structural_defects.push('旧稿解析不完整：现有'+rows.length+'行，必须重写四项理由');
    }
    const text=[q?.question,...(Array.isArray(q?.options)?q.options:[]),...reasons,q?.keyPoint]`);
rev=replaceOnce(rev,"return {question_id:q?.id||'',evidence_id:q?.evidence_id||'',matching_record_count:matches.length,", "return {question_id:q?.id||'',evidence_id:q?.evidence_id||'',structural_defects,matching_record_count:matches.length,");
rev=replaceOnce(rev,'|准确分期/g)','|准确分期|无劣|非劣|等效|排除.{0,12}获益|维持|缓解|野生型|联合/g)');
rev=replaceOnce(rev,"review_all_questions:true,question_checks:checks,",`review_all_questions:true,
      evidence_scope_checklist:[
        '答案每项措施是否都由本题绑定的同一记录支持？只支持急性处理时不附带后续方案。',
        '研究的人群、线次、诱导/维持阶段及疗效状态是否与题干匹配？未记载不视为满足。',
        '证据结论是否保留研究设计、终点与亚组限制？趋势或差异不显著不能改为非劣。',
        '决定答案的分子结果、疗效与毒性在此时点是否已知？排除项不能使用未来事实。',
        '同一记录是否也允许另一选项？无法区分就换题；避免将某亚组推荐反推其他亚组绝无获益。',
        '毒性严重度、缺陷程度、停药和恢复条件是否明确匹配？不得将暂缓改成一律永久停药。'
      ],question_checks:checks,`);
rev=replaceOnce(rev,'每题13字段。逐题完成内容核对','每题13字段，keyPoint必填，explain为A/B/C/D四键对象，每键写完整理由。逐题完成内容核对');
input('v12RevisionInput','code').value=rev;
input('v12FinalPublicationNormalize','code').value=input('v12FinalPublicationNormalize','code').value.replace('20260928-quality-five','20260928-structured-five');
assert.deepEqual(child.edges,before.edges);
assert.deepEqual(child.nodes.map(n=>n.nodeId),before.nodes.map(n=>n.nodeId));
const changed=child.nodes.filter((n,i)=>JSON.stringify(n)!==JSON.stringify(before.nodes[i]));
assert.equal(changed.length,6);
fs.writeFileSync(path.join(out,'01-出题子应用-五题结构与证据边界修复版.json'),JSON.stringify(child,null,2));
for(const n of changed){const k=n.inputs.some(i=>i.key==='code')?'code':'systemPrompt';fs.writeFileSync(path.join(out,n.name+(k==='code'?'-代码.js':'-系统提示词.txt')),n.inputs.find(i=>i.key===k).value);}
fs.writeFileSync(path.join(out,'修改记录.json'),JSON.stringify({revision:'20260928-structured-five',base:'20260928-quality-five',changed_nodes:changed.map(n=>({id:n.nodeId,name:n.name})),nodes:child.nodes.length,edges:child.edges.length,model_calls:2,public_contract_changed:false,model_response_format:'json_object (unchanged; no provider-enforced schema)',online_verified:false,medical_correctness_verified:false},null,2));
console.log('Built '+out);
