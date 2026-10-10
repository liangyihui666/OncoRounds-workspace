const fs=require('fs'),path=require('path'),cp=require('child_process');
const dir='work/compact-return-nine-20260929',out='outputs/精简返回九例复核-20260929';fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(out,{recursive:true});
const ids=['6b271a43-aa42-4388-a34c-5a8761b1a833','dff16c8b-c13b-4934-9d77-533b9bf8d2e7','e490e16b-9472-43ce-ab05-4fd6f9901f21','42aff205-9dbd-4d47-b11d-c57d65ffe043','a077847a-9f06-417e-8ce6-e4ff49f51627','8543ff99-603c-4956-a542-38ed5716d9e2','9270fbd5-0808-4347-b4ad-ff19248eba83','b1973509-a158-40d2-abc2-1ea7fc2a6751','5dcd8afa-cefb-4400-8500-612ceee81831'];
function recover(s){let out='',inside=false,n=0;for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){inside=!inside;out+=c;}else if(inside&&c==='\\'){const next=s[++i];if(!'"\\/bfnrtu'.includes(next)){out+='\\';n++;}out+='\\'+next;}else out+=c;}return {text:out,n};}
function parse(s){try{return {value:JSON.parse(s),repairs:0};}catch(e){const r=recover(s);return {value:JSON.parse(r.text),repairs:r.n};}}
const prior=[];
for(const file of fs.readdirSync('work/blank-six-20260929').filter(n=>n.endsWith('-replay.json'))){const x=JSON.parse(fs.readFileSync('work/blank-six-20260929/'+file));prior.push(JSON.parse(x.response_json));}
for(const i of [4,5,6,10]){const file='work/batch-evidence-depth-20260929/item-'+i+'.json';if(fs.existsSync(file))prior.push(JSON.parse(fs.readFileSync(file)));}
const rows=[];
ids.forEach((id,i)=>{try{
 const outer=parse(fs.readFileSync('C:/Users/admin/.codex/attachments/'+id+'/已粘贴的文本.txt','utf8')),inner=parse(outer.value.response_json),x=inner.value;
 fs.writeFileSync(dir+'/item-'+(i+1)+'.json',JSON.stringify(x,null,2));
 const q=x.output_data?.Questions,e=x.execution_report,g=e?.source_groups?.[0],d=g?.workflow_diagnostics,p=prior.find(p=>p.output_data?.Questions?.case_id===q?.case_id);
 const matched=[];for(const check of d?.evidence_verification?.question_checks||[])for(const option of check.option_checks||[])for(const quote of option.quotes||[]){const records=d.cited_evidence_snapshot.filter(r=>r.evidence_id===check.evidence_id),normal=s=>String(s).replace(/\s+/g,' ').trim();matched.push({q:check.question_id,option:option.option,matched:records.length===1&&normal(records[0].snippet).includes(normal(quote.quote))});}
 const row={index:i+1,case_id:q?.case_id,title:x.output_data?.detail?.home?.display_title,outer_keys:Object.keys(outer.value),clipboard_repairs:outer.repairs+inner.repairs,record_type:x.record_type,count:q?.question_count,status:e?.status,revision:g?.workflow_revision,model_count:g?.completion?.model_question_count,errors:g?.program_check?.errors,quote_status:d?.evidence_verification?.decision,quote_count:matched.length,quote_match_count:matched.filter(v=>v.matched).length,same_questions_as_previous:p?JSON.stringify(q)===JSON.stringify(p.output_data.Questions):null,same_diagnostics_as_previous:p?JSON.stringify(d)===JSON.stringify(p.execution_report?.source_groups?.[0]?.workflow_diagnostics):null};
 if(q?.question_count===5){
  fs.writeFileSync(dir+'/questions-'+(i+1)+'.json',JSON.stringify(q));fs.writeFileSync(dir+'/evidence-'+(i+1)+'.json',JSON.stringify(d.cited_evidence_snapshot.map(r=>({...r,link:r.source_url||''}))));
  const a=cp.spawnSync('C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',['C:/Users/admin/.codex/skills/fastgpt-oncology-grand-rounds/scripts/audit_questions.py',dir+'/questions-'+(i+1)+'.json','--evidence',dir+'/evidence-'+(i+1)+'.json','--require-developer-format'],{encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8'}});
  row.audit={exit:a.status,log:(a.stdout||'')+(a.stderr||'')};
 }
 rows.push(row);
}catch(e){rows.push({index:i+1,error:e.message.slice(0,200)});}});
fs.writeFileSync(out+'/核对结果.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows,null,2));
