const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const slim=false;
const dir='outputs/全流程复核优化-20260929/';
const load=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const child=load(dir+'01-出题子应用-全流程优化版.json'),outer=load(dir+'02-HTML单例外层-全流程优化版.json');
const oldChild=load('outputs/两阶段出题修订-20260928/03-出题子应用-画布排版优化版.json');
const oldOuter=load('outputs/病程轴阶段兼容-20260928/HTML测试外层-阶段兼容补充版.json');
const raw=load('C:/Users/admin/.codex/attachments/e1eceb4c-4874-414d-9e4e-72d9308344d4/已粘贴的文本.txt');
const payload=JSON.parse(raw.case_payload_json);
const code=(d,id)=>d.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='code').value;
const fn=(id,d=child)=>vm.runInNewContext(code(d,id)+'\nmain');
const plain=x=>JSON.parse(JSON.stringify(x));
const results=[];
function test(name,f){f();results.push({name,pass:true});}
test('全部代码节点语法通过',()=>{for(const d of [child,outer])for(const n of d.nodes)for(const i of n.inputs||[])if(i.key==='code')new vm.Script(i.value);});
test('无必填空引用；quotes绑定真实知识库搜索输出',()=>{
  for(const d of [child,outer])for(const n of d.nodes)for(const i of n.inputs||[]){
    // workflowStart values come from the runtime/user; they are not upstream node references.
    if(n.flowNodeType!=='workflowStart'&&i.required===true&&i.selectedType==='reference'){
      assert(i.value!==undefined&&i.value!==null&&i.value!==''&&(!Array.isArray(i.value)||i.value.length>0),n.name+'.'+i.key+'必填引用为空');
    }
  }
  assert.deepEqual(child.nodes.find(n=>n.nodeId==='r8B6DL8OMe8eix63').inputs.find(i=>i.key==='quotes').value,['wP0lzgeUtpvzxSHw','quoteQA']);
  const r=fn('r8B6DL8OMe8eix63')({original_query:'测试癌种 原文治疗方案',initial_studies:[],guideline_a:[],guideline_b:[]});
  assert(r.has_leads);assert(r.expanded_query.includes('原文治疗方案'));
});
test('连线、输出引用存在且无环',()=>{
  for(const d of [child,outer]){
    const nodes=new Map(d.nodes.map(n=>[n.nodeId,n]));
    for(const e of d.edges){assert(nodes.has(e.source));assert(nodes.has(e.target));}
    function ref(n,k){assert(nodes.has(n),'missing node '+n);assert(nodes.get(n).outputs.some(o=>o.id===k),'missing output '+n+'.'+k);}
    function walk(v){if(Array.isArray(v)){if(v.length===2&&typeof v[0]==='string'&&nodes.has(v[0]))ref(...v);else v.forEach(walk);}else if(v&&typeof v==='object'){for(const [k,x]of Object.entries(v)){if(k==='variable'&&Array.isArray(x)&&x.length===2)ref(...x);else walk(x);}}else if(typeof v==='string'){for(const m of v.matchAll(/\{\{\$([\w]+)\.([\w]+)\$\}\}/g))ref(m[1],m[2]);}}
    for(const n of d.nodes)for(const i of n.inputs||[])if(i.key!=='code')walk(i.value);
    const visited=new Set(),active=new Set();function visit(id){assert(!active.has(id),'cycle');if(visited.has(id))return;active.add(id);for(const e of d.edges.filter(e=>e.source===id))visit(e.target);active.delete(id);visited.add(id);}visit('448745');
    assert.equal(visited.size,nodes.size,'unreachable node');
  }
});
test('模型和既有坐标保持，仍为两轮出题，最大输出预算调整为16000',()=>{
  for(const [d,old]of [[child,oldChild],[outer,oldOuter]])for(const n of d.nodes){const b=old.nodes.find(x=>x.nodeId===n.nodeId);assert(b);assert.deepEqual(n.position,b.position);const m=n.inputs.find(i=>i.key==='model');if(m)assert.equal(m.value,b.inputs.find(i=>i.key==='model').value);}
  for(const id of ['sR35QbYF2xamDQR3','v12RevisionGenerator'])assert.equal(child.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='maxToken').value,16000);
  assert(!child.nodes.some(n=>/独立.*审核|独立.*校验/.test(n.name)));
  assert.equal(child.nodes.filter(n=>n.flowNodeType==='answerNode').length,1);
});
const queryIds=['c4VtiMJKVkMxJ9O5','q0CMNrCkFGt4LYVq','nWJ1txLnlLszyUU5','p3yBjyK1YBhY5m8v'];
test('复现旧查询整段丢失，修复后保留实际方案和分子记录',()=>{
  for(const id of queryIds.slice(1)){
    const old=fn(id,oldChild)(payload),next=fn(id)(payload);
    assert.equal(old.query_report.omitted_segments[id===queryIds[1]?'biomarkers':'decision_points'],1);
    assert(next.query_report.specific_context_present);assert(next.system_text.length<=480);
    assert(/KRAS/.test(next.system_text));
    if(id!==queryIds[1])assert(/mFOLFOX6/.test(next.system_text)&&/西妥昔单抗/.test(next.system_text));
  }
});
test('超预算查询仍保留完整源句与否定，不将文本截成新断言',()=>{
  const input={...payload,disease:'甲'.repeat(150),second_cancer_type:'测试癌种',case_context:'无转移。尚未完成评估。'+'长'.repeat(500),case_timeline:'初诊｜治疗｜未使用甲方案；治疗后｜调整｜停用乙方案\n'+ '长'.repeat(800),biomarkers:'基因检测未回报\n'+ '长'.repeat(700),decision_points:'结果未回报，是否等待'};
  for(const id of queryIds){const r=fn(id)(input);assert(r.system_text.length<=480);assert(!r.system_text.includes('长'.repeat(20)));}
  assert(fn(queryIds[2])(input).system_text.includes('未使用甲方案'));
});
test('本例毒性按药物匹配，两路覆盖皮肤/DIC与意识障碍血氨，未知分级不升格',()=>{
  const old=fn('v11IraeSplitFinal',oldChild)(payload),r=fn('v11IraeSplitFinal')(payload);
  assert(old.query_a.startsWith('化疗 皮肤'));assert.equal(old.query_b,'');
  assert(r.has_a&&r.has_b);assert(r.query_a.includes('西妥昔单抗'));assert(r.query_a.includes('DIC'));
  assert(/5-Fu\/mFOLFOX6/.test(r.query_b));assert(/意识障碍/.test(r.query_b)&&/血氨/.test(r.query_b));
  assert.equal(r.anchor_b_detail.grade,'分级未提供');assert(!/ICI|免疫检查点/.test(r.query_a+r.query_b));
});
test('毒性无事件、否定事件、ICI两种毒性及感染处理不会误排除',()=>{
  const run=fn('v11IraeSplitFinal');
  for(const text of ['', '无严重不良反应','未提供不良事件','术后｜ICI｜已排除肺炎｜G3｜观察｜稳定'])assert.equal(run({adverse_events:text}).has_a,false);
  const r=run({adverse_events:'首程｜ICI｜肺炎｜G3｜抗感染并鉴别｜改善\n后续｜ICI｜心肌炎｜G4｜处理｜改善'});
  assert(r.has_a&&r.has_b);assert(r.query_a.includes('心肌炎'));assert(r.query_b.includes('肺炎'));assert(r.query_b.includes('ICI'));
});
test('同名事件不同药物保持独立，不从倍数和周期推断分级',()=>{
  const r=fn('v11IraeSplitFinal')({adverse_events:'第4周期｜甲药｜皮疹｜未明示分级｜转氨酶>5倍｜观察\n次日｜乙药｜皮疹｜2度｜处理｜好转'});
  assert(r.has_a&&r.has_b);assert.equal(r.anchor_a_detail.grade,'G2');assert.equal(r.anchor_b_detail.grade,'分级未提供');
});
test('知识库补检链保留，无研究简称时仍有原查询补检',()=>{
  assert(child.nodes.some(n=>n.nodeId==='wP0lzgeUtpvzxSHw'));
  assert(child.edges.some(e=>e.source==='v12NeedClinicalSupplement'&&e.target==='wP0lzgeUtpvzxSHw'));
  assert(child.edges.some(e=>e.source==='wP0lzgeUtpvzxSHw'&&e.target==='r8B6DL8OMe8eix63'));
  const r=fn('r8B6DL8OMe8eix63')({quotes:[],original_query:'原发诊断：测试癌\n方案：测试方案\n阶段：一线',initial_studies:[],guideline_a:[],guideline_b:[]});
  assert(r.has_leads);assert(r.expanded_query.includes('测试方案'));assert(r.expanded_query.length<=480);
});
test('ALK等新亚型的知识库研究线索进入补检，不将资讯自动升级为主证据',()=>{
  const r=fn('r8B6DL8OMe8eix63')({quotes:[{q:'标题:[EXAMPLE研究]',a:'ALK阳性人群的研究线索 NCT12345678。',sourceName:'测试资讯'}],original_query:'ALK阳性 测试治疗方案',initial_studies:[],guideline_a:[],guideline_b:[]});
  assert(r.has_leads);assert(r.expanded_query.includes('NCT12345678'));
  assert(JSON.parse(r.study_leads_json).some(x=>x.source_kind==='资讯线索，不作主证据'));
});
test('已有检索正文中的真实研究线索可用于补检，不需要空知识库',()=>{
  const r=fn('r8B6DL8OMe8eix63')({quotes:[],original_query:'测试方案',initial_studies:[{source_title:'测试研究介绍',snippet:'EXAMPLE研究，注册号NCT12345678。'}],guideline_a:[],guideline_b:[]});
  assert(r.expanded_query.includes('NCT12345678'));
});
test('首轮证据正文末尾适用限制保留，定位/去重及检索失败仍检查',()=>{
  const full='正文。'.repeat(450)+'末尾限制：只适用于测试条件。';
  const record={doc_id:'TEST',split_index:0,type:'guideline',authority:'测试机构',source_title:'测试指南',snippet:full};
  const r=fn('v11EvidenceRegistry')({guideline_a:[record],guideline_b:[record]});
  const p=JSON.parse(r.evidence_pool_json);
  assert.equal(p.records.length,1);assert.equal(p.records[0].snippet,full);
  assert(p.compression_report.dropped.some(x=>x.reason==='DUPLICATE_LOCATOR'));
  assert.equal(fn('v11EvidenceRegistry')({guideline_a_error:'测试网络错误'}).retrieval_health_ok,false);
});
const explain='A｜正确：测试记录支持该条件。\nB｜不正确：该方案用于另一条件。\nC｜不正确：该方案需要另一前提。\nD｜不正确：该方案不满足当前条件。';
const records=Array.from({length:5},(_,i)=>({evidence_id:'E'+(i+1),doc_id:'doc'+i,split_index:0,type:'guideline',authority:'测试机构',source_title:'测试指南'+i,source_version:'2026',source_section:'',source_url:'',hard_evidence_type:'指南',reasoning_eligible:true,snippet:'短文本',raw_snippet:'完整测试证据正文及适用边界'+i}));
const pool={records,retrieval_health:{ok:true,errors:[]},compression_report:{kept_total:5}};
const questions=Array.from({length:5},(_,i)=>({id:'Q'+(i+1),type:'治疗决策',phase:'决策阶段'+i,timepoint:'阶段'+i,question:'在测试条件'+i+'下应选择何种行动？',options:['甲方案'+i,'乙方案'+i,'丙方案'+i,'丁方案'+i],answer:0,answer_text:'甲方案'+i,explain,keyPoint:'测试原则'+i,evidence_id:'E'+(i+1),support_mode:'hard',evidence_summary:'测试证据支持条件'+i}));
const draft={schema_version:'1.1',generation_status:'success',case_summary:'脱敏测试',question_count:5,difficulty:'进阶',questions,missing_information:[],risk_message:''};
const assemble=x=>fn('v12AssemblyR2')({candidate_json:typeof x==='string'?x:JSON.stringify(x),evidence_pool:pool,second_cancer_type:'直肠癌'});
const finish=(a,x=draft)=>fn('v12FinalPublicationNormalize')({candidate_json:a.candidate_json_passthrough,structure_decision:a.structure_decision,structure_errors:a.structure_errors,structure_warnings:a.structure_warnings,cited_evidence:a.cited_evidence_json,evidence_pool:pool,second_round_raw:typeof x==='string'?x:JSON.stringify(x),case_id:'TEST',second_cancer_type:'直肠癌',query_treatment:'测试实际检索词'});
function outerRun(envelope){const p=fn('bJcPjyWI8hiwuVOS',outer)({group1:envelope,case_packet:JSON.stringify({case_id:'TEST'})});return fn('jKqMCN8eJKvkngnI',outer)({candidate_pool:p.candidate_pool,agent_reply:JSON.stringify({selected_ids:p.candidate_pool.candidates.map(c=>c.candidate_id)}),case_id:'TEST',second_cancer_type:'直肠癌',case_timeline:payload.case_timeline,case_context:'脱敏测试'});}
test('第二轮输入明确四个缺口并提供未用记录、完整正文与程序报错',()=>{
  const previous={...draft,question_count:1,questions:[questions[0]]};
  const r=JSON.parse(fn('v12RevisionInput')({case_packet:'{}',previous_candidate:JSON.stringify(previous),evidence_pool:pool,structure_errors:['测试格式错误']}).system_text);
  assert.equal(r.completion_plan.missing_slot_count,4);assert.equal(r.completion_plan.unused_evidence_ids.length,4);
  assert.equal(r.evidence_pool.records[0].snippet,records[0].raw_snippet);assert(r.program_precheck.errors.includes('测试格式错误'));
});
test('五题从程序装配贯通外层，答案解析保持，不伪造医学审核',()=>{
  const a=assemble(draft);assert.equal(a.structure_decision,'PASS',JSON.stringify(a.structure_errors));
  const f=finish(a);assert.equal(f.output_ready,true);assert.equal(f.publishable,false);
  const env=JSON.parse(f.publication_payload_json);assert.equal(env.completion.complete,true);assert.equal(env.medical_review_status,'not_performed');
  const r=outerRun(f.publication_payload_json);assert.equal(r.final_data.question_count,5);assert.equal(r.final_data.generation_status,'success');
  assert.equal(r.selection_report.medical_approval_confirmed,false);assert.equal(r.selection_report.workflow_status,'OUTPUT_READY');
  for(const q of r.final_data.questions)assert.equal(q.explain,explain);
  assert.equal(r.output_data.detail.overview.tabs.find(t=>t.id==='timeline').timeline_items.length,11);
});
test('一至四题标记未完成并保留诊断草稿，不伪装完整成功',()=>{
  for(let n=1;n<5;n++){
    const x={...draft,question_count:n,questions:questions.slice(0,n)};
    const f=finish(assemble(x),x);assert.equal(f.status,'INCOMPLETE_QUESTION_SET');assert.equal(f.output_ready,false);
    const env=JSON.parse(f.publication_payload_json);assert.equal(env.diagnostics.partial_draft_questions.length,n);assert.equal(env.completion.available_question_count,n);
    const r=outerRun(f.publication_payload_json);assert.equal(r.final_data.question_count,0);assert.equal(r.selection_report.workflow_status,'INCOMPLETE_QUESTION_SET');assert(r.output_data.detail.overview);
  }
});
test('格式错误单独保留原输出与检查错误，不能回退首轮或造缺失证据ID',()=>{
  const x=structuredClone(draft);delete x.questions[0].keyPoint;delete x.questions[0].evidence_id;x.questions[0].explain='缺失四行';
  const f=finish(assemble(x),x);assert.equal(f.status,'FORMAT_ERROR');
  const env=JSON.parse(f.publication_payload_json);assert(env.diagnostics.second_round_raw.includes('缺失四行'));assert(env.program_check.errors.length);
  const r=outerRun(f.publication_payload_json);assert.equal(r.selection_report.workflow_status,'FORMAT_ERROR');assert(r.selection_report.source_groups[0].program_check.errors.length);
});
test('损坏JSON和真实零题不足区分，失败也保留病例页',()=>{
  assert.equal(finish(assemble('{bad'),'{bad').status,'FORMAT_ERROR');
  const x={...draft,generation_status:'insufficient',question_count:0,questions:[],missing_information:['测试：无适用记录'],risk_message:'无适用依据'};
  const f=finish(assemble(x),x);assert.equal(f.status,'STOP_INSUFFICIENT');const r=outerRun(f.publication_payload_json);assert(r.output_data.detail.overview);
});
test('空病例、图片输入限制、14字段接口不变；输入冲突仅加提示不改写事实',()=>{
  const r=fn('v12CasePacket')({case_json:JSON.stringify(payload)});
  assert.equal(Object.keys(r.case_packet).length,14);assert.equal(r.case_packet.case_timeline,payload.case_timeline);assert.equal(r.case_packet.decision_points,payload.decision_points);
  assert(r.case_packet.evidence_notes.includes('输入一致性提示'));
  assert.throws(()=>fn('v12CasePacket')({case_json:''}));
});
test('外层历史短题组也不能绕过五题要求，非完整状态始终有病例页',()=>{
  const internal=JSON.parse(finish(assemble(draft)).publication_payload_json);
  const pub=JSON.parse(internal.final_response_json);pub.questions=pub.questions.slice(0,1);pub.question_count=1;
  internal.final_response_json=JSON.stringify(pub);internal.completion=null;
  const r=outerRun(JSON.stringify(internal));assert.equal(r.final_data.question_count,0);assert.equal(r.selection_report.workflow_status,'INCOMPLETE_QUESTION_SET');assert(r.case_page_data.overview);
});
if(slim){
  test('外层直接程序整理，无终稿AI、条件门或悬空agent_reply依赖',()=>{
    assert(!outer.nodes.some(n=>['ltrYX3w0AXTIiF0r','singleEditorialGate20260917'].includes(n.nodeId)));
    assert(outer.edges.some(e=>e.source==='bJcPjyWI8hiwuVOS'&&e.target==='jKqMCN8eJKvkngnI'));
    assert(!outer.nodes.find(n=>n.nodeId==='jKqMCN8eJKvkngnI').inputs.some(i=>i.key==='agent_reply'));
    assert(!code(outer,'jKqMCN8eJKvkngnI').includes('applyEditorialEdits'));
    const r=outerRun(finish(assemble(draft)).publication_payload_json);
    assert.equal(r.selection_report.selection_method,'deterministic_original_order');
    assert(!r.quality_notice.includes('终选回复异常'));
    assert.deepEqual(plain(r.final_data.questions.map(q=>q.id)),['Q1','Q2','Q3','Q4','Q5']);
  });
  test('删除旧三组文案和审核变量后，14字段payload逐值不变',()=>{
    const previous=load('outputs/全链路五题修复-20260928/02-HTML测试外层-全链路五题修复版.json');
    const extraction={...payload,learning_points_candidate:payload.learning_points,decision_points_candidate:payload.decision_points};
    const input={case_json:JSON.stringify(extraction)};
    const a=fn('ogy1PAMdD268kXeo',previous)(input),b=fn('ogy1PAMdD268kXeo',outer)(input);
    assert.equal(b.case_payload_json,a.case_payload_json);
    for(const k of ['learning_points_a','learning_points_b','learning_points_c','question_draft','review_feedback'])assert(!(k in b));
    assert.equal(Object.keys(JSON.parse(b.case_payload_json)).length,14);
  });
  test('精简统计可复算，分类白名单保留，关键完成与引用检查未变',()=>{
    const stats=load(dir+'精简统计.json');
    assert(stats.prompt_reduction_percent>40);
    const p=outer.nodes.find(n=>n.nodeId==='t7eXTzfAM2QUzvvK').inputs.find(i=>i.key==='systemPrompt').value;
    const old=oldOuter.nodes.find(n=>n.nodeId==='t7eXTzfAM2QUzvvK').inputs.find(i=>i.key==='systemPrompt').value;
    assert.deepEqual(JSON.parse(p.slice(p.indexOf('["乳腺叶状肿瘤"'))),JSON.parse(old.slice(old.indexOf('["乳腺叶状肿瘤"'))));
    const previous=load('outputs/全链路五题修复-20260928/01-出题子应用-全链路五题修复版.json');
    for(const id of ['v12AssemblyR2','cmuTcUhJefVm2DC6','v11EvidenceRegistry','v11IraeSplitFinal','v12RevisionInput'])assert.equal(code(child,id),code(previous,id));
  });
}

const objDraft=()=>{const x=structuredClone(draft);for(const q of x.questions)q.explain=Object.fromEntries(q.explain.split('\n').map(s=>[s[0],s.slice(s.indexOf('：')+1)]));return x;};
test('全流程修改范围明确，模型参数与原检索节点保持一致',()=>{
 const base=load('outputs/选项重复与答案布局修复-20260929/01-出题子应用-Flash选项去重复版.json');
 assert.deepEqual(child.edges,base.edges);
 const allowed=new Set(['sR35QbYF2xamDQR3','v12RevisionGenerator','v12RevisionInput','nWJ1txLnlLszyUU5','v12FinalPublicationNormalize']);
 for(const n of child.nodes){const b=base.nodes.find(x=>x.nodeId===n.nodeId);if(!allowed.has(n.nodeId))assert.deepEqual(n,b);assert.deepEqual(n.outputs,b.outputs);
  for(const i of b.inputs)if(!['code','systemPrompt'].includes(i.key))assert.deepEqual(n.inputs.find(j=>j.key===i.key),i);
  const added=n.inputs.filter(i=>!b.inputs.some(j=>j.key===i.key));assert.equal(added.length,n.nodeId==='v12FinalPublicationNormalize'?1:0);
  if(added.length)assert.deepEqual(added[0].value,['sR35QbYF2xamDQR3','answerText']);
 }
});
test('结构化解析从首轮到公开接口均输出四行字符串且不改变选项',()=>{
 const x=objDraft();const snapshot=JSON.stringify(x);
 for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2']){
   const a=fn(id)({candidate_json:x,evidence_pool:pool,second_cancer_type:'直肠癌'});
   assert.equal(a.structure_decision,'PASS');
   const pub=JSON.parse(a.candidate_json_passthrough);
   for(let i=0;i<5;i++){assert.equal(pub.questions[i].explain,explain);assert.deepEqual(pub.questions[i].options,x.questions[i].options);}
   assert.equal(JSON.stringify(x),snapshot,'adapter must not mutate raw input');
 }
 const f=finish(assemble(x),x);assert.equal(f.status,'OUTPUT_READY');assert.equal(f.publishable,false);
 assert.equal(JSON.parse(f.publication_payload_json).workflow_revision,'20260929-full-review-five');
 const outerResult=outerRun(f.publication_payload_json);assert.equal(outerResult.final_data.question_count,5);
 for(const q of outerResult.final_data.questions)assert.equal(typeof q.explain,'string');
});
test('四种答案位置保留，程序仅生成正确标记，理由逐字保留',()=>{
 for(let answer=0;answer<4;answer++){
   const x=objDraft();x.questions[0].answer=answer;x.questions[0].answer_text=x.questions[0].options[answer];
   const a=assemble(x);assert.equal(a.structure_decision,'PASS');
   const q=JSON.parse(a.candidate_json_passthrough).questions[0];
   assert.equal(q.answer,answer);assert.deepEqual(q.options,x.questions[0].options);
   const rows=q.explain.split('\n');assert.equal(rows.length,4);
   rows.forEach((r,i)=>assert.equal(r,'ABCD'[i]+'｜'+(i===answer?'正确':'不正确')+'：'+x.questions[0].explain['ABCD'[i]]));
 }
});
test('缺解析、空理由、多余键、嵌套值、多行或自带判定标签均拦截且不补造',()=>{
 const mutations=[q=>delete q.explain.B,q=>q.explain.C=' ',q=>q.explain.E='多余',q=>q.explain.D={text:'内容'},q=>q.explain.A='理由\n新行',q=>q.explain.A='正确：重复标签',q=>q.explain.A='A｜正确：重复',q=>delete q.keyPoint,q=>q.keyPoint=''];
 for(const mutate of mutations){const x=objDraft();mutate(x.questions[1]);const a=assemble(x);assert.equal(a.structure_decision,'FAIL');const f=finish(a,x);assert.equal(f.status,'FORMAT_ERROR');assert.equal(f.output_ready,false);}
});
test('纯证据代号占位解析拦截，内容完整旧格式仍兼容',()=>{
 for(const text of ['IR02明确','该指南指出','原文','GB04支持']){const x=objDraft();x.questions[0].explain.A=text;assert.equal(assemble(x).structure_decision,'FAIL');}
 assert.equal(assemble(draft).structure_decision,'PASS');
});
test('数量不足依旧不冒充五题成功，结构化解析不造成绕过',()=>{
 for(const n of [1,2,3,4]){const x=objDraft();x.questions=x.questions.slice(0,n);x.question_count=n;const f=finish(assemble(x),x);assert.equal(f.status,'INCOMPLETE_QUESTION_SET');assert.equal(f.output_ready,false);}
});
test('第二轮逐题接收缺字段诊断、证据边界清单及对象解析文本线索',()=>{
 const x=objDraft();delete x.questions[1].keyPoint;delete x.questions[1].explain.C;x.questions[2].explain.D='研究数值趋势不能直接写成无劣。';
 const r=JSON.parse(fn('v12RevisionInput')({previous_candidate:JSON.stringify(x),evidence_pool:pool,structure_decision:'FAIL'}).system_text);
 assert(r.review_plan.question_checks[1].structural_defects.some(s=>s.includes('keyPoint')));
 assert(r.review_plan.question_checks[1].structural_defects.some(s=>s.startsWith('C解析')));
 assert(r.review_plan.question_checks[2].review_cues.includes('无劣'));
 assert.equal(r.review_plan.evidence_scope_checklist.length,6);
 assert.equal(r.previous_candidate_raw,JSON.stringify(x));
 assert.equal(r.evidence_pool.records[0].snippet,records[0].raw_snippet);
});
test('真实失败回放：Q2/Q4缺失仍拒绝；第二轮输入明确指出两题缺口',()=>{
 const text=fs.readFileSync('C:/Users/admin/.codex/attachments/ed9da0e6-e284-4207-b3c6-a7941dcb6766/已粘贴的文本.txt','utf8');
 // Read-only repair of illegal pasted outer escapes. Do not alter inner model JSON or runtime parser.
 let repaired='',inside=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){inside=!inside;repaired+=c;}else if(inside&&c==='\\'){const n=text[++i];if(!'"\\/bfnrtu'.includes(n))repaired+='\\';repaired+='\\'+n;}else repaired+=c;}
 const data=JSON.parse(repaired),raw=JSON.parse(data.second_round_raw);
 const a=fn('v12AssemblyR2')({candidate_json:data.second_round_raw,evidence_pool:data.evidence_pool,second_cancer_type:data.second_cancer_type});
 assert.equal(a.structure_decision,'FAIL');
 for(const id of ['Q2','Q4'])assert(a.structure_errors.some(s=>s.includes(id)&&s.includes('keyPoint')));
 const r=JSON.parse(fn('v12RevisionInput')({previous_candidate:data.second_round_raw,evidence_pool:data.evidence_pool,structure_decision:'FAIL',structure_errors:a.structure_errors}).system_text);
 for(const id of ['Q2','Q4']){const q=r.review_plan.question_checks.find(q=>q.question_id===id);assert(q.structural_defects.some(s=>s.includes('keyPoint')));assert(q.structural_defects.some(s=>s.includes('1行')));}
 assert.equal(r.evidence_pool.records.length,19);
 assert.equal(raw.questions[1].explain,'A｜正确：IR02明确');
 fs.writeFileSync(dir+'真实失败回放.json',JSON.stringify({case_id:data.case_id,question_count:raw.questions.length,structure_decision:a.structure_decision,structure_errors:a.structure_errors,revision_question_checks:r.review_plan.question_checks,model_rerun:false,medical_correctness_verified:false},null,2));
});
test('引用原文诊断保留，模型内部对象不污染公开接口',()=>{
 const x=objDraft();const env=JSON.parse(finish(assemble(x),x).publication_payload_json);
 assert.equal(env.diagnostics.cited_evidence_snapshot.length,5);
 assert.equal(env.diagnostics.cited_evidence_snapshot[0].snippet,records[0].raw_snippet);
 for(const q of JSON.parse(env.final_response_json).questions){assert.equal(typeof q.explain,'string');assert(!('structural_defects' in q));assert(!('evidence_id' in q));}
});
test('新版子应用经现有单例外层进入批量终稿，十份五题输出均兼容',()=>{
 const x=objDraft(),single=outerRun(finish(assemble(x),x).publication_payload_json).output_data;
 const batch=load('outputs/全流程复核优化-20260929/03-批量生成-全流程优化版.json');
 const run=fn('batchFinal20260909',batch);
 const r=run({results:Array.from({length:10},()=>({success:true,data:JSON.stringify(single)})),expected_count:10});
 assert.equal(r.batch_report.complete_count,10);assert.equal(r.output_data.length,10);
 for(const item of r.output_data){assert.equal(item.Questions.question_count,5);for(const q of item.Questions.questions)assert.equal(typeof q.explain,'string');}
});

test('内部编号出现在任何学员文本或引用摘要均拒绝，不自动删除理由',()=>{
 for(const field of ['question','keyPoint','evidence_summary']){
  const x=objDraft();x.questions[0][field]+='，GA01明确';assert.equal(assemble(x).structure_decision,'FAIL');
 }
 const x=objDraft();x.questions[0].explain.A='IR01支持此处理。';
 const f=finish(assemble(x),x);assert.equal(f.status,'FORMAT_ERROR');assert.equal(f.output_ready,false);
 const y=objDraft();y.questions[0].options[1]='GB02';assert.equal(assemble(y).structure_decision,'FAIL');
});
test('明确新增假设必须标注，标注后计入两题上限，假设检验不误判',()=>{
 for(const stem of ['假设患者之后进展，该如何选择？','患者已缓解。若后续再次出现症状，该如何选择？']){
  const x=objDraft();x.questions[0].question=stem;assert.equal(assemble(x).structure_decision,'FAIL');
  x.questions[0].question='【延伸情境】'+stem;assert.equal(assemble(x).structure_decision,'PASS');
 }
 const x=objDraft();x.questions[0].question='假设检验中的证据边界应如何理解？';assert.equal(assemble(x).structure_decision,'PASS');
 for(let i=0;i<3;i++)x.questions[i].question='【延伸情境】假设新增条件'+i+'，应如何选择？';assert.equal(assemble(x).structure_decision,'FAIL');
});
test('全A只提示修订，不自动换序或让完整题组归零',()=>{
 const x=objDraft(),a=assemble(x);assert.equal(a.structure_decision,'PASS');
 assert(a.structure_warnings.some(s=>s.includes('ANSWER_POSITION_CONCENTRATION')));
 const r=JSON.parse(fn('v12RevisionInput')({previous_candidate:JSON.stringify(x),evidence_pool:pool}).system_text);
 assert(r.review_plan.answer_position_warning.includes('少于3种'));
 assert.deepEqual(JSON.parse(a.candidate_json_passthrough).questions.map(q=>q.answer),[0,0,0,0,0]);
});
test('核心病程线索逐值保留，生成五题仍可披露未覆盖主题',()=>{
 const packet={decision_points:'活动性感染下全身治疗选择',learning_points:'特殊并发症与药物取舍',adverse_events:'分级未知'};
 const r=JSON.parse(fn('v12RevisionInput')({case_packet:JSON.stringify(packet),previous_candidate:JSON.stringify(objDraft()),evidence_pool:pool}).system_text);
 for(const k of Object.keys(packet))assert.equal(r.review_plan.case_focus[k],packet[k]);
 const x=objDraft();x.missing_information=['核心并发症尚无适用证据，未覆盖该决策'];
 const f=finish(assemble(x),x);assert.equal(f.status,'OUTPUT_READY');
 assert(JSON.parse(f.final_response_json).missing_information.includes(x.missing_information[0]));
 assert(outerRun(f.publication_payload_json).final_data.missing_information.includes(x.missing_information[0]));
});
test('未知条件、药物错配、首次再次规则是复核线索，不自动判医学错误',()=>{
 const signals=vm.runInNewContext(fs.readFileSync('work/applicability-five-20260928/quality_signals.js','utf8')+'\nquestionQualitySignals');
 const q={question:'患者TMP-SMX后再次皮疹，分级未记载，应如何处理？',options:['继续抗肿瘤药','停药','检查','会诊'],explain:{A:'某处理理由',B:'某处理理由',C:'某处理理由',D:'某处理理由'}};
 const r=signals(q);assert.equal(r.format_errors.length,0);
 for(const code of ['UNKNOWN_CONDITION','RECURRENT_TOXICITY','DRUG_CLASS_CHECK'])assert(r.review_cues.some(s=>s.startsWith(code)));
 const trial=signals({question:'复发转移患者的临床研究能否适用？'}, {source_title:'术后辅助治疗',snippet:'III期患者'});
 assert(trial.review_cues.some(s=>s.startsWith('TREATMENT_PHASE_CHECK')));assert.equal(trial.format_errors.length,0);
 // The user explicitly excluded source symbol correction; evidence text is not rewritten.
 const evidence={source_title:'CheckMate 9DW',snippet:'≤1 measurable lesion'};const before=JSON.stringify(evidence);signals({question:'研究人群是什么？'},evidence);assert.equal(JSON.stringify(evidence),before);
});
test('本批50题回放，21题解析泄漏编号，含引用摘要共29题，另2题延伸漏标',()=>{
 const batch=load('outputs/第二批十例结果核对-20260928/原始结果解析.json');
 const signals=vm.runInNewContext(fs.readFileSync('work/applicability-five-20260928/quality_signals.js','utf8')+'\nquestionQualitySignals');
 const rows=batch.map((r,i)=>({output_index:i+1,case_id:r.Questions.case_id,questions:r.Questions.questions.map(q=>({id:q.id,...plain(signals({...q,evidence_summary:q.guidelineRef.evidence_summary},{source_title:q.guidelineRef.source_title,source_section:q.guidelineRef.source_section,snippet:q.guidelineRef.evidence_summary}))}))}));
 const all=rows.flatMap(r=>r.questions);
 assert.equal(all.length,50);assert.equal(all.filter(q=>q.format_errors.some(s=>s.includes('内部证据编号'))).length,29);
 assert.equal(batch.flatMap(r=>r.Questions.questions).filter(q=>/\b(?:GA|GB|GS|CS|IR)\d+\b/.test(q.explain)).length,21);
 assert.equal(all.filter(q=>q.format_errors.some(s=>s.includes('未标【延伸情境】'))).length,2);
 assert(rows[0].questions.find(q=>q.id==='Q3').review_cues.some(s=>s.startsWith('TOXICITY_SCOPE_CHECK')));
 assert(rows[1].questions.find(q=>q.id==='Q3').review_cues.some(s=>s.startsWith('DRUG_CLASS_CHECK')));
 assert(rows[2].questions.find(q=>q.id==='Q3').review_cues.some(s=>s.startsWith('TREATMENT_PHASE_CHECK')));
 assert(rows[7].questions.find(q=>q.id==='Q3').review_cues.some(s=>s.startsWith('UNKNOWN_CONDITION')));
 fs.writeFileSync(dir+'第二批50题文字回放.json',JSON.stringify({scope:'text_signals_only_not_medical_verdict',source_context:'visible_reference_summary_not_full_retrieval',model_rerun:false,rows},null,2));
});

test('题干尾句规范化不改临床前提、选项、答案或解析，不改变原始对象',()=>{
 const normalize=vm.runInNewContext(fs.readFileSync('work/wording-facts-20260929/wording.js','utf8')+'\nnormalizeQuestionWording');
 const x=objDraft();x.questions[0].question='患者有活动性出血。关于下一步方案，下列哪项最符合当前指南推荐？';
 const raw=JSON.stringify(x),y=plain(normalize(x));
 assert.equal(y.questions[0].question,'患者有活动性出血。关于下一步方案，以下哪项正确？');
 assert.equal(JSON.stringify(x),raw);
 const q={...y.questions[0],question:x.questions[0].question};assert.deepEqual(q,x.questions[0]);
 assert.deepEqual(plain(normalize(y)),y);
 const z={questions:[{question:'研究中哪项不符合指南推荐？'},{question:'研究是否符合指南推荐的入组条件？'}]};assert.deepEqual(plain(normalize(z)),z);
});
test('首轮与最终程序装配同步改写问法，公开题目仍是五题原顺序',()=>{
 const x=objDraft();x.questions[1].question='在当前病例条件下，以下哪项最符合指南建议？';
 for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2']){
  const a=fn(id)({candidate_json:JSON.stringify(x),evidence_pool:pool,second_cancer_type:'直肠癌'});assert.equal(a.structure_decision,'PASS');
  assert.equal(JSON.parse(a.candidate_json_passthrough).questions[1].question,'在当前病例条件下，以下哪项正确？');
 }
 const f=finish(assemble(x),x);assert.equal(f.status,'OUTPUT_READY');
 assert.equal(outerRun(f.publication_payload_json).final_data.questions[1].question,'在当前病例条件下，以下哪项正确？');
});
test('第二轮列出限定词丢失、病例事实和序贯同期疑点，不将其当作硬医学裁决',()=>{
 const x=objDraft();x.questions[0].question='患者白细胞下降，治疗期间加用某药，以下哪项正确？';x.questions[0].options[0]='永久停药';x.questions[0].answer_text='永久停药';
 const p=structuredClone(pool);p.records[0].raw_snippet='进展后序贯换线；根据病情可能需要永久停用或减量。';
 const r=JSON.parse(fn('v12RevisionInput')({previous_candidate:JSON.stringify(x),evidence_pool:p,case_packet:JSON.stringify({adverse_events:'仅记载白细胞减少'})}).system_text);
 const q=r.review_plan.question_checks[0];for(const c of ['CASE_FACT_TRACE','QUALIFIER_LOSS_CHECK','SEQUENCE_VS_COMBINATION'])assert(q.applicability_review_cues.some(s=>s.startsWith(c)));
 assert(q.fact_review.includes('病例原句'));assert.equal(q.structural_defects.length,0);
 assert.equal(r.evidence_pool.records[0].snippet,p.records[0].raw_snippet);
});
test('当前真实批次10例50题：四行完整、无内部编号，无全同答案',()=>{
 const current=load('work/batch-20260929/results.json');assert.equal(current.length,10);
 for(const r of current){assert.equal(r.Questions.questions.length,5);assert.equal(r.Questions.question_count,5);assert(r.Questions.missing_information.length>0);assert(new Set(r.Questions.questions.map(q=>q.answer)).size>1);
  for(const q of r.Questions.questions){assert(q.keyPoint.trim());assert.equal(q.explain.split('\n').length,4);assert.equal(q.options[q.answer],q.answer_text);assert(!/\b(?:GA|GB|GS|CS|IR)\d+\b/.test(JSON.stringify(q)));}
 }
 const normal=vm.runInNewContext(fs.readFileSync('work/wording-facts-20260929/wording.js','utf8')+'\nnormalizeQuestionWording');
 const changed=[];current.forEach((r,i)=>normal({questions:r.Questions.questions}).questions.forEach((q,j)=>{if(q.question!==r.Questions.questions[j].question)changed.push({output_index:i+1,question_id:q.id,before:r.Questions.questions[j].question,after:q.question});assert.deepEqual(plain({...q,question:r.Questions.questions[j].question}),r.Questions.questions[j]);}));
 assert(changed.length>0);
 fs.writeFileSync(dir+'题干措辞回放.json',JSON.stringify({model_rerun:false,medical_content_changed:false,changed_count:changed.length,changes:changed},null,2));
});

test('四项复核表保留各选项、答案和对象解析，不生成医学判定或改动输入',()=>{
 const x=objDraft();x.questions[0].answer=2;x.questions[0].answer_text=x.questions[0].options[2];
 const before=JSON.stringify(x),r=JSON.parse(fn('v12RevisionInput')({previous_candidate:before,evidence_pool:pool}).system_text);
 const q=r.review_plan.question_checks[0];assert.equal(q.option_review.length,4);
 q.option_review.forEach((row,i)=>{assert.equal(row.option,'ABCD'[i]);assert.equal(row.text,x.questions[0].options[i]);assert.equal(row.draft_reason,x.questions[0].explain['ABCD'[i]]);assert.equal(row.draft_selected,i===2);assert(!('verdict' in row));});
 assert.equal(JSON.stringify(x),before);assert.equal(r.review_plan.set_review.questions.length,5);
 assert.equal(r.review_plan.set_review.scope,'review_tasks_not_medical_verdict');
});
test('兼容旧四行解析，缺行不按位置错配，也不补造解释',()=>{
 const x=structuredClone(draft);x.questions[0].explain='A｜正确：甲理由\nC｜不正确：丙理由\nD｜不正确：丁理由';
 const r=JSON.parse(fn('v12RevisionInput')({previous_candidate:JSON.stringify(x),evidence_pool:pool}).system_text);
 const q=r.review_plan.question_checks[0];assert(q.structural_defects.some(s=>s.includes('3行')));
 assert.equal(q.option_review[1].draft_reason,'');assert.equal(q.option_review[2].draft_reason,'C｜不正确：丙理由');
});
test('分期、ADC和常规流程只是复核线索，未命中题仍有四项复核，证据不改写',()=>{
 const x=objDraft();x.questions[0].question='讨论分期及MDT评估后使用RC48的适用条件，以下哪项正确？';
 const p=structuredClone(pool);p.records[0].raw_snippet='CheckMate 9DW要求≤1个可测量病灶。';const before=JSON.stringify(p);
 const r=JSON.parse(fn('v12RevisionInput')({previous_candidate:JSON.stringify(x),evidence_pool:p}).system_text);
 assert.equal(r.review_plan.set_review.questions[0].review_cues.length,3);
 assert.equal(r.review_plan.question_checks[1].option_review.length,4);
 assert.equal(r.evidence_pool.records[0].snippet,p.records[0].raw_snippet);assert.equal(JSON.stringify(p),before);
});
test('Qwen3.5真实50题仅回放复核输入，200项一一对应且BBBBB不被程序洗牌',()=>{
 const batch=load('work/qwen35-results-20260929/results.json');assert.equal(batch.length,10);
 const report=[];
 for(const [i,item]of batch.entries()){
  const original=JSON.stringify(item);const x=structuredClone(item.Questions);
  // Public options/answer are letter keyed; adapt back to the internal candidate contract.
  x.questions=x.questions.map(q=>({...q,options:['A','B','C','D'].map(k=>q.options[k]),answer:'ABCD'.indexOf(q.answer)}));
  assert.equal(x.questions.length,5);const before=JSON.stringify(x);
  const r=JSON.parse(fn('v12RevisionInput')({previous_candidate:before,evidence_pool:{records:[]}}).system_text);
  assert.equal(r.review_plan.question_checks.length,5);
  for(const [j,q]of r.review_plan.question_checks.entries()){
   assert.equal(q.option_review.length,4);q.option_review.forEach((row,k)=>assert.equal(row.text,x.questions[j].options[k]));
   assert.equal(q.option_review.filter(row=>row.draft_selected).length,1);
  }
  assert.equal(r.previous_candidate_raw,before);assert.equal(JSON.stringify(x),before);assert.equal(JSON.stringify(item),original);
  report.push({index:i+1,case_id:x.case_id,question_count:x.questions.length,option_review_count:20,answer_counts:r.review_plan.answer_counts,set_review:r.review_plan.set_review});
 }
 assert.deepEqual(report[4].answer_counts,[0,5,0,0]);
 fs.writeFileSync(dir+'Qwen3.5真实50题复核输入回放.json',JSON.stringify({scope:'review_input_transport_only',public_letter_fields_adapted_to_internal:true,full_evidence_available:false,model_rerun:false,medical_correctness_verified:false,rows:report},null,2));
});

test('两路证据注册只增加字面索引，不改变原文、资格、顺序、定位或补检决定',()=>{
 const base=load('C:/Users/admin/.codex/attachments/00063ce5-cdef-4bc1-a44d-d812d02ee114/已粘贴的文本.txt');
 const r={doc_id:'SCOPE-FIXTURE',split_index:0,type:'guideline',authority:'测试机构',source_title:'初诊分期指南',snippet:'新辅助治疗。必要时每2周期乳腺MRI。胸部CT⁴。≤1个病灶。'};
 for(const id of ['v11EvidenceRegistry','v11EvidenceRegistryInitial']){
  const input={guideline_a_staging:[r]},old=plain(fn(id,base)(input)),now=plain(fn(id)(input));
  const index=now.evidence_pool.records[0].scope_index;assert(index.matched_terms.includes('新辅助'));assert(index.matched_terms.includes('乳腺MRI'));assert(index.has_footnote_markers);
  for(const rec of now.evidence_pool.records)delete rec.scope_index;
  const json=JSON.parse(now.evidence_pool_json);json.records.forEach(rec=>delete rec.scope_index);now.evidence_pool_json=JSON.stringify(json);
  assert.deepEqual(now,old);assert.equal(input.guideline_a_staging[0].snippet,r.snippet);
 }
});
test('病例限制保留原句及来源，未知不变成阴性，输入字段不被改写',()=>{
 const p={case_context:'患者已接受全脑放疗。拒绝再次放疗。',case_timeline:'2021年｜药物获取受限，无法耐受严重胃肠道反应。',biomarkers:'结果未回报。',adverse_events:'分级未记载。'};
 const before=JSON.stringify(p),r=JSON.parse(fn('v12RevisionInput')({case_packet:before,previous_candidate:JSON.stringify(objDraft()),evidence_pool:pool}).system_text);
 assert.deepEqual(r.case_packet,p);assert.equal(JSON.stringify(p),before);
 const entries=r.review_plan.case_constraints.items;assert(entries.some(row=>row.text==='拒绝再次放疗。'&&row.field==='case_context'));
 assert(entries.some(row=>row.text.includes('获取受限')));assert(entries.some(row=>row.text==='结果未回报。'));
 assert.equal(JSON.parse(fn('v12RevisionInput')({case_packet:'{}'}).system_text).review_plan.case_constraints.items.length,0);
});
test('新辅助片段和脑转移背景触发范围与部位复核，不当作医学FAIL',()=>{
 const x=objDraft();x.questions[0].question='首周期神经系统症状改善，如何安排MRI复评？';
 const p=structuredClone(pool);p.records[0].raw_snippet='新辅助治疗每周期评估，必要时每2周期乳腺MRI。';
 const r=JSON.parse(fn('v12RevisionInput')({previous_candidate:JSON.stringify(x),evidence_pool:p,case_packet:JSON.stringify({disease:'晚期脑转移'})}).system_text);
 const q=r.review_plan.question_checks[0];assert(q.source_review.tasks.some(t=>t.code==='PHASE_CONTEXT_REVIEW'));assert(q.source_review.tasks.some(t=>t.code==='IMAGING_SITE_REVIEW'));
 assert.equal(q.structural_defects.length,0);assert.equal(q.source_review.scope,'review_tasks_not_medical_verdict');
});
test('未绑定研究名、分型必要性和非随机优效分别标记，原文有研究名时不误报',()=>{
 const run=vm.runInNewContext(fs.readFileSync('work/source-scope-20260929/scope.js','utf8')+'\nsourceReviewTasks');
 const q={question:'分型所需标记物是否不可缺？',explain:{A:'EXAMPLE研究证明组合优于单药。'}};
 const s={snippet:'A single-arm study. ORR differs.'};const a=plain(run(q,s,{}));
 for(const code of ['UNBOUND_STUDY_NAME','MARKER_NECESSITY_REVIEW','COMPARATIVE_CLAIM_REVIEW'])assert(a.tasks.some(t=>t.code===code));
 assert(!plain(run(q,{snippet:'EXAMPLE研究正文'},{})).tasks.some(t=>t.code==='UNBOUND_STUDY_NAME'));
});
test('上传版错误分支已关闭，正常修订链存在；全流程除许可字段外保持一致',()=>{
 const base=load('C:/Users/admin/.codex/attachments/00063ce5-cdef-4bc1-a44d-d812d02ee114/已粘贴的文本.txt');
 assert.equal(child.nodes.find(n=>n.nodeId==='v12RevisionInput').catchError,false);
 assert(!child.edges.some(e=>e.source==='v12RevisionInput'&&e.sourceHandle.includes('catch')));
 assert(child.edges.some(e=>e.source==='v12RevisionInput'&&e.target==='v12RevisionGenerator'));
 const reversed=structuredClone(child);
 for(const n of reversed.nodes){const b=base.nodes.find(b=>b.nodeId===n.nodeId);n.inputs=b.inputs;n.outputs=b.outputs;if(n.nodeId==='v12RevisionInput')n.catchError=b.catchError;}
 reversed.edges=base.edges;assert.deepEqual(reversed,base);
});
test('Flash/Plus真实十题回放命中已确认风险，结构检查不冒充医学修复',()=>{
 const reports=[];
 for(const label of ['flash','plus']){
  const result=load('work/flash-plus-pair-20260929/'+label+'.json'),g=result.selection_report.source_groups[0];
  const packet={disease:result.case_page_data.home.display_title,case_context:result.case_page_data.home.description,case_timeline:result.case_page_data.overview.tabs.find(t=>t.id==='timeline').timeline_items.map(t=>t.date+'｜'+t.detail).join('\n')};
  const x=structuredClone(result.final_data);
  x.questions=x.questions.map(q=>({...q,options:['A','B','C','D'].map(k=>q.options[k]),answer:'ABCD'.indexOf(q.answer),evidence_id:g.workflow_diagnostics.question_evidence_bindings.find(b=>b.question_id===q.id).evidence_id,evidence_summary:q.guidelineRef.evidence_summary}));
  const review=JSON.parse(fn('v12RevisionInput')({case_packet:JSON.stringify(packet),previous_candidate:JSON.stringify(x),evidence_pool:{records:g.workflow_diagnostics.cited_evidence_snapshot}}).system_text).review_plan;
  const tasks=id=>review.question_checks.find(q=>q.question_id===id).source_review.tasks;
  if(label==='flash'){
   assert(tasks('Q2').some(t=>t.code==='UNBOUND_STUDY_NAME'&&t.name==='PANDORA'));
   assert(tasks('Q4').some(t=>t.code==='COMPARATIVE_CLAIM_REVIEW'));
   assert(tasks('Q5').some(t=>t.code==='PHASE_CONTEXT_REVIEW'));assert(tasks('Q5').some(t=>t.code==='IMAGING_SITE_REVIEW'));
   assert(!review.case_constraints.items.some(t=>t.text.includes('拒绝再次放疗')),'must not invent an omitted upstream fact');
  }else{assert(tasks('Q2').some(t=>t.code==='FOOTNOTE_SCOPE_REVIEW'));assert(tasks('Q3').some(t=>t.code==='MARKER_NECESSITY_REVIEW'));}
  reports.push({label,case_id:x.case_id,review});
 }
 fs.writeFileSync(dir+'真实十题风险定位回放.json',JSON.stringify({scope:'literal_review_cues_only',case_packet_reconstructed_from_visible_case_page:true,model_rerun:false,medical_correctness_verified:false,reports},null,2));
});

test('布局在首次生成前产生，100个病例均覆盖ABCD且只有一个字母重复',()=>{
 const run=vm.runInNewContext(fs.readFileSync('work/option-variety-20260929/options.js','utf8')+'\nanswerPositionPlan');const plans=[];
 for(let i=0;i<100;i++){const p={case_id:'TEST-'+i,case_title:'病例'+i},before=JSON.stringify(p),a=plain(run(p));
  assert.equal(a.assignments.length,5);assert.deepEqual(a.assignments.map(x=>x.id),['Q1','Q2','Q3','Q4','Q5']);
  assert.equal(new Set(a.assignments.map(x=>x.answer)).size,4);assert.equal(Math.max(...[0,1,2,3].map(n=>a.assignments.filter(x=>x.answer===n).length)),2);
  assert(a.assignments.every((x,j)=>x.letter==='ABCD'[x.answer]&&(!j||x.answer!==a.assignments[j-1].answer)));
  assert.deepEqual(plain(run(p)),a);assert.equal(JSON.stringify(p),before);plans.push(a.assignments.map(x=>x.letter).join(''));
 }assert(new Set(plans).size>10);
});
test('首轮文本引用真实布局输出，14字段病例不增加公共字段，第二轮计算同一计划',()=>{
 const result=plain(fn('v12CasePacket')({case_json:JSON.stringify(payload)}));
 const base=load('outputs/上传版证据范围修复-20260929/01-出题子应用-Flash证据范围修复版.json');
 const before=plain(fn('v12CasePacket',base)({case_json:JSON.stringify(payload)}));
 const {answer_position_plan_json,...rest}=result;assert.deepEqual(rest,before);assert.equal(Object.keys(result.case_packet).length,14);
 const r=JSON.parse(fn('v12RevisionInput')({case_packet:result.case_packet_json}).system_text);
 assert.deepEqual(r.review_plan.answer_position_plan,JSON.parse(answer_position_plan_json));
 const node=child.nodes.find(n=>n.nodeId==='v12CasePacket'),out=node.outputs.filter(o=>o.id==='answerPositionPlanJson');assert.equal(out.length,1);assert.equal(out[0].key,'answer_position_plan_json');assert.equal(out[0].valueType,'string');
 assert(child.nodes.find(n=>n.nodeId==='lUxTeIqSf0zHu2BL').inputs.find(i=>i.key==='system_textareaInput').value.includes('{{$v12CasePacket.answerPositionPlanJson$}}'));
});
test('跨题定位相同与近似选项，保留否定、剂量小数及必要术语，不据此自动判医学错误',()=>{
 const run=vm.runInNewContext(fs.readFileSync('work/option-variety-20260929/options.js','utf8')+'\noptionVarietyReview');
 const qs=[{id:'Q1',answer:0,options:['需先评估患者当前病情再决定下一步治疗','无需进一步检查即可直接开始治疗','甲','乙']},{id:'Q2',answer:0,options:['需先评估患者当前病情，再决定下一步治疗','无需重新检查即可直接开始治疗','丙','丁']}];
 const before=JSON.stringify(qs),r=plain(run(qs));assert.equal(r.scope,'lexical_review_not_medical_verdict');assert.equal(r.repeated_correct_pairs.length,1);
 assert(r.recurring_templates.some(t=>t.code==='NO_EVALUATION'));assert.equal(r.repeated_correct_pairs[0].left.question_id,'Q1');assert.equal(JSON.stringify(qs),before);
 const numeric=plain(run([{id:'Q1',answer:0,options:['该方案应使用药物1.5mg每次口服治疗']},{id:'Q2',answer:0,options:['该方案应使用药物15mg每次口服治疗']} ]));
 assert(!numeric.similar_option_pairs.some(p=>p.match==='exact_after_punctuation'));
 assert.equal(plain(run([null,{options:null},{}])).scope,'lexical_review_not_medical_verdict');
});
test('预检和最终装配暴露复用警告，但不改选项、答案或解析，不造成完整题组归零',()=>{
 const x=objDraft();for(const q of x.questions){q.options[0]='根据既定临床条件选择适用治疗方案';q.answer_text=q.options[0];}const before=JSON.stringify(x);for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2']){
  const r=fn(id)({candidate_json:before,evidence_pool:pool,second_cancer_type:'直肠癌'});assert.equal(r.structure_decision,'PASS');assert(r.structure_warnings.some(w=>w.startsWith('OPTION_REUSE')));
  const saved=JSON.parse(r.candidate_json_passthrough);saved.questions.forEach((q,i)=>{assert.deepEqual(q.options,x.questions[i].options);assert.equal(q.answer,x.questions[i].answer);});
 }assert.equal(JSON.stringify(x),before);assert.equal(finish(assemble(x),x).status,'OUTPUT_READY');
});
test('最新35题实测：识别全B与重复模板，生成前计划不同于全B，原始结果逐字不变',()=>{
 const batch=load('work/latest-batch-20260929/results.json'),report=[];const run=vm.runInNewContext(fs.readFileSync('work/option-variety-20260929/options.js','utf8')+'\n({answerPositionPlan,optionVarietyReview})');
 for(const [i,v]of batch.output_data.entries()){
  const snapshot=JSON.stringify(v),p={case_id:v.Questions.case_id,case_title:v.detail.home.display_title},plan=plain(run.answerPositionPlan(p)),review=plain(run.optionVarietyReview(v.Questions.questions));
  if(i===0){assert.deepEqual(review.answer_counts,[0,5,0,0]);assert(review.concentrated);assert(review.recurring_templates.length>0);assert.equal(new Set(plan.assignments.map(x=>x.answer)).size,4);}
  assert.equal(JSON.stringify(v),snapshot);report.push({index:i+1,title:p.case_title,original_question_count:v.Questions.question_count,plan,review});
 }
 assert(report.filter(r=>r.review.recurring_templates.length).length>=3);
 fs.writeFileSync(dir+'最新35题重复与布局回放.json',JSON.stringify({model_rerun:false,original_answers_changed:false,scope:'lexical_diagnostics_and_predraft_plan_only',report},null,2));
});

const batch=load(dir+'03-批量生成-全流程优化版.json'),runBatch=fn('batchFinal20260909',batch);
function outerTransport(env,mode='__ONCOROUNDS_BATCH_V2__'){
 const c=fn('bJcPjyWI8hiwuVOS',outer)({group1:env,case_packet:JSON.stringify({case_id:'TEST'})});
 return fn('jKqMCN8eJKvkngnI',outer)({candidate_pool:c.candidate_pool,case_id:'TEST',second_cancer_type:'直肠癌',case_context:'脱敏测试',transport_mode:mode,extraction_check:{scope:'test'}});
}
const completeEnv=()=>finish(assemble(objDraft()),objDraft()).publication_payload_json;
test('三个工作流全部节点语法和新增变量引用合法',()=>{
 for(const w of [child,outer,batch]){
  const ids=new Set(w.nodes.map(n=>n.nodeId));
  for(const n of w.nodes){
   for(const i of n.inputs){if(i.key==='code')new vm.Script(i.value);if(i.selectedType==='reference'&&Array.isArray(i.value)&&typeof i.value[0]==='string'){
    assert(ids.has(i.value[0]));assert(w.nodes.find(x=>x.nodeId===i.value[0]).outputs.some(o=>o.id===i.value[1]),n.name+'.'+i.key);
   }}
  }
 }
});
test('病例限制原句保留时点和拒绝范围，专家意见不写进患者事实',()=>{
 const extraction={...payload,learning_points_candidate:payload.learning_points,decision_points_candidate:payload.decision_points};
 const cleaned='【患者病例正文】\n2021年9月患者拒绝再次放疗，T-DXd获取受限。\n【专家观点】\n患者不应拒绝所有治疗。';
 const result=fn('ogy1PAMdD268kXeo',outer)({case_json:JSON.stringify(extraction),cleaned_text:cleaned});
 const p=JSON.parse(result.case_payload_json);assert.equal(Object.keys(p).length,14);
 assert(p.evidence_notes.includes('2021年9月患者拒绝再次放疗，T-DXd获取受限。'));assert(!p.evidence_notes.includes('不应拒绝所有'));
 assert.equal(p.case_timeline,extraction.case_timeline);assert.equal(result.evidence_notes,p.evidence_notes);
 assert.equal(result.extraction_check.retained_excerpts.length,1);
});
test('缺正文不从点评恢复事实，已有原句不重复追加',()=>{
 const guard=vm.runInNewContext(fs.readFileSync('work/full-review-20260929/constraint-guard.js','utf8')+'\npreserveConstraintExcerpts');
 const s={evidence_notes:'已有记录',case_timeline:'2021年患者拒绝再次放疗。'};
 assert.equal(guard(s,'【专家观点】患者拒绝治疗。').patient_section_found,false);assert.equal(s.evidence_notes,'已有记录');
 assert.equal(guard(s,'【患者病例正文】\n2021年患者拒绝再次放疗。\n【专家观点】其他').retained_excerpts.length,0);
});
test('真实病例限制片段回放保留拒绝放疗和药物获取受限',()=>{
 const source=fs.readFileSync('work/batch2-20260929/163395.txt','utf8');
 const line=source.split(/\r?\n/).find(x=>x.includes('拒绝再次放疗'));assert(line);
 const guard=vm.runInNewContext(fs.readFileSync('work/full-review-20260929/constraint-guard.js','utf8')+'\npreserveConstraintExcerpts');
 const p={case_timeline:'2021年9月开始RC48。',evidence_notes:''};
 guard(p,'【患者病例正文】\n'+line+'\n【专家观点】无');
 assert(p.evidence_notes.includes('拒绝再次放疗'));assert(p.evidence_notes.includes('T-DXd'));assert(p.evidence_notes.includes('2019 年 4 月'));
});
test('B路真实使用后线决策点，保留治疗与分子信息，最长480字符',()=>{
 const input={disease:'乳腺癌',case_timeline:'一线｜使用mFOLFOX6治疗；后线｜停用原方案，改为其他治疗',biomarkers:'KRAS未突变；HER2阳性',decision_points:'复评｜脑膜转移｜后线与局部协调；患者拒绝再次放疗'};
 const r=fn('nWJ1txLnlLszyUU5')(input);assert(r.system_text.includes('脑膜转移'));assert(r.system_text.includes('拒绝再次放疗'));assert(r.system_text.includes('mFOLFOX6'));assert(r.system_text.includes('KRAS'));
 assert(r.system_text.length<=480);assert(r.query_report.selected_segments.decision_points.length>0);
 const max=fn('nWJ1txLnlLszyUU5')({...input,disease:'癌'.repeat(130),decision_points:'后线'+ '测'.repeat(97),case_timeline:'治疗'+'测'.repeat(112),biomarkers:'HER2'+'测'.repeat(65)});assert(max.system_text.length<=480);
});
test('两个主要提示词缩短，第二轮不再20次重复相同核对指令，全文仍完整',()=>{
 const stats=load(dir+'修改记录.json');for(const p of stats.promptStats)assert(p.after<p.before);
 const r=JSON.parse(fn('v12RevisionInput')({previous_candidate:JSON.stringify(objDraft()),evidence_pool:pool}).system_text);
 assert(r.review_plan.question_checks.every(q=>q.option_review.length===4&&q.option_review.every(o=>!('review_required' in o))));
 assert.equal(r.evidence_pool.records[0].snippet,records[0].raw_snippet);
});
test('失败时保留两轮原文及可解析草稿，不擅自宣称截断原因',()=>{
 const x=objDraft();delete x.questions[4].keyPoint;const a=assemble(x);
 const r=fn('v12FinalPublicationNormalize')({candidate_json:a.candidate_json_passthrough,structure_decision:a.structure_decision,structure_errors:a.structure_errors,first_round_raw:'首轮原文',second_round_raw:JSON.stringify(x),second_cancer_type:'直肠癌'});
 const env=JSON.parse(r.publication_payload_json);assert.equal(r.status,'FORMAT_ERROR');assert.equal(env.diagnostics.first_round_raw,'首轮原文');assert.equal(env.diagnostics.parsed_second_round_draft.questions.length,5);assert.equal(env.diagnostics.model_execution.finish_reason,null);
 assert.equal(JSON.parse(r.final_response_json).question_count,0);
});
test('单例默认仍仅Questions和detail；批量显式模式才携带诊断',()=>{
 const single=outerTransport(completeEnv(),'普通输入'),transport=outerTransport(completeEnv());
 assert.deepEqual(Object.keys(JSON.parse(single.response_json)),['Questions','detail']);
 assert.deepEqual(JSON.parse(single.output_json),JSON.parse(transport.output_json));
 const t=JSON.parse(transport.response_json);assert.equal(t.record_type,'oncorounds_batch_item');assert.equal(t.execution_report.source_groups[0].workflow_revision,'20260929-full-review-five');
 assert(t.execution_report.source_groups[0].workflow_diagnostics.cited_evidence_snapshot.length===5);
});
test('子应用到单例再到批量：版本、失败类型、原文诊断全程保留且顺序不变',()=>{
 const good=outerTransport(completeEnv());
 const x=objDraft();delete x.questions[4].explain.D;
 const bad=outerTransport(finish(assemble(x),x).publication_payload_json);
 const empty={...objDraft(),generation_status:'insufficient',question_count:0,questions:[],missing_information:['暂无对应证据'],risk_message:'返回记录不足以支持完整决策'};
 const insufficient=outerTransport(finish(assemble(empty),empty).publication_payload_json);
 const r=runBatch({expected_count:3,results:[good,bad,insufficient].map(v=>({success:true,data:v.response_json}))});
 assert.equal(r.batch_report.complete_count,1);assert.equal(r.batch_report.failed_count,1);assert.equal(r.batch_report.incomplete_count,1);
 assert.equal(r.batch_report.items[1].code,'FORMAT_ERROR');assert.equal(r.batch_report.items[2].code,'STOP_INSUFFICIENT');
 assert(r.batch_report.items[1].execution_report.source_groups[0].workflow_diagnostics.second_round_raw.includes('Q5'));
 assert.deepEqual(plain(r.batch_report.retry_file_indices),[2,3]);assert.equal(r.output_data.length,3);
 assert.deepEqual(Object.keys(JSON.parse(r.response_json)),['output_data','batch_report']);
 fs.writeFileSync(dir+'诊断传递测试样例.json',JSON.stringify({synthetic_contract_fixture:true,result:plain(r.batch_report)},null,2));
});
test('批量拒绝状态矛盾、错病例报告、错误解析标签和重复选项',()=>{
 const t=JSON.parse(outerTransport(completeEnv()).response_json);
 for(const mutate of [x=>x.execution_report.status='FORMAT_ERROR',x=>x.execution_report.case_id='WRONG',x=>x.output_data.Questions.questions[0].explain='A｜不正确：错误标签',x=>x.output_data.Questions.questions[0].options.B=x.output_data.Questions.questions[0].options.A]){
  const x=structuredClone(t);mutate(x);const r=runBatch({expected_count:1,results:[{success:true,data:x}]});assert.equal(r.batch_report.complete_count,0);assert.equal(r.batch_report.failed_count,1);
 }
});
test('上一批真实十例输出兼容保留7例完成、3例未完成，旧格式不臆测失败类型',()=>{
 const old=load('work/latest-batch-20260929/results.json').output_data;
 const r=runBatch({expected_count:10,results:old.map(data=>({success:true,data}))});
 assert.equal(r.batch_report.complete_count,7);assert.equal(r.batch_report.incomplete_count,3);assert.equal(r.batch_report.failed_count,0);
 assert(r.batch_report.items.filter(x=>x.status==='incomplete').every(x=>x.code==='NO_COMPLETE_QUESTION_SET'&&x.execution_report===null));
 fs.writeFileSync(dir+'上批十例兼容回放.json',JSON.stringify({scope:'transport_and_structure_only',model_rerun:false,medical_correctness_verified:false,batch_report:plain(r.batch_report)},null,2));
});
test('批量失败槽位保留，非法JSON与执行错误不当成证据不足',()=>{
 const r=runBatch({expected_count:3,results:[{success:false},{success:true,data:'not json'},null]});
 assert.deepEqual(plain(r.batch_report.items.map(x=>x.code)),['CHILD_WORKFLOW_ERROR','INVALID_JSON','BATCH_INTERRUPTED']);assert.equal(r.output_data.length,3);
});
test('三层模板引用、应用调用绑定及模型配置保持可追溯',()=>{
 const manifest=load(dir+'修改记录.json');
 for(const [role,w] of Object.entries({child,outer,batch})){
  const original=load(manifest.sources[role]);assert.deepEqual(w.edges,original.edges);
  for(const n of w.nodes){
   const old=original.nodes.find(x=>x.nodeId===n.nodeId);
   if(n.flowNodeType==='appModule')assert.equal(n.pluginId,old.pluginId);
   if(n.flowNodeType==='chatNode')for(const i of n.inputs.filter(i=>i.key!=='systemPrompt'))assert.deepEqual(i,old.inputs.find(x=>x.key===i.key));
   for(const i of n.inputs)if(i.key!=='code'&&typeof i.value==='string')for(const m of i.value.matchAll(/\{\{\$([^.$]+)\.([^$]+)\$\}\}/g)){
    const target=w.nodes.find(x=>x.nodeId===m[1]);assert(target,n.name+'缺少变量节点');assert(target.outputs.some(o=>o.id===m[2]),n.name+'缺少变量输出');
   }
  }
 }
 assert.equal(outer.nodes.find(n=>n.nodeId==='ddwhzFImUXV1QTsA').pluginId,'6a96a10d67bd869e3352af48');
 assert.equal(batch.nodes.find(n=>n.nodeId==='iW8Qg5stNA8T2Qp9').pluginId,'6a991c7e2a5b103c1841ea95');
});

const datasetConfig=child.nodes.find(n=>n.nodeId==='wP0lzgeUtpvzxSHw').inputs.find(i=>i.key==='datasets').value;
fs.writeFileSync(dir+'离线检查报告.json',JSON.stringify({checks:results,check_count:results.length,online_verified:false,medical_correctness_verified:false,real_input_replay:true,five_question_success_fixture:'synthetic_for_contract_testing_only',configuration_required:datasetConfig?.length?[]:[{node:'知识库搜索',field:'知识库选择',reason:'本地导出未携带已选知识库，导入后选回用户原有知识库；不能据此删除节点'}]},null,2));
console.log(results.length+' checks passed');
