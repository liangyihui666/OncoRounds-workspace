const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..');
const out=path.join(root,'outputs/五题内容修订-20260928');
fs.mkdirSync(out,{recursive:true});
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const child=load('outputs/恢复知识库检索-20260928/01-出题子应用-保留知识库精简版.json');
const before=structuredClone(child);
const input=(id,key)=>child.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key===key);
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8').trim();
const prompt=read('generator.txt');
input('sR35QbYF2xamDQR3','systemPrompt').value=prompt;
input('v12RevisionGenerator','systemPrompt').value=read('revision.txt')+'\n\n'+prompt;
input('v12RevisionInput','code').value=read('revision_input.js');
let code=input('v12FinalPublicationNormalize','code').value;
const anchor=' const cited=parse(inputs.cited_evidence);';
assert.equal(code.split(anchor).length,2);
code=code.replace(anchor,anchor+`
 const evidenceRecords=arr(parse(inputs.evidence_pool)?.records);
 const questionBindings=arr(p?.questions).map(q=>{
   const ref=q?.guidelineRef;
   const matches=ref?evidenceRecords.filter(r=>r.doc_id===ref.doc_id&&String(r.split_index)===String(ref.split_index)):[];
   return {question_id:q?.id||'',evidence_id:matches.length===1?matches[0].evidence_id:null,
     doc_id:ref?.doc_id||'',split_index:ref?.split_index??null,matching_record_count:matches.length};
 });
 const usedIds=new Set(questionBindings.filter(b=>b.matching_record_count===1).map(b=>b.evidence_id));
 const evidenceSnapshot=evidenceRecords.filter(r=>usedIds.has(r.evidence_id)).map(r=>({
   evidence_id:r.evidence_id,doc_id:r.doc_id,split_index:r.split_index,type:r.type,authority:r.authority,
   source_title:r.source_title,source_version:r.source_version,source_section:r.source_section,source_url:r.source_url,
   snippet:typeof r.raw_snippet==='string'&&r.raw_snippet.trim()?r.raw_snippet:r.snippet,
   hard_evidence_type:r.hard_evidence_type,reasoning_eligible:r.reasoning_eligible
 }));`);
const marker="diagnostics:{scope:'debug_only_not_learner_content',";
assert.equal(code.split(marker).length,2);
code=code.replace(marker,marker+"question_evidence_bindings:questionBindings,cited_evidence_snapshot:evidenceSnapshot,");
code=code.replace("workflow_revision:'20260928-slim-five'","workflow_revision:'20260928-quality-five'");
input('v12FinalPublicationNormalize','code').value=code;
assert.deepEqual(child.edges,before.edges);
const changed=child.nodes.filter((n,i)=>JSON.stringify(n)!==JSON.stringify(before.nodes[i]));
assert.deepEqual(new Set(changed.map(n=>n.nodeId)),new Set(['sR35QbYF2xamDQR3','v12RevisionGenerator','v12RevisionInput','v12FinalPublicationNormalize']));
fs.writeFileSync(path.join(out,'01-出题子应用-五题内容修订版.json'),JSON.stringify(child,null,2));
for(const [id,key,name] of [
 ['sR35QbYF2xamDQR3','systemPrompt','题目生成-首轮-系统提示词.txt'],
 ['v12RevisionGenerator','systemPrompt','题目修订-第二轮-系统提示词.txt'],
 ['v12RevisionInput','code','第二轮修订输入-代码.js'],
 ['v12FinalPublicationNormalize','code','整理最终输出-代码.js']
])fs.writeFileSync(path.join(out,name),input(id,key).value);
const prompts=d=>d.nodes.flatMap(n=>n.inputs).filter(i=>i.key==='systemPrompt'&&typeof i.value==='string').reduce((s,i)=>s+i.value.length,0);
fs.writeFileSync(path.join(out,'修改记录.json'),JSON.stringify({revision:'20260928-quality-five',changed_nodes:changed.map(n=>n.name),nodes:child.nodes.length,edges:child.edges.length,generation_prompt_characters_before:prompts(before),generation_prompt_characters_after:prompts(child),online_verified:false,medical_correctness_verified:false},null,2));
console.log('Built '+out);
