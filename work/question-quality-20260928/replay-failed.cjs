const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source='C:/Users/admin/.codex/attachments/ed9da0e6-e284-4207-b3c6-a7941dcb6766/已粘贴的文本.txt';
const text=fs.readFileSync(source,'utf8');
// Local inspection only. Preserve literal backslashes in invalid pasted JSON escapes (e.g. \$).
// This does not edit the user's file or alter workflow parsing rules.
let repaired='',inside=false,changes=0;
for(let i=0;i<text.length;i++){
 const c=text[i];
 if(c==='"'){inside=!inside;repaired+=c;}
 else if(inside&&c==='\\'){
  const n=text[++i];if(!'"\\/bfnrtu'.includes(n)){repaired+='\\';changes++;}repaired+='\\'+n;
 }else repaired+=c;
}
let data;try{data=JSON.parse(repaired);}catch(e){console.log('inspect parse failed',e.message);process.exit(1);}
const raw=JSON.parse(data.second_round_raw),candidate=JSON.parse(data.candidate_json);
const workflow=JSON.parse(fs.readFileSync('outputs/五题内容修订-20260928/01-出题子应用-五题内容修订版.json','utf8'));
const code=id=>workflow.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='code').value;
const assembly=vm.runInNewContext(code('v12AssemblyR2')+'\nmain');
const actual=assembly({candidate_json:data.second_round_raw,evidence_pool:data.evidence_pool,second_cancer_type:data.second_cancer_type});
assert.equal(actual.structure_decision,'FAIL');
assert.deepEqual(JSON.parse(JSON.stringify(actual.structure_errors)),data.structure_errors);
for(const id of ['Q2','Q4']){
 const q=raw.questions.find(q=>q.id===id);assert(!('keyPoint' in q));assert.equal(q.explain.split(/\n|\\n/).length,1);
 assert.equal(candidate.questions.find(q=>q.id===id).explain,q.explain);
}
const dir='outputs/直肠癌失败根因核对-20260928';fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(dir+'/第二轮原始题目.json',JSON.stringify(raw,null,2));
const report={case_id:data.case_id,pasted_outer_invalid_escapes_preserved:changes,
 note:'仅为读取粘贴附件而转义非法反斜杠；原文件未改。candidate_json及second_round_raw可独立直接JSON.parse，未做内容修补。',
 structure_errors:actual.structure_errors,question_count:raw.questions.length,passed_replay:true,
 failed_question_ids:['Q2','Q4'],missing_content_recoverable_by_formatting:false,
 retrieval_record_count:data.evidence_pool.records.length,medical_approval:false};
fs.writeFileSync(dir+'/离线复现报告.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
for(const id of ['GB02','CS01','GB04']){const r=data.evidence_pool.records.find(r=>r.evidence_id===id);console.log(id,r?.raw_snippet);}
