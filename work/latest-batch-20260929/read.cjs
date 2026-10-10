const fs=require('fs');
const t=fs.readFileSync('C:/Users/admin/.codex/attachments/0936f3fe-5488-4102-898b-bd36d782b02c/已粘贴的文本.txt','utf8').trim().replace(/^~~~json\s*/,'').replace(/\s*~~~$/,'');
let r='',inside=false,n=0;
for(let i=0;i<t.length;i++){const c=t[i];if(c==='"'){inside=!inside;r+=c;}else if(inside&&c==='\\'){const next=t[++i];if(!'"\\/bfnrtu'.includes(next)){r+='\\';n++;}r+='\\'+next;}else r+=c;}
const x=JSON.parse(r);fs.writeFileSync('work/latest-batch-20260929/results.json',JSON.stringify(x,null,2));
console.log('keys',Object.keys(x),'repairs',n,'batch',JSON.stringify(x.batch_report));
x.output_data.forEach((v,i)=>console.log(i+1,v.Questions.case_id,v.Questions.question_count,v.detail?.home?.display_title,v.Questions.questions.map(q=>q.answer).join(''),Object.keys(v)));
