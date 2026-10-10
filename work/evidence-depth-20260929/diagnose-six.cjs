const fs=require('fs'),vm=require('vm'),path=require('path');
const dest=path.resolve('work/blank-six-20260929');fs.mkdirSync(dest,{recursive:true});
const ids=['ce1d5020-c819-4cb3-9d5e-da2e760d728f','3307aa07-84aa-4737-a36d-fa31d18ba167','d8ae3056-62dc-4a24-9603-7293f9417ae2','ee8d9127-9263-408f-822f-b3363af64607','9dfc81ea-99a0-4900-a44e-2158626a454f','ea6e5daa-3596-4a2e-b264-36f420035176'];
function recover(s){let out='',inside=false,n=0;for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){inside=!inside;out+=c;}else if(inside&&c==='\\'){const next=s[++i];if(!'"\\/bfnrtu'.includes(next)){out+='\\';n++;}out+='\\'+next;}else out+=c;}return {text:out,n};}
const wf=JSON.parse(fs.readFileSync('outputs/证据原句核对与进阶出题-20260929/02-HTML单例外层-配套版.json','utf8'));
const node=wf.nodes.find(n=>n.nodeId==='jKqMCN8eJKvkngnI');
fs.writeFileSync(dest+'/node-metadata.json',JSON.stringify(node.inputs.map(i=>({...i,value:typeof i.value==='string'&&i.value.length>1000?'LONG_CODE':i.value})),null,2));
const code=node.inputs.find(i=>typeof i.value==='string'&&i.value.includes('function main(')).value;
fs.writeFileSync(dest+'/outer-final.js',code);
const summary=[];
for(const id of ids){let raw=fs.readFileSync('C:/Users/admin/.codex/attachments/'+id+'/已粘贴的文本.txt','utf8'),x,repairs=0;try{x=JSON.parse(raw);}catch(e){const r=recover(raw);x=JSON.parse(r.text);repairs=r.n;}
 fs.writeFileSync(dest+'/'+x.case_id+'.json',JSON.stringify(x,null,2));
 const p=x.candidate_pool,g=p.groups?.[0],d=g?.workflow_diagnostics;
 const row={case_id:x.case_id,title:x.case_title,clipboard_escape_repairs:repairs,count:p.candidate_count,transport_mode:x.transport_mode,status:g?.flow_status,completion:g?.completion,errors:g?.program_check?.errors,missing:g?.upstream_missing_information,quote_errors:d?.evidence_verification?.errors,diagnostic_keys:Object.keys(d||{}),model:d?.model_execution};
 try{const ctx=vm.createContext({input:x});vm.runInContext(code+'\nvar replayResult=main(input);',ctx,{timeout:15000});row.replay={keys:Object.keys(ctx.replayResult),response_length:ctx.replayResult.response_json?.length,status:ctx.replayResult.execution_report?.status};fs.writeFileSync(dest+'/'+x.case_id+'-replay.json',JSON.stringify(ctx.replayResult,null,2));}catch(e){row.replay_error=e.stack.split('\n').slice(0,6).join('\n');}
 summary.push(row);
}
fs.writeFileSync(dest+'/summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
