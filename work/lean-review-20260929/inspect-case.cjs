const fs=require('fs');
const raw=fs.readFileSync('C:/Users/admin/.codex/attachments/443b26d7-4ba3-4177-be12-169d45096b32/已粘贴的文本.txt','utf8');
let fixed='',inString=false,repairs=0;
// Local inspection only: retain invalid JSON escape backslashes as literal characters.
for(let i=0;i<raw.length;i++){
 const c=raw[i];
 if(inString&&c==='\\'){
  if(/["\\/bfnrtu]/.test(raw[i+1]||'')){fixed+=c+raw[++i];continue;}
  fixed+='\\\\';repairs++;continue;
 }
 if(c==='"')inString=!inString;
 fixed+=c;
}
const x=JSON.parse(fixed),d=x.candidate_pool.groups[0].workflow_diagnostics;
fs.writeFileSync(__dirname+'/case-inspection.json',JSON.stringify(x,null,2));
console.log(JSON.stringify({inspection_escape_repairs:repairs,diagnostic_keys:Object.keys(d),checks:d.evidence_verification?.question_checks?.map(q=>({id:q.question_id,decision:q.decision,errors:q.errors})),q5:d.parsed_second_round_draft?.questions?.find(q=>q.id==='Q5'),source:d.cited_evidence_snapshot?.filter(r=>r.evidence_id==='GB02')},null,2));
