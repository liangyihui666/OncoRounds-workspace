const fs=require('fs');
const s=fs.readFileSync('C:/Users/admin/.codex/attachments/ed9da0e6-e284-4207-b3c6-a7941dcb6766/已粘贴的文本.txt','utf8');
const lines=s.split('\n');
console.log('FIELDS',lines.filter(l=>/^  "[a-z_]+":/.test(l)).map(l=>l.trim().slice(0,75)));
for(const key of ['candidate_json','second_round_raw','structure_decision','structure_errors','structure_warnings']){
 const l=lines.find(l=>l.trim().startsWith('"'+key+'":'));
 if(!l)continue;
 try{const x=JSON.parse('{'+l.trim().replace(/,$/,'')+'}')[key];const d=key==='candidate_json'||key==='second_round_raw'?JSON.parse(x):x;console.log(key,typeof d==='object'?d.questions?.map(q=>({id:q.id,keys:Object.keys(q),explain_length:q.explain?.length,keyPoint:q.keyPoint})):d);}
 catch(e){console.log(key,'not single-line parseable:',e.message.slice(0,160));}
}
