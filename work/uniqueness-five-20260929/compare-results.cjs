const fs=require('fs');
const dir='work/flash-plus-pair-20260929';fs.mkdirSync(dir,{recursive:true});
for(const [label,id]of [['flash','0882c226-20f1-4f53-bdd7-edb384916187'],['plus','57483023-c71d-48f7-b0c3-dc9a3ed008fe']]){
 const raw=fs.readFileSync('C:/Users/admin/.codex/attachments/'+id+'/已粘贴的文本.txt','utf8');
 let repaired='',inside=false,count=0;
 for(let i=0;i<raw.length;i++){const c=raw[i];if(c==='"'){inside=!inside;repaired+=c;}else if(inside&&c==='\\'){const n=raw[++i];if(!'"\\/bfnrtu'.includes(n)){repaired+='\\';count++;}repaired+='\\'+n;}else repaired+=c;}
 const x=JSON.parse(repaired);fs.writeFileSync(dir+'/'+label+'.json',JSON.stringify(x,null,2));
 console.log(label,'escaped invalid backslashes for reading only',count,'keys',Object.keys(x));
 console.log('FINAL',JSON.stringify(x.final_data));
 console.log('GROUPS',x.selection_report?.source_groups?.length);
}
