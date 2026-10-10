const fs=require('fs');
const dir=__dirname,source='C:/Users/admin/.codex/attachments/e6408763-5e3a-42f2-a08f-4c8d09ec4435/已粘贴的文本.txt';
const raw=fs.readFileSync(source,'utf8');
// Read-only recovery of illegal clipboard escapes; never use this to repair generated medical facts.
function recover(s){let out='',inside=false;const repairs=[];for(let i=0;i<s.length;i++){
 const c=s[i];if(c==='"'){inside=!inside;out+=c;}else if(inside&&c==='\\'){
  const next=s[++i];if(!'"\\/bfnrtu'.includes(next)){out+='\\';repairs.push({position:i-1,escape:'\\'+next});}out+='\\'+next;
 }else out+=c;
}return {text:out,repairs};}
let parsed,outerRepairs=[];
try{parsed=JSON.parse(raw);}catch(e){console.log('original_parse_error: '+e.message);const r=recover(raw);parsed=JSON.parse(r.text);outerRepairs=r.repairs;}
const summary=parsed.map((s,i)=>{
 if(typeof s==='string'&&!s.trim())return {index:i+1,empty:true};
 let x,repairs=[];try{x=typeof s==='string'?JSON.parse(s):s;}catch(e){try{const r=recover(s);x=JSON.parse(r.text);repairs=r.repairs;}catch(e2){return {index:i+1,parse_error:e2.message};}}
 fs.writeFileSync(dir+'/item-'+(i+1)+'.json',JSON.stringify(x,null,2));
 const e=x.execution_report,g=e?.source_groups?.[0],d=g?.workflow_diagnostics,q=x.output_data?.Questions;
 return {index:i+1,inner_escape_repairs:repairs,type:x.record_type,case_id:q?.case_id,title:x.output_data?.detail?.home?.display_title,count:q?.question_count,status:e?.status,revision:g?.workflow_revision,errors:g?.program_check?.errors,quote_status:d?.evidence_verification?.decision,quote_errors:d?.evidence_verification?.errors,has_verification:!!d?.evidence_verification,rawchars:d?.model_execution,pool:d?.compression_report?.kept_total,missing:q?.missing_information};
});
fs.writeFileSync(dir+'/summary.json',JSON.stringify({outer_escape_repairs:outerRepairs,items:summary},null,2));
console.log(JSON.stringify({entries:parsed.length,empty:summary.filter(x=>x.empty).map(x=>x.index),outer_escape_repair_count:outerRepairs.length,items:summary},null,2));
