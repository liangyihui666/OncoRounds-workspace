const fs=require('fs'),path=require('path');
const p='C:/Users/admin/.codex/attachments/e6b9c2ce-fadf-4ebc-908b-66530a735b90/已粘贴的文本.txt';
const data=JSON.parse(fs.readFileSync(p,'utf8').trim().replace(/^~~~json\s*/,'').replace(/\s*~~~$/,''));
const dir='outputs/第二批十例结果核对-20260928';fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(dir+'/原始结果解析.json',JSON.stringify(data.output_data,null,2));
const src='C:/Users/admin/Desktop/新增病例候选-第2批10例-2026-09-11';
for(const f of fs.readdirSync(src).filter(s=>s.endsWith('.html'))){let t=fs.readFileSync(path.join(src,f),'utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,'').replace(/<\/(?:p|div|h\d|li)>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\n\s*\n/g,'\n');fs.writeFileSync(dir+'/'+f.slice(0,6)+'.txt',t);}
console.log('BATCH',JSON.stringify(data.batch_report));
data.output_data.forEach((r,i)=>console.log(i+1,r.Questions?.case_id,r.detail?.home?.display_title,r.Questions?.questions?.length,JSON.stringify(r.Questions?.missing_information)));
const start=Number(process.argv[2]||0),end=Number(process.argv[3]||0);
data.output_data.slice(start,end).forEach((r,j)=>{console.log('\nROW',j+start+1,JSON.stringify(r.Questions));});
