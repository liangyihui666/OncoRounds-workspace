const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const slim=process.argv.includes('--slim');
const dir=slim?'outputs/五题流程精简-20260928/':'outputs/全链路五题修复-20260928/';
const load=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const child=load(dir+(slim?'01-出题子应用-五题精简版.json':'01-出题子应用-全链路五题修复版.json')),outer=load(dir+(slim?'02-HTML测试外层-五题精简版.json':'02-HTML测试外层-全链路五题修复版.json'));
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
const datasetConfig=child.nodes.find(n=>n.nodeId==='wP0lzgeUtpvzxSHw').inputs.find(i=>i.key==='datasets').value;
fs.writeFileSync(dir+'离线检查报告.json',JSON.stringify({checks:results,check_count:results.length,online_verified:false,medical_correctness_verified:false,real_input_replay:true,five_question_success_fixture:'synthetic_for_contract_testing_only',configuration_required:datasetConfig?.length?[]:[{node:'知识库搜索',field:'知识库选择',reason:'本地导出未携带已选知识库，导入后选回用户原有知识库；不能据此删除节点'}]},null,2));
console.log(results.length+' checks passed');
