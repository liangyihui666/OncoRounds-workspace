const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const base='outputs/HTML原句排版修复-20260929',out='outputs/错误返回定位版-20260929';fs.mkdirSync(out,{recursive:true});
const names={child:'01-出题子应用.json',outer:'02-HTML单例外层.json',batch:'03-批量生成.json'};
const before=Object.fromEntries(Object.entries(names).map(([r,f])=>[r,JSON.parse(fs.readFileSync(base+'/'+f))]));const w=structuredClone(before);
const helpers=fs.readFileSync(__dirname+'/helpers.js','utf8');
const node=(r,id)=>w[r].nodes.find(n=>n.nodeId===id),input=(r,id,k)=>node(r,id).inputs.find(i=>i.key===k);
const once=(s,a,b)=>{assert.equal(s.split(a).length,2,a);return s.replace(a,()=>b);};
const ref=(key,id,port)=>({key,label:key,valueType:'string',required:false,selectedType:'reference',renderTypeList:['reference'],value:[id,port]});
const edge=(s,t,error=false)=>({source:s,target:t,sourceHandle:s+(error?'-source_catch-right':'-source-right'),targetHandle:t+'-target-left'});
function codeNode(id,name,code,inputs,parent){return {nodeId:id,...parent?{parentNodeId:parent}:{},name,intro:'保留执行错误，不进行医学判定',avatar:'core/workflow/template/codeRun',flowNodeType:'code',showStatus:true,position:{x:2500,y:2000},catchError:false,inputs:[{key:'codeType',value:'js',valueType:'string',selectedType:'hidden',renderTypeList:['hidden']},{key:'code',value:code,valueType:'string',selectedType:'custom',renderTypeList:['custom']},...inputs],outputs:[{id:'response_json',key:'response_json',label:'response_json',type:'dynamic',valueType:'string'}]};}
// Every existing single-case error output now reaches an explicit error answer.
const errorNodes=w.outer.nodes.filter(n=>n.outputs.some(o=>o.type==='error'));
const errorId='caseFailureReturn20260929',answerId='caseFailureAnswer20260929';
const specs=errorNodes.map((n,i)=>({key:'error_'+i,id:n.nodeId,name:n.name,port:n.outputs.find(o=>o.type==='error').id}));
const collect=helpers+'\nfunction main(inputs){const stages='+JSON.stringify(specs.map(s=>({key:s.key,name:s.name})))+';const found=stages.find(s=>inputs[s.key]!=null&&String(inputs[s.key]).trim());return {response_json:JSON.stringify(failureEnvelope(found?found.name:"单例应用",found?inputs[found.key]:"错误分支已触发，但错误输出为空"))};}';
w.outer.nodes.push(codeNode(errorId,'执行错误整理',collect,specs.map(s=>ref(s.key,s.id,s.port))));
const answer=structuredClone(node('outer','bTxgvHEhA8qEPFTa'));answer.nodeId=answerId;answer.name='执行错误输出';answer.position={x:3000,y:2000};answer.inputs.find(i=>i.key==='text').value='{{$'+errorId+'.response_json$}}';w.outer.nodes.push(answer);
for(const s of specs){node('outer',s.id).catchError=true;w.outer.edges=w.outer.edges.filter(e=>!(e.source===s.id&&e.sourceHandle===s.id+'-source_catch-right'));w.outer.edges.push(edge(s.id,errorId,true));}
w.outer.edges.push(edge(errorId,answerId));
// Catch failures of the application call itself and distinguish silent empty return.
const app='iW8Qg5stNA8T2Qp9',capture='batchCapture20260929',end='batchParallelEnd20260909',parent='rv8pvsOmvinDpzaN';
const cap=helpers+`\nfunction main({answer_text,call_error}){
 if(call_error!=null&&String(call_error).trim())return {response_json:JSON.stringify(failureEnvelope('三连',call_error,'CHILD_WORKFLOW_ERROR'))};
 if(typeof answer_text!=='string'||!answer_text.trim())return {response_json:JSON.stringify(failureEnvelope('三连','被调用应用未返回answerText；上游没有提供错误文本，需查看该任务内最后执行的节点。','EMPTY_CHILD_RESPONSE'))};
 return {response_json:answer_text};
}`;
w.batch.nodes.push(codeNode(capture,'单例返回检查',cap,[ref('answer_text',app,'answerText'),ref('call_error',app,'system_error_text')],parent));
node('batch',capture).position={x:2050,y:-1312.5};node('batch',app).catchError=true;
w.batch.edges=w.batch.edges.filter(e=>e.source!==app);w.batch.edges.push(edge(app,capture),edge(app,capture,true),edge(capture,end));
input('batch',parent,'childrenNodeIdList').value.push(capture);input('batch',end,'loopEndInput').value=[capture,'response_json'];
let b=input('batch','batchFinal20260909','code').value;
b=helpers+'\n'+b;
b=once(b,"const fail=(index,code,message)=>{\n    items.push({file_index:index+1,status:'failed',code,message});", "const fail=(index,code,message,diagnostics)=>{\n    items.push({file_index:index+1,status:'failed',code,message,...diagnostics?{diagnostics}: {}});");
b=once(b,"if(row.success!==true) return fail(index,'CHILD_WORKFLOW_ERROR','此文件执行失败，请查看对应并行任务运行详情并单独重试。');",`const diagnostics={scope:'debug_only',success:row.success,data_type:row.data===null?'null':typeof row.data,data_chars:typeof row.data==='string'?row.data.length:null,upstream_message:safeDiagnostic(row.message)};
    if(row.success!==true) return fail(index,'CHILD_WORKFLOW_ERROR','此文件执行失败，原始错误见batch_report诊断。',diagnostics);
    if(row.data==null||typeof row.data==='string'&&!row.data.trim())return fail(index,'EMPTY_CHILD_RESPONSE','单例应用返回为空，不是JSON格式损坏。',diagnostics);`);
b=once(b,"} catch(e) { return fail(index,'INVALID_JSON','三连未返回可解析的单一 JSON 对象。'); }", "} catch(e) { return fail(index,'INVALID_CHILD_JSON','单例返回非空但无法解析，详见诊断。',{...diagnostics,parse_error:safeDiagnostic(e.message),response_preview:safeDiagnostic(row.data)}); }");
b=once(b,'    let execution_report=null;',`    if(object(result)&&result.record_type==='oncorounds_execution_error'){
      if(result.transport_version!=='1.0'||!object(result.error))return fail(index,'INVALID_ERROR_TRANSPORT','错误返回格式不完整。',diagnostics);
      return fail(index,String(result.error.code||'UPSTREAM_NODE_ERROR'),'单例执行未完成，具体节点及错误见batch_report。',{...diagnostics,error:{code:safeDiagnostic(result.error.code),node:safeDiagnostic(result.error.node),message:safeDiagnostic(result.error.message)}});
    }
    let execution_report=null;`);
b=b.replaceAll('20260929-full-review-five-batch','20260929-error-return-batch');input('batch','batchFinal20260909','code').value=b;
// Wire the two existing model error ports into final diagnostics. First-round error
// need not invalidate a later successful second round; second-round error does.
const finalId='v12FinalPublicationNormalize';
node('child',finalId).inputs.push(ref('first_round_error','sR35QbYF2xamDQR3','system_error_text'),ref('second_round_error','v12RevisionGenerator','system_error_text'));
let c=input('child',finalId,'code').value;
c=helpers+'\n'+c;
c=once(c,' const errors=arr(inputs.structure_errors).slice();',` const errors=arr(inputs.structure_errors).slice();
 const firstError=safeDiagnostic(inputs.first_round_error),secondError=safeDiagnostic(inputs.second_round_error);
 const secondEmpty=!String(inputs.second_round_raw||'').trim();
 const executionFailure=Boolean(secondError)||(secondEmpty&&!p);
 if(secondError)errors.push('SECOND_ROUND_EXECUTION_ERROR：'+secondError);
 if(secondEmpty&&!p)errors.push('SECOND_ROUND_EMPTY：第二轮没有返回正文，不能认定为证据不足。');`);
c=once(c,"status:ready?'OUTPUT_READY':partial?", "status:executionFailure?'UPSTREAM_ERROR':ready?'OUTPUT_READY':partial?");
c=once(c,"model_execution:{model:","model_execution:{first_round_error:firstError,second_round_error:secondError,second_round_empty:secondEmpty,model:");
c=c.replaceAll('20260929-html-five-contract','20260929-error-return');input('child',finalId,'code').value=c;
for(const [role,file] of Object.entries(names))fs.writeFileSync(out+'/'+file,JSON.stringify(w[role],null,2));
fs.writeFileSync(out+'/批量最终JSON-完整替换代码.txt',b);
fs.writeFileSync(out+'/修改记录.json',JSON.stringify({version:'20260929-error-return',base,online_verified:false,root_cause_of_empty_response_known:false,changes:{child:'只接入模型错误，区分执行失败和格式失败',outer:'9个现有错误端口接入错误整理与回复两个新增节点；成功分支不变',batch:'新增单例返回检查，空返回和上游错误保留到汇总'},no_prompt_change:true,no_retrieval_change:true,no_concurrency_change:true},null,2));
console.log(out);
