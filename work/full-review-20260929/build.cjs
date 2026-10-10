const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const dir='outputs/全流程复核优化-20260929';fs.mkdirSync(dir,{recursive:true});
const sources={child:'outputs/选项重复与答案布局修复-20260929/01-出题子应用-Flash选项去重复版.json',outer:'outputs/五题流程精简-20260928/02-HTML测试外层-五题精简版.json',batch:'outputs/批量五题兼容修复-20260928/批量生成-五题兼容修复版.json'};
const base=Object.fromEntries(Object.entries(sources).map(([k,p])=>[k,JSON.parse(fs.readFileSync(p,'utf8'))]));
const w=structuredClone(base),revision='20260929-full-review-five';
const node=(role,id)=>w[role].nodes.find(n=>n.nodeId===id);
const input=(role,id,key)=>node(role,id).inputs.find(i=>i.key===key);
const edit=(role,id,key,f)=>{const i=input(role,id,key);i.value=f(i.value);};
const once=(s,a,b)=>{assert.equal(s.split(a).length,2,a);return s.replace(a,b);};
function ref(role,id,key,value,type='string'){
 const n=node(role,id),template=n.inputs.find(i=>i.selectedType==='reference');assert(template);
 n.inputs.push({...structuredClone(template),key,label:key,valueType:type,required:false,value});
}
function out(role,id,key,type='string') {node(role,id).outputs.push({id:key,key,type:'dynamic',valueType:type,label:key,description:''});}
const common=fs.readFileSync(path.join(__dirname,'generator.txt'),'utf8').trim();
input('child','sR35QbYF2xamDQR3','systemPrompt').value=common;
input('child','v12RevisionGenerator','systemPrompt').value=`这是第二轮也是最后一轮出题调用。输出完整修订稿，不输出审核报告。程序PASS仅表示结构检查通过。
先看case_constraints原句、program_precheck和逐题structural_defects；用绑定全文逐项核对患者事实、答案及三项排除理由。source_review和其他关键词只是定位线索，无命中仍须检查。再核对set_review与option_variety_review：近似用语不自动判错；同一决策反复被考才换题，空泛干扰项须换成有依据的竞争措施。保留合格题的内容与顺序，仅改不合格题并补齐缺位。无法补齐则写明具体缺口，不用同义改写凑五题。

${common}`;
// Remove 20 copies of the same instruction, keep actual option text and reasons for review.
edit('child','v12RevisionInput','code',s=>once(s,",\n      review_required:'对照本题条件及同一完整记录，核对成立/不成立的依据与限定词；未提及或不优先不能充当错误理由；解析须解释本选项全部措施'",''));
edit('child','nWJ1txLnlLszyUU5','code',s=>{
 const start=s.indexOf('  const config = '),end=s.indexOf('\n',start);
 const cfg={purpose:'复评、局部协调与后线决策正式指南',fields:[{key:'decision_points',budget:100,label:'决策问题',pattern:'复评|转移|进展|耐药|后线|拒绝|不可及|脑膜|梗阻|出血|感染|调整|局部'},{key:'case_timeline',budget:145,label:'实际治疗',pattern:'方案|化疗|联合|治疗|放疗'},{key:'biomarkers',budget:115,label:'检测记录',pattern:'基因|KRAS|NRAS|BRAF|MSS|MSI|HER2|EGFR|ALK|ROS1'}],scope:'按原发癌种匹配复评与后线阶段，保留已知治疗限制。'};
 s=s.slice(0,start)+'  const config = '+JSON.stringify(cfg)+';'+s.slice(end);
 return once(s,'  for(const field of config.fields){const text=excerpt(inputs[field.key],field.budget,field.key,field.pattern);',`  const fixedLength=lines.join('\\n').length+1+config.scope.length+config.fields.reduce((n,f)=>n+1+f.label.length+1,0);
  const scale=Math.min(1,(480-fixedLength)/config.fields.reduce((n,f)=>n+f.budget,0));
  for(const field of config.fields){const text=excerpt(inputs[field.key],Math.floor(field.budget*scale),field.key,field.pattern);`);
});
ref('child','v12FinalPublicationNormalize','first_round_raw',['sR35QbYF2xamDQR3','answerText']);
edit('child','v12FinalPublicationNormalize','code',s=>{
 s=once(s,'20260929-option-variety-five',revision);
 s=once(s,"second_round_raw:ready?'':String(inputs.second_round_raw||''),partial_draft_questions:partial?p.questions:[]",`first_round_raw:ready?'':String(inputs.first_round_raw||''),second_round_raw:ready?'':String(inputs.second_round_raw||''),
    parsed_second_round_draft:ready?null:parse(inputs.second_round_raw),partial_draft_questions:partial?p.questions:[],
    model_execution:{model:'qwen3.8-flash',max_output_tokens_configured:16000,first_round_char_count:String(inputs.first_round_raw||'').length,second_round_char_count:String(inputs.second_round_raw||'').length,finish_reason:null,finish_reason_availability:'not_exposed_by_workflow_outputs'}`);
 return s;
});
edit('outer','glGeIMqOVaSRs5jF','systemPrompt',s=>once(s,'保留正文的必要病史','患者拒绝/不同意、药物不可及、既往放疗或不耐受等限制保留原时点和对象，不因压缩省略。明确属于本患者的文字图注事实归入患者正文并标“图注”，不从图片推断；无法确认归属的图注只留索引。\n保留正文的必要病史'));
edit('outer','t7eXTzfAM2QUzvvK','systemPrompt',s=>once(s,'case_timeline：每事件一行','case_timeline：必须保留患者拒绝/不同意、药物不可及、既往治疗限制及不能耐受的具体对象和时点；正文中标“图注”的患者文字事实可提取但保留来源标记，不能根据图像猜测。每事件一行'));
ref('outer','ogy1PAMdD268kXeo','cleaned_text',['glGeIMqOVaSRs5jF','answerText']);
out('outer','ogy1PAMdD268kXeo','extraction_check','object');
edit('outer','ogy1PAMdD268kXeo','code',s=>{
 s=fs.readFileSync(path.join(__dirname,'constraint-guard.js'),'utf8')+'\n'+s;
 s=once(s," const fields=['case_id'"," const extraction_check=preserveConstraintExcerpts(source,args.cleaned_text);\n result.evidence_notes=source.evidence_notes;\n const fields=['case_id'");
 return once(s,'return {...result,case_payload_json:JSON.stringify(payload)};','return {...result,extraction_check,case_payload_json:JSON.stringify(payload)};');
});
// Preserve the actual child version in the already existing source-group diagnostic channel.
edit('outer','bJcPjyWI8hiwuVOS','code',s=>once(s,'info.flow_status = envelope.status ?? null;','info.workflow_revision = envelope.workflow_revision ?? null;\n        info.flow_status = envelope.status ?? null;').replace('20260928-slim-five',revision+'-outer'));
ref('outer','jKqMCN8eJKvkngnI','transport_mode',['448745','userChatInput']);
ref('outer','jKqMCN8eJKvkngnI','extraction_check',['ogy1PAMdD268kXeo','extraction_check'],'object');
out('outer','jKqMCN8eJKvkngnI','response_json');
out('outer','jKqMCN8eJKvkngnI','execution_report','object');
edit('outer','jKqMCN8eJKvkngnI','code',s=>{
 s=s.replace('20260928-slim-five-outer',revision+'-outer');
 s=once(s,'  const output_data = { Questions, detail };',`  const output_data = { Questions, detail };
  const execution_report={schema_version:'oncorounds-execution-1.0',workflow_revision:'${revision}-outer',
    case_id:Questions.case_id,status:result.selection_report.workflow_status,publishable:false,
    medical_review_status:result.selection_report.medical_review_status,
    extraction_check:inputs.extraction_check||null,source_groups:result.selection_report.source_groups,
    warnings:result.selection_report.warnings};
  const transport={record_type:'oncorounds_batch_item',transport_version:'1.0',output_data,execution_report};
  const response_json=JSON.stringify(inputs.transport_mode==='__ONCOROUNDS_BATCH_V2__'?transport:output_data);`);
 return once(s,'output_data, output_json: JSON.stringify(output_data, null, 2)','execution_report,response_json,output_data, output_json: JSON.stringify(output_data, null, 2)');
});
input('outer','bTxgvHEhA8qEPFTa','text').value='{{$jKqMCN8eJKvkngnI.response_json$}}';
input('batch','iW8Qg5stNA8T2Qp9','userChatInput').value='__ONCOROUNDS_BATCH_V2__';
const teaching=input('child','v12FinalPublicationNormalize','code').value.split('const TUMOR_DISPLAY_MAP')[0];
edit('batch','batchFinal20260909','code',s=>{
 s=teaching+'\n'+s;
 s=once(s,'    if(!object(result)||Object.keys(result).length!==2',`    let execution_report=null;
    if(object(result)&&result.record_type==='oncorounds_batch_item'){
      if(result.transport_version!=='1.0'||!object(result.execution_report))return fail(index,'INVALID_TRANSPORT','批量传输版本或执行报告缺失。');
      execution_report=result.execution_report;result=result.output_data;
    }
    if(!object(result)||Object.keys(result).length!==2`);
 s=once(s,'    const q=result.Questions, d=result.detail;',`    const q=result.Questions, d=result.detail;
    if(execution_report&&execution_report.case_id!==q.case_id)return fail(index,'EXECUTION_CASE_MISMATCH','执行报告与题目的病例标识不同。');`);
 s=once(s,"items.push({file_index:index+1,status:'incomplete',code:'NO_COMPLETE_QUESTION_SET',question_count:0,",`const status=execution_report?.status;
      const broken=['FORMAT_ERROR','UPSTREAM_ERROR'].includes(status);
      if(status==='OUTPUT_READY')return fail(index,'STATUS_CONFLICT','执行报告声称完成但题目为空。');
      items.push({file_index:index+1,status:broken?'failed':'incomplete',code:status||'NO_COMPLETE_QUESTION_SET',question_count:0,execution_report,`);
 s=once(s,"    if(q.question_count!==5||q.generation_status!=='success')",`    if(execution_report&&execution_report.status!=='OUTPUT_READY')return fail(index,'STATUS_CONFLICT','五题结果与上游执行状态不一致。');
    if(q.question_count!==5||q.generation_status!=='success')`);
 s=once(s,'      ids.add(item.id);',`      if(new Set(Object.values(item.options).map(s=>s.replace(/\\s+/g,'').trim())).size!==4||teachingErrors(item).length)
        return fail(index,'INVALID_QUESTION','选项重复或A/B/C/D四行解析与答案不一致。');
      if(item.id!=='Q'+(ids.size+1))return fail(index,'INVALID_QUESTION','题号必须连续Q1至Q5。');
      ids.add(item.id);`);
 s=once(s,"status:'complete',case_id:q.case_id,question_count:5","status:'complete',case_id:q.case_id,question_count:5,execution_report");
 s=s.replace("schema_version:'batch-five-1.0'",`schema_version:'batch-five-1.1',workflow_revision:'${revision}-batch',medical_review_status:'not_performed'`);
 return once(s,'return {output_data,output_json:',"return {response_json:JSON.stringify({output_data,batch_report}),output_data,output_json:");
});
out('batch','batchFinal20260909','response_json');
input('batch','batchAnswer20260909','text').value='{{$batchFinal20260909.response_json$}}';
const files={child:'01-出题子应用-全流程优化版.json',outer:'02-HTML单例外层-全流程优化版.json',batch:'03-批量生成-全流程优化版.json'};
const changes=[];
for(const role of Object.keys(w)){
 assert.deepEqual(w[role].edges,base[role].edges);assert.deepEqual(w[role].nodes.map(n=>n.nodeId),base[role].nodes.map(n=>n.nodeId));
 for(const n of w[role].nodes){const b=base[role].nodes.find(x=>x.nodeId===n.nodeId);if(JSON.stringify(n)!==JSON.stringify(b))changes.push({role,id:n.nodeId,name:n.name});}
 fs.writeFileSync(path.join(dir,files[role]),JSON.stringify(w[role],null,2));
}
const promptStats=['sR35QbYF2xamDQR3','v12RevisionGenerator'].map(id=>({node:node('child',id).name,before:base.child.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='systemPrompt').value.length,after:input('child',id,'systemPrompt').value.length}));
fs.writeFileSync(path.join(dir,'修改记录.json'),JSON.stringify({revision,sources,files,changes,promptStats,online_run:false,nodes:Object.fromEntries(Object.entries(w).map(([k,v])=>[k,v.nodes.length])),models_unchanged:true,retrieval_branches_preserved:true,public_single_contract_unchanged:true,batch_response_root:['output_data','batch_report']},null,2));
console.log(JSON.stringify({dir,changes,promptStats},null,2));
