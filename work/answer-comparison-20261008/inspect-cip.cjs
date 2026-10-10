const fs=require('fs');
function recoverEscapes(raw){let out='';for(let i=0;i<raw.length;){if(raw[i]!=='\\'){out+=raw[i++];continue;}let j=i;while(raw[j]==='\\')j++;const count=j-i;out+='\\'.repeat(count+(count%2&&!/["\\/bfnrtu]/.test(raw[j]||'')?1:0));i=j;}return out;}
const raw=fs.readFileSync('C:/Users/admin/.codex/attachments/97281de0-4eb5-46f5-a422-2fc9786d97b6/已粘贴的文本.txt','utf8');
let d;try{d=JSON.parse(raw);}catch(e){console.log('原附件JSON转义错误:',e.message);try{d=JSON.parse(recoverEscapes(raw));}catch(e){console.log('无法恢复:',e.message);process.exit(0);}}
let q;try{q=JSON.parse(d.candidate_json);}catch(e){console.log('候选转义错误:',e.message);q=JSON.parse(recoverEscapes(d.candidate_json));d.candidate_json=JSON.stringify(q);}
console.log(Object.keys(d),'question_count',q.questions.length);
for(const i of [2,3]){const x=q.questions[i];console.log(JSON.stringify(x));console.log(JSON.stringify(d.evidence_pool.records.filter(r=>r.evidence_id===x.evidence_id)));}
fs.writeFileSync(__dirname+'/cip-real-input.json',JSON.stringify(d,null,2));
