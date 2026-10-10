const fs=require('fs');
const s=fs.readFileSync('C:/Users/admin/.codex/attachments/0336b468-3bd1-49ab-acda-342fdd0508d9/已粘贴的文本.txt','utf8');
try{JSON.parse(s);console.log('JSON合法')}catch(e){console.log('JSON解析失败:',e.message)}
const marker='"diagnostics":';const start=s.indexOf(marker)+marker.length;const end=s.indexOf(',"selected_candidate_round"',start);
const ev='"evidence_verification":';const at=s.indexOf(ev,start)+ev.length;let depth=0,quoted=false,escape=false,stop=at;
for(let i=at;i<s.length;i++){const c=s[i];if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;}else if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){stop=i+1;break;}}
let isolated='{"evidence_verification":'+s.slice(at,stop).replace(/\\(?!["\\/bfnrtu])/g,'\\\\')+'}';
let d;try{d=JSON.parse(isolated);}catch(e){console.log('诊断区仍无法解析:',e.message);process.exit(0);}fs.writeFileSync(__dirname+'/esophagus-diagnostics.json',JSON.stringify(d,null,2));
console.log(Object.keys(d));
for(const q of d.evidence_verification.question_checks)console.log(JSON.stringify({id:q.question_id,evidence:q.evidence_id,errors:q.errors,failed:q.option_checks.flatMap(o=>o.quotes.filter(v=>!v.matched).map(v=>({option:o.option,quote:v.quote}))),sampleContext:q.option_checks.flatMap(o=>o.quotes.flatMap(v=>v.contexts||[])).slice(0,1)}));
for(const [k,v] of Object.entries(d))if(k!=='evidence_verification')console.log(k,Array.isArray(v)?'array '+v.length:typeof v==='object'?Object.keys(v||{}):String(v).slice(0,150));
