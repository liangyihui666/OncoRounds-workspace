const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const dir=__dirname,out='outputs/HTML与五题联动整改-20260929',base='outputs/完整工作流-Flash五题-20260929';
const names={child:'01-出题子应用.json',outer:'02-HTML单例外层.json',batch:'03-批量生成.json'},load=p=>JSON.parse(fs.readFileSync(p));
const w=Object.fromEntries(Object.entries(names).map(([r,f])=>[r,load(out+'/'+f)])),old=Object.fromEntries(Object.entries(names).map(([r,f])=>[r,load(base+'/'+f)]));
const code=(r,id)=>w[r].nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='code').value,fn=(r,id)=>vm.runInNewContext(code(r,id)+'\nmain'),plain=x=>JSON.parse(JSON.stringify(x));
const parse=vm.runInNewContext(fs.readFileSync(dir+'/contract.js','utf8')+'\nparseQuestionContract');
const normal=vm.runInNewContext(fs.readFileSync(dir+'/layout.js','utf8')+'\nsourceLayout');
const checks=[];function test(name,f){try{f();checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:e.message});console.log('FAIL',name,e.message.slice(0,300));}}
test('三套图、模型调用数及知识库/研究补检分支保持',()=>{
 for(const r of Object.keys(w)){assert.deepEqual(w[r].edges,old[r].edges);assert.equal(w[r].nodes.length,old[r].nodes.length);}
 assert.deepEqual(w.batch,old.batch);
 const changes=load(out+'/修改记录.json').changes.filter(n=>n.role==='child').map(n=>n.id);
 for(const n of w.child.nodes)if(!changes.includes(n.nodeId))assert.deepEqual(n,old.child.nodes.find(o=>o.nodeId===n.nodeId));
});
test('全部代码语法和节点/输出引用有效',()=>{
 for(const wf of Object.values(w))for(const n of wf.nodes)for(const i of n.inputs){
  if(i.key==='code')new vm.Script(i.value);
  function ref(a,b){if(a==='VARIABLE_NODE_ID')return assert(wf.chatConfig.variables.some(v=>v.key===b));const s=wf.nodes.find(x=>x.nodeId===a);assert(s&&s.outputs.some(o=>o.id===b),n.name+':'+a+'.'+b);}
  if(i.selectedType==='reference'&&Array.isArray(i.value))for(const r of typeof i.value[0]==='string'?[i.value]:i.value)if(Array.isArray(r))ref(...r);
  if(i.key!=='code'&&typeof i.value==='string')for(const m of i.value.matchAll(/\{\{\$([^.$]+)\.([^$]+)\$\}\}/g))ref(m[1],m[2]);
 }
});
const actual=[];
for(let i=1;i<=9;i++){
 const x=load('work/compact-return-nine-20260929/item-'+i+'.json'),d=x.execution_report.source_groups[0].workflow_diagnostics;
 if(!d.second_round_raw)continue;
 const p=parse(d.second_round_raw);actual.push({index:i,before_count:d.parsed_second_round_draft?.questions?.length||0,after_count:p.parsed?.questions?.length||0,error:p.error,warnings:p.warnings});
 if([6,7].includes(i))test('真实附件'+i+'：五题错位归位且内容逐字不变',()=>{
  assert.equal(p.error,'');assert.equal(p.parsed.questions.length,5);const raw=JSON.parse(d.second_round_raw);
  assert.deepEqual(plain(p.parsed.questions),[raw.questions[0],raw.Q2,raw.Q3,raw.Q4,raw.Q5]);assert(p.warnings.length);
 });
 if(i===1)test('真实附件1：重复questions仍拒绝，不能覆盖',()=>assert(p.error.includes('重复键')));
 if(i===2)test('真实附件2：真缺四题不自动补造',()=>{assert.equal(p.parsed.questions.length,1);assert.equal(p.parsed.question_count,5);});
}
test('重复嵌套答案键也拒绝',()=>assert(parse('{"questions":[{"answer":0,"answer":1}]}').error.includes('重复键')));
test('错位冲突/题号不符/不完整归位都拒绝',()=>{
 for(const obj of [{questions:[{id:'Q1'}],Q1:{id:'Q1'},question_count:5},{questions:[{id:'Q1'}],Q2:{id:'Q3'},question_count:5},{questions:[{id:'Q1'}],Q2:{id:'Q2'},question_count:5}])assert(parse(obj).error);
});
test('中文断行和br显示换行可匹配，英文边界、表格边界仍保留',()=>{
 assert.equal(normal('静脉  \n血标本').text,normal('静脉血标本').text);assert.equal(normal('蛋<br/>白表达').text,'蛋白表达');
 assert.notEqual(normal('no where').text,normal('nowhere').text);assert.notEqual(normal('甲</td><td>乙').text,normal('甲乙').text);
});
test('公式排版等价支持，不改变不等号/小数/否定',()=>{
 assert.equal(normal('（ \\$10\\% \\sim 40\\%\\$ ）').text,normal('（ 10% ~ 40% ）').text);
 for(const [a,b] of [['≤1','≥1'],['0.5','5'],['不可停药','可停药'],['不 能排除','能排除']])assert.notEqual(normal(a).text,normal(b).text);
});
const packet={case_id:'TEST',case_title:'程序测试',case_context:'测试患者出现条件甲，另一检查结果乙尚未回报。',case_timeline:'阶段一｜测试治疗；阶段二｜患者拒绝再次放疗。',disease:'测试疾病',biomarkers:'标志物丙阳性。',case_mode:'全程管理',decision_points:'测试决策'};
const body='【程序测试，非医学证据】条件甲且满足乙时可考虑方案甲；未满足乙时须继续评估。方案乙适用于条件丙。基线至少1个病灶，数值0.5，不可改成5。';
const records=Array.from({length:5},(_,i)=>({evidence_id:'E'+(i+1),doc_id:'testdoc'+i,split_index:0,type:'guideline',authority:'测试机构',source_title:'测试指南'+i,source_version:'2026',source_section:'',source_url:'',hard_evidence_type:'指南',reasoning_eligible:true,raw_snippet:body,snippet:body}));
const pool={records,retrieval_health:{ok:true,errors:[]},compression_report:{kept_total:5}};
function draft(){return {schema_version:'1.1',generation_status:'success',case_summary:'测试',question_count:5,difficulty:'进阶',missing_information:[],risk_message:'',questions:Array.from({length:5},(_,i)=>({id:'Q'+(i+1),type:'治疗决策',phase:'阶段'+i,timepoint:'阶段二',question:'测试条件'+i+'下，下列哪项正确？',options:['方案甲'+i,'方案乙'+i,'方案丙'+i,'方案丁'+i],answer:0,answer_text:'方案甲'+i,keyPoint:'测试原则'+i,explain:{A:'该条件下有测试证据支持。',B:'需要题干尚未满足的条件。',C:'该方案适用其他情境。',D:'该措施不符合现有条件。'},evidence_id:'E'+(i+1),support_mode:'hard',evidence_summary:'测试记录明确区分条件',verification:{quotes:Object.fromEntries(['A','B','C','D'].map(k=>[k,['条件甲且满足乙时可考虑方案甲']])),case_facts:[{field:'case_context',quote:'另一检查结果乙尚未回报'}],closest_alternative:'B',decision_boundary:'尚未确认乙满足，不能自动采用方案。'}}))};}
const assemble=(d,id='v12AssemblyR2',p=pool,c=packet)=>fn('child',id)({candidate_json:typeof d==='string'?d:JSON.stringify(d),evidence_pool:p,case_packet:c,second_cancer_type:'直肠癌'});
function final(a,d){return fn('child','v12FinalPublicationNormalize')({candidate_json:a.candidate_json_passthrough,structure_decision:a.structure_decision,structure_errors:a.structure_errors,structure_warnings:a.structure_warnings,cited_evidence:a.cited_evidence_json,evidence_pool:pool,evidence_verification:a.evidence_verification,case_id:'TEST',second_cancer_type:'直肠癌',second_round_raw:JSON.stringify(d)});}
test('五题通过全部程序检查、四行解析、不泄露内部核对字段',()=>{const d=draft(),a=assemble(d);assert.equal(a.structure_decision,'PASS',JSON.stringify(a.structure_errors));const f=final(a,d);assert.equal(f.status,'OUTPUT_READY');assert.equal(f.publishable,false);const q=JSON.parse(f.final_response_json).questions;assert.equal(q.length,5);q.forEach(q=>{assert.equal(q.explain.split('\n').length,4);assert(!q.verification);});});
test('结构归位后仍完整核对五题，错误引文不得放行',()=>{
 const d=draft(),bad={...d,questions:d.questions.slice(0,1)};for(let i=1;i<5;i++)bad['Q'+(i+1)]=d.questions[i];
 for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2']){assert.equal(assemble(bad,id).evidence_verification.question_checks.length,5);assert.equal(assemble(bad,id).structure_decision,'PASS');}
 bad.Q5.verification.quotes.A=['完全不存在的编造句子'];assert.equal(assemble(bad).structure_decision,'FAIL');assert.equal(final(assemble(bad),bad).output_ready,false);
});
test('未完成、错计数、错答案、重复选项、错引用、检索失败仍拦截',()=>{
 for(const mutate of [d=>d.question_count=4,d=>d.questions.pop(),d=>d.questions[0].answer_text='错误',d=>d.questions[0].options[1]=d.questions[0].options[0],d=>d.questions[0].evidence_id='X',d=>delete d.questions[0].explain.D]){const d=draft();mutate(d);assert.equal(final(assemble(d),d).output_ready,false);}
 assert.equal(assemble(draft(),'v12AssemblyR2',{...pool,retrieval_health:{ok:false,errors:[]}}).structure_decision,'FAIL');
});
test('1至4题草稿不当完成，零题保留不足状态',()=>{
 for(let n=1;n<5;n++){const d=draft();d.questions=d.questions.slice(0,n);d.question_count=n;assert.equal(final(assemble(d),d).status,'INCOMPLETE_QUESTION_SET');}
 const d={...draft(),generation_status:'insufficient',question_count:0,questions:[],missing_information:['测试证据不足'],risk_message:'不能支持'};assert.equal(final(assemble(d),d).status,'STOP_INSUFFICIENT');
});
test('伪造病例/否定/数值/跨记录/拼接原句仍拦截',()=>{
 for(const quote of ['条件甲且满足乙时不可考虑方案甲','基线至少1个病灶，数值5','条件甲且满足乙时可考虑方案甲；方案乙适用于条件丙','另一记录才有的真实句子']){const d=draft();d.questions[0].verification.quotes.A=[quote];assert.equal(assemble(d).structure_decision,'FAIL');}
 const d=draft();d.questions[0].verification.case_facts[0].quote='患者乙检测确认阳性';assert.equal(assemble(d).structure_decision,'FAIL');
});
test('第二轮看到归位后全套题及明确完整替换要求，重复键不静默丢失',()=>{
 const x=load('work/compact-return-nine-20260929/item-6.json'),raw=x.execution_report.source_groups[0].workflow_diagnostics.second_round_raw;
 const r=JSON.parse(fn('child','v12RevisionInput')({previous_candidate:raw,case_packet:packet,evidence_pool:pool}).system_text);
 assert.equal(r.previous_candidate.questions.length,5);assert.equal(r.previous_candidate_raw,'');assert(r.contract_warnings.length);assert(r.completion_plan.required_action.includes('完整替换稿'));
 const e=JSON.parse(fn('child','v12RevisionInput')({previous_candidate:'{"questions":[],"questions":[]}',case_packet:packet,evidence_pool:pool}).system_text);assert(e.contract_error.includes('重复键'));assert(e.previous_candidate_raw);
});
const html=fn('outer','htmlTextCheck'),extract=fn('outer','d4esByk5Pccmn1gH'),map=fn('outer','ogy1PAMdD268kXeo');
const source='患者初诊乳腺癌。2021年出现疑似骨转移，未记载分级；患者拒绝再次放疗。HER2阴性。';
const cleaned='【来源类型】html\n【清洗状态】clean\n【患者病例正文】'+source+'\n【文章导语与二次资料】无\n【专家观点】无';
const fields=['case_id','case_title','disease','second_cancer_type','primary_diagnosis_text','classification_reason','case_context','case_timeline','biomarkers','learning_points_candidate','decision_points_candidate','adverse_events','evidence_notes','case_image_index','case_mode','difficulty'];
function extraction(){return {...Object.fromEntries(fields.map(k=>[k,''])),case_title:'乳腺癌病例',disease:'乳腺癌',second_cancer_type:'乳腺癌',primary_diagnosis_text:'患者初诊乳腺癌',case_context:'患者初诊乳腺癌。',case_timeline:source,decision_points_candidate:'复发评估',case_mode:'全程管理',difficulty:'进阶'};}
test('HTML实体/内联标签/脚本清理保留数值否定，图片不推断',()=>{const r=html({text:'<html><script>BAD()</script><style>.bad{}</style><body><p>患者<b>未</b>见转移，ANC&lt;0.5，Ki-67为5%。</p><img src="private.png"></body></html>'});assert(r.document_text.includes('患者未见转移，ANC<0.5，Ki-67为5%'));assert(!r.document_text.includes('BAD'));assert(!r.document_text.includes('private.png'));});
test('HTML表格片段保留单元格和行边界，不能拼成相邻中文原句',()=>{const r=html({text:'<table><tr><td>阴性</td><td>阳性</td></tr><tr><td>甲</td><td>乙</td></tr></table>'});assert(r.document_text.includes('阴性 | 阳性'));assert(!normal(r.document_text).text.includes('阴性阳性'));assert(!normal(r.document_text).text.includes('阳性甲'));});
test('文档解析空/错误/多文件不会误作有效病例',()=>{for(const arg of [{text:''},{files:['a','b'],text:source},{rows:[{error:'failed'}],text:source},{rows:[{text:''}],text:source}])assert.throws(()=>html(arg));});
test('16字段格式修复不猜缺失引号、重复键和非字符串',()=>{
 const x=extraction();assert.equal(extract({raw_json:JSON.stringify(x)}).repaired_data.case_timeline,source);
 assert.throws(()=>extract({raw_json:JSON.stringify({...x,biomarkers:[]})}));assert.throws(()=>extract({raw_json:'{"disease":"甲","disease":"乙"}'}));assert.throws(()=>extract({raw_json:'{"disease":"未闭合'}));
});
test('HTML原文贯穿病例包、稳定ID不受模型标题影响，临床限制不丢失',()=>{
 const doc=html({text:source}),make=x=>map({case_json:extract({raw_json:JSON.stringify(x)}).repaired_json,cleaned_text:cleaned,document_text:doc.document_text,source_id:doc.source_id});
 const a=make(extraction()),b=make({...extraction(),case_title:'模型改写标题'});assert.equal(a.case_id,b.case_id);const payload=JSON.parse(a.case_payload_json);assert.equal(payload.case_source_text,source);
 const child=fn('child','v12CasePacket')({case_json:a.case_payload_json});assert.equal(child.case_packet.case_source_text,source);assert(child.case_packet.case_source_text.includes('拒绝再次放疗'));assert.equal(a.extraction_check.status,'PASS');
});
test('清洗未通过/正文改写/缺少原文不进入出题',()=>{
 for(const [c,s] of [[cleaned.replace('】clean','】needs_review'),source],[cleaned.replace('】clean','】blocked_sensitive'),source],[cleaned.replace('疑似','确认'),source],[cleaned,'']])assert.throws(()=>map({case_json:JSON.stringify(extraction()),cleaned_text:c,document_text:s}));
});
test('原文可作核对来源；不能引用不存在的患者事实',()=>{
 const d=draft(),c={...packet,case_source_text:source};d.questions[0].verification.case_facts=[{field:'case_source_text',quote:'患者拒绝再次放疗'}];assert.equal(assemble(d,'v12AssemblyR2',pool,c).structure_decision,'PASS');
 d.questions[0].verification.case_facts[0].quote='患者同意再次放疗';assert.equal(assemble(d,'v12AssemblyR2',pool,c).structure_decision,'FAIL');
});
test('完整输出穿过精简外层与批量，失败槽位不丢失',()=>{
 const transport=d=>{const f=final(assemble(d),d);const p=fn('outer','bJcPjyWI8hiwuVOS')({group1:f.publication_payload_json,case_packet:JSON.stringify(packet)});return fn('outer','jKqMCN8eJKvkngnI')({candidate_pool:p.candidate_pool,case_id:'TEST',case_context:packet.case_context,case_timeline:packet.case_timeline,second_cancer_type:'直肠癌',transport_mode:'__ONCOROUNDS_BATCH_V2__'});};
 const good=transport(draft()),d=draft();d.questions[0].verification.quotes.A=['没有找到的虚假证据原句'];const bad=transport(d);
 assert.deepEqual(Object.keys(good),['response_json']);const b=fn('batch','batchFinal20260909')({expected_count:2,results:[good,bad].map(x=>({success:true,data:x.response_json}))});assert.equal(b.batch_report.complete_count,1);assert.equal(b.batch_report.failed_count,1);assert.equal(b.output_data[0].Questions.question_count,5);assert.equal(b.output_data[1].Questions.question_count,0);
});
const htmlDir='C:/Users/admin/Desktop/新增病例候选-10例-2026-09-11';
for(const f of fs.readdirSync(htmlDir).filter(n=>n.endsWith('.html')))test('真实HTML读取与原句回溯 '+f.slice(0,6),()=>{
 const raw=fs.readFileSync(path.join(htmlDir,f),'utf8'),r=html({text:raw});assert(r.document_text.length>200);assert(!/<script\b/i.test(r.document_text));
 // Deterministic selection fixture; no claim that a live cleaner/extractor model has been tested.
 const start=r.document_text.indexOf('患者');assert(start>=0);const paragraph=r.document_text.slice(start,start+350);
 const c='【清洗状态】clean\n【患者病例正文】'+paragraph+'\n【专家观点】无';
 const result=map({case_json:JSON.stringify(extraction()),cleaned_text:c,document_text:r.document_text,source_id:r.source_id});assert.equal(result.extraction_check.status,'PASS');assert.equal(JSON.parse(result.case_payload_json).case_source_text,paragraph.trim());
});
fs.writeFileSync(out+'/回归检查.json',JSON.stringify({checks,passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,actual_structure_replay:actual,online_verified:false,medical_correctness_verified:false,html_model_extraction_not_executed:true},null,2));
console.log(JSON.stringify({passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,actual},null,2));if(checks.some(x=>!x.pass))process.exitCode=1;
