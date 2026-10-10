const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'outputs/三连首页短文案版-20260918');
const w=JSON.parse(fs.readFileSync(path.join(out,'三连-单次出题-首页短文案-测试版.json'),'utf8'));
const old=JSON.parse(fs.readFileSync(path.join(root,'work/single-call-20260917/source.json'),'utf8'));
const nodes=new Map(w.nodes.map(n=>[n.nodeId,n])),results=[];
const clone=v=>JSON.parse(JSON.stringify(v));
const get=(id,k)=>nodes.get(id).inputs.find(i=>i.key===k).value;
function run(id,input){const n=nodes.get(id);const inp=Object.fromEntries(n.inputs.filter(i=>i.canEdit).map(i=>[i.key,input[i.key]]));const ctx=vm.createContext({input:inp});vm.runInContext(get(id,'code')+'\nresult=main(input)',ctx,{timeout:5000});return clone(ctx.result);}
function test(name,fn){try{fn();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',error:e.stack});}}
const records=JSON.parse(fs.readFileSync(path.join(root,'work/detail-edit/original-guidelines-recovery-inventory.json'),'utf8'));
const q=clone(records[0].original_questions[0]);
const packet={case_id:'CASE-TEST',case_title:'测试病例',disease:'原发性胃癌伴肝转移',case_context:'60岁患者，既往有胃癌手术史。',case_timeline:'初诊时：病理明确；术后3个月：复查病灶变化。',second_cancer_type:'胃癌',learning_points:'治疗选择与复评',biomarkers:'HER2检测结果未提供'};
function pool(questions,extra={}){return run('bJcPjyWI8hiwuVOS',{group1:JSON.stringify({generation_status:questions.length?'success':'insufficient',question_count:questions.length,questions,missing_information:questions.length?[]:['本轮没有可用检索证据']}),case_packet:packet,...extra});}
function finish(p,reply,extra={}){return run('jKqMCN8eJKvkngnI',{...packet,candidate_pool:p.candidate_pool,agent_reply:typeof reply==='string'?reply:JSON.stringify(reply),...extra});}
test('全部代码节点可编译，现有工具输入输出引用可定位',()=>{
 const ids=new Set(nodes.keys());const globals=new Set(w.chatConfig.variables.map(x=>x.key));globals.add('histories');
 for(const n of nodes.values()){
  if(n.flowNodeType==='code')new vm.Script(get(n.nodeId,'code'));
  for(const i of n.inputs){const v=i.value;if(i.selectedType==='reference'&&Array.isArray(v)&&v.length===2&&typeof v[0]==='string'){
   if(v[0]==='VARIABLE_NODE_ID')assert(globals.has(v[1]),n.name+' global '+v[1]);
   else {assert(ids.has(v[0]),n.name+' source '+v[0]);assert(nodes.get(v[0]).outputs.some(o=>o.id===v[1]),n.name+' output '+v[1]);}
  }}
 }
 for(const e of w.edges){assert(ids.has(e.source));assert(ids.has(e.target));}
 assert(!JSON.stringify(w).includes('lhHp2keNSraloevA'));assert(!JSON.stringify(w).includes('mDQGMnWR0QYZZCJ4'));
});
test('仅一次子工作流调用，应用绑定与版本保持原样',()=>{
 const apps=w.nodes.filter(n=>n.flowNodeType==='appModule');assert.equal(apps.length,1);
 const a=clone(apps[0]),b=clone(old.nodes.find(n=>n.nodeId===a.nodeId));for(const x of [a,b]){delete x.inputs;delete x.intro;}assert.deepEqual(a,b);
 assert.deepEqual(get(a.nodeId,'yyhLw3hG'),['ogy1PAMdD268kXeo','nZ569o']);
 assert.equal(get('ltrYX3w0AXTIiF0r','maxToken'),4096);assert.equal(get('ltrYX3w0AXTIiF0r','aiChatReasoning'),false);
});
test('零题直接旁路终稿模型，保留不足原因和空detail',()=>{
 const p=pool([]);assert.equal(p.has_candidates,false);assert.equal(p.candidate_pool.groups.length,1);
 const d=finish(p,undefined).output_data;assert.equal(d.Questions.question_count,0);assert.equal(d.Questions.generation_status,'insufficient');assert.deepEqual(d.detail,{});assert(d.Questions.missing_information.some(x=>x.includes('检索证据')));
 assert(w.edges.some(e=>e.source==='singleEditorialGate20260917'&&e.sourceHandle.endsWith('ELSE')&&e.target==='jKqMCN8eJKvkngnI'));
});
test('单次调用失败或回复截断均不回收旧草稿',()=>{
 for(const input of [{group1:'',group1_error:'timeout'}, {group1:'{"generation_status":"success","questions":['}]){
  const p=run('bJcPjyWI8hiwuVOS',{...input,case_packet:packet});assert.equal(p.has_candidates,false);assert.equal(finish(p,'broken').output_data.Questions.question_count,0);
 }
});
test('1至5题均保留，答案映射与指南原文一致，六类分类、隐藏二级及图片空数组',()=>{
 for(let n=1;n<=5;n++){
  const qs=records[0].original_questions.slice(0,n);const p=pool(qs);const ids=p.candidate_pool.candidates.map(c=>c.candidate_id);
  const d=finish(p,{selected_ids:ids,edits:[]}).output_data;
  assert.equal(d.Questions.question_count,n);assert.equal(d.detail.decision_point_count,n);
  assert.equal(d.Questions.cancer_type,'胃癌');assert(!('second_cancer_type' in d.Questions));assert(!('second_cancer_type' in d.detail));
  assert.deepEqual(d.detail.overview.tabs.find(t=>t.id==='images').image_items,[]);assert.equal(d.detail.image.src,'');
  d.Questions.questions.forEach((x,i)=>{assert.equal(x.answer_text,x.options[x.answer]);assert.deepEqual(x.guidelineRef,qs[i].guidelineRef);assert.equal(x.question,qs[i].question);});
 }
});
test('完全重复去重；终选错误ID、无JSON、空回复均回退原题',()=>{
 const p=pool([q,{...q,id:'Q2'}]);for(const reply of ['', 'invalid', {selected_ids:['MISSING'],edits:[]}]){
  const d=finish(p,reply);assert.equal(d.output_data.Questions.question_count,1);assert.equal(d.output_data.Questions.questions[0].question,q.question);assert.equal(d.selection_report.selection_method,'deterministic_fallback');
 }
});
test('表达编辑可以生效，但绝不改写引用；审核作用范围标记为编辑前原题',()=>{
 const p=pool([q]);const stem=q.question.replace('？','，请选择最合适的一项？');
 const d=finish(p,{selected_ids:['G1_Q1'],edits:[{candidate_id:'G1_Q1',question:stem}]});
 assert.equal(d.output_data.Questions.questions[0].question,stem);assert.deepEqual(d.output_data.Questions.questions[0].guidelineRef,q.guidelineRef);
 assert.equal(d.selection_report.medical_approval_confirmed,false);assert.equal(d.selection_report.selected[0].audit_scope,'original_before_editorial_not_revalidated');
});
test('伪造指南、答案、数字、阴阳性或过度删减的补丁被拒绝',()=>{
 for(const edit of [{guidelineRef:{source_url:'https://example.com'}},{answer:'A'},{question:q.question+'增加99 mg。'},{question:q.question+'阳性。'},{question:'怎么办？'}]){
  const d=finish(pool([q]),{selected_ids:['G1_Q1'],edits:[{candidate_id:'G1_Q1',...edit}]});
  assert.equal(d.output_data.Questions.questions[0].question,q.question);assert.deepEqual(d.output_data.Questions.questions[0].guidelineRef,q.guidelineRef);assert(d.selection_report.editorial.rejected.length>0);
 }
});
test('补丁失败不影响原题，模型无法打乱原始题序',()=>{
 const p=pool(records[0].original_questions);const ids=p.candidate_pool.candidates.map(c=>c.candidate_id).reverse();
 const d=finish(p,{selected_ids:ids,edits:[]});assert.deepEqual(d.output_data.Questions.questions.map(q=>q.question),records[0].original_questions.map(q=>q.question));
});
test('缺口与部分题目并存；相对时间阶段保留',()=>{
 const raw={generation_status:'success',question_count:1,questions:[q],missing_information:['长期结局未提供']};
 const p=run('bJcPjyWI8hiwuVOS',{case_packet:packet,group1:JSON.stringify(raw)});const d=finish(p,{selected_ids:['G1_Q1'],edits:[]}).output_data;
 assert(d.Questions.missing_information.includes('长期结局未提供'));assert.deepEqual(d.detail.overview.tabs.find(t=>t.id==='timeline').timeline_items.map(t=>t.date),['初诊时','术后3个月']);
});
test('格式修复保留evidence_notes；展示字段不混入分工提示词',()=>{
 const note='原文未提供毒性分级；专家观点不属于患者事实。';const r=run('d4esByk5Pccmn1gH',{raw_json:JSON.stringify({case_title:'测试病例',disease:'胃癌',evidence_notes:note,second_cancer_type:'胃癌'})});assert.equal(r.repaired_data.evidence_notes,note);
 const p=run('ogy1PAMdD268kXeo',{case_json:r.repaired_json});assert.equal(p.cancer_type,'胃癌');assert.equal(p.learning_points,'');assert(!p.production_variables.learning_points.includes('本次单组'));
});
test('44例220道现有工作流原题走单组终稿链，原始引用逐题保留',()=>{
 let total=0;
 for(const row of records){const p=pool(row.original_questions);const d=finish(p,{selected_ids:p.candidate_pool.candidates.map(c=>c.candidate_id),edits:[]}).output_data;
  assert.equal(d.Questions.question_count,5,row.case_id);d.Questions.questions.forEach((q,i)=>assert.deepEqual(q.guidelineRef,row.original_questions[i].guidelineRef));total+=d.Questions.question_count;
 }assert.equal(total,220);
});

test('首页短文案正确写入，完整详情和题目与上一版相同',()=>{
 const p=pool([q]);const reply={selected_ids:['G1_Q1'],edits:[],home_card:{display_title:'胃癌术后的诊疗评估',description:'60岁患者，有胃癌手术史，本例围绕相关诊疗问题展开。'}};
 const current=finish(p,reply).output_data;
 const prev=JSON.parse(fs.readFileSync(path.join(root,'outputs/三连单次调用优化版-20260917/三连-单次出题与终稿优化-测试版.json'),'utf8'));
 const originalCode=prev.nodes.find(n=>n.nodeId==='jKqMCN8eJKvkngnI').inputs.find(i=>i.key==='code').value;
 const ctx=vm.createContext({input:{...packet,candidate_pool:p.candidate_pool,agent_reply:JSON.stringify(reply)}});
 vm.runInContext(originalCode+'\nresult=main(input)',ctx);
 const previous=clone(ctx.result.output_data);
 assert.equal(current.detail.home.display_title,reply.home_card.display_title);
 assert.equal(current.detail.home.description,reply.home_card.description);
 assert.deepEqual(current.Questions,previous.Questions);assert.deepEqual(current.detail.overview,previous.detail.overview);
 assert(JSON.parse(p.system_text).home_case_facts.case_context===packet.case_context);
});
test('首页缺失、超长、无效格式、新增年龄、含推荐动作均有短文案回退',()=>{
 const p=pool([q]);
 for(const home_card of [undefined,{display_title:'长'.repeat(23),description:'长'.repeat(61)}, {display_title:'胃癌的治疗决策',description:'99岁患者，有胃癌手术史，接受多线治疗后出现进展。'}, {display_title:'首选胃镜活检以明确诊断',description:'60岁患者，建议首先接受胃镜检查以明确诊断。'}]){
  const d=finish(p,{selected_ids:['G1_Q1'],edits:[],home_card}).output_data;
  assert(d.detail.home.display_title.length<=22);assert(d.detail.home.description.length<=60);
  assert(!d.detail.home.description.includes('99'));assert(!d.detail.home.description.includes('建议'));assert(!d.detail.home.display_title.includes('首选'));assert(!d.detail.home.description.includes('……'));
 }
});
test('全部44例首页边界检查、原文件不改写、模型调用数不变',()=>{
 const previous=JSON.parse(fs.readFileSync(path.join(root,'outputs/三连单次调用优化版-20260917/三连-单次出题与终稿优化-测试版.json'),'utf8'));
 assert.equal(w.nodes.filter(n=>n.flowNodeType==='chatNode').length,previous.nodes.filter(n=>n.flowNodeType==='chatNode').length);
 assert.deepEqual(w.edges,previous.edges);
 const cardCode=fs.readFileSync(path.join(__dirname,'home-card.js'),'utf8');
 function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
 for(const f of walk(path.join(root,'outputs/病例JSON按癌种分类-44例')).filter(f=>f.endsWith('.json'))){
  const d=JSON.parse(fs.readFileSync(f,'utf8'));const items=d.detail.overview.tabs.find(t=>t.id==='summary').summary_items;
  const input={case_title:d.detail.home.display_title,disease:items[1].value,case_context:items[0].value,cancer_type:d.Questions.cancer_type};
  const ctx=vm.createContext({input,q:d.Questions});vm.runInContext(cardCode+'\nresult=buildHomeCard(input,q)',ctx);
  assert(ctx.result.display_title.length<=22,f);assert(ctx.result.description.length<=60,f);
 }
});

const sample=pool(records[0].original_questions);
const report={tests:results,passed:results.filter(t=>t.status==='PASS').length,failed:results.filter(t=>t.status==='FAIL').length,app_calls_before:3,app_calls_after:1,editor_input_sample_chars:sample.system_text.length,full_candidate_pool_sample_chars:JSON.stringify(sample.candidate_pool).length,online_tested:false};
fs.writeFileSync(path.join(out,'离线校验报告.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(report.failed)process.exit(1);
