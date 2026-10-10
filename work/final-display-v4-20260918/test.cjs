const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'outputs/最终出题-全页精简V4-20260918');
const w=JSON.parse(fs.readFileSync(path.join(out,'最终出题-全页精简V4-测试版.json'),'utf8'));
const old=JSON.parse(fs.readFileSync(path.join(__dirname,'source.json'),'utf8'));
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

test('首页与详情头部精简，题目和普通病程事实保持',()=>{
 const p=pool([q]);const reply={selected_ids:['G1_Q1'],edits:[],home_card:{display_title:'胃癌术后的诊疗评估',description:'60岁患者，有胃癌手术史，本例围绕相关诊疗问题展开。'}};
 const current=finish(p,reply).output_data;
 const prev=JSON.parse(fs.readFileSync(path.join(__dirname,'source.json'),'utf8'));
 const originalCode=prev.nodes.find(n=>n.nodeId==='jKqMCN8eJKvkngnI').inputs.find(i=>i.key==='code').value;
 const ctx=vm.createContext({input:{...packet,candidate_pool:p.candidate_pool,agent_reply:JSON.stringify(reply)}});
 vm.runInContext(originalCode+'\nresult=main(input)',ctx);
 const previous=clone(ctx.result.output_data);
 assert.equal(current.detail.home.display_title,reply.home_card.display_title);
 assert.equal(current.detail.home.description,reply.home_card.description);
 assert.deepEqual(current.Questions,previous.Questions);assert.equal(current.detail.overview.hero.title,current.detail.home.display_title);assert(current.detail.overview.hero.subtitle.length<=40);assert.deepEqual(current.detail.overview.tabs.find(t=>t.id==='images'),previous.detail.overview.tabs.find(t=>t.id==='images'));assert.deepEqual(current.detail.overview.tabs.find(t=>t.id==='timeline').timeline_items.map(t=>[t.date,t.detail]),previous.detail.overview.tabs.find(t=>t.id==='timeline').timeline_items.map(t=>[t.date,t.detail.replace(t.date+'：','')]));
 assert(JSON.parse(p.system_text).home_case_facts.case_context===packet.case_context);
});
test('首页缺失、超长、无效格式、新增年龄、含推荐动作均有短文案回退',()=>{
 const p=pool([q]);
 for(const home_card of [undefined,{display_title:'长'.repeat(23),description:'长'.repeat(61)}, {display_title:'胃癌的治疗决策',description:'99岁患者，有胃癌手术史，接受多线治疗后出现进展。'}, {display_title:'首选胃镜活检以明确诊断',description:'60岁患者，建议首先接受胃镜检查以明确诊断。'}]){
  const d=finish(p,{selected_ids:['G1_Q1'],edits:[],home_card}).output_data;
  assert(d.detail.home.display_title.length<=14);assert(d.detail.home.description.length<=48);
  assert(!d.detail.home.description.includes('99'));assert(!d.detail.home.description.includes('建议'));assert(!d.detail.home.display_title.includes('首选'));assert(!d.detail.home.description.includes('……'));
 }
});
test('全部44例首页边界检查、原文件不改写、模型调用数不变',()=>{
 const previous=JSON.parse(fs.readFileSync(path.join(__dirname,'source.json'),'utf8'));
 assert.equal(w.nodes.filter(n=>n.flowNodeType==='chatNode').length,previous.nodes.filter(n=>n.flowNodeType==='chatNode').length);
 assert.deepEqual(w.edges,previous.edges);
 const cardCode=fs.readFileSync(path.join(__dirname,'home-card.js'),'utf8');
 function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
 for(const f of walk(path.join(root,'outputs/病例JSON按癌种分类-44例')).filter(f=>f.endsWith('.json'))){
  const d=JSON.parse(fs.readFileSync(f,'utf8'));const items=d.detail.overview.tabs.find(t=>t.id==='summary').summary_items;
  const input={case_title:d.detail.home.display_title,disease:items[1].value,case_context:items[0].value,cancer_type:d.Questions.cancer_type};
  const ctx=vm.createContext({input,q:d.Questions});vm.runInContext(cardCode+'\nresult=buildHomeCard(input,q)',ctx);
  assert(ctx.result.display_title.length<=14,f);assert(ctx.result.description.length<=48,f);
 }
});


test('用户确认的短文案正常接收，旧长文案超限回退',()=>{
 const code=fs.readFileSync(path.join(__dirname,'home-card.js'),'utf8');
 const input={second_cancer_type:'乳腺癌',case_context:'40 岁女性，左侧乳腺癌术后胸壁复发伴淋巴结转移。靶向治疗 5 个月后 PET-CT 提示病灶代谢活跃，疑似疾病进展。'};
 const home_card={display_title:'乳腺癌复发后的疗效评估',description:'40岁女性，乳腺癌术后胸壁复发伴淋巴结转移，靶向治疗5个月后疑似进展。'};
 let ctx=vm.createContext({input:{...input,agent_reply:JSON.stringify({home_card})},questions:{questions:[{type:'疗效复评与局部治疗'}]}});vm.runInContext(code+'\nresult=buildHomeCard(input,questions)',ctx);
 assert.equal(ctx.result.display_title,home_card.display_title);assert.equal(ctx.result.description,home_card.description);
 ctx=vm.createContext({input:{...input,agent_reply:JSON.stringify({home_card:{display_title:'乳腺癌术后复发靶向治疗疗效评估',description:input.case_context}})},questions:{questions:[{type:'疗效复评与局部治疗'}]}});vm.runInContext(code+'\nresult=buildHomeCard(input,questions)',ctx);
 assert.equal(ctx.result.report.title_method,'deterministic_fallback');assert.equal(ctx.result.report.description_method,'deterministic_fallback');assert(ctx.result.display_title.length<=14);assert(ctx.result.description.length<=48);
});


test('长病例摘要分成四项且不再输出整段治疗史',()=>{
 const summary_card={patient:'40岁女性，乳腺癌术后出现左侧胸壁复发，本次就诊评估疗效。',findings:'左前胸壁术后改变，近中线处皮下可触及多发软组织影，邻近皮肤增厚。',course:'既往接受保乳术、化疗及放疗，后再次手术和化疗；胸壁复发后靶向治疗5个月。',focus:'当前胸壁病灶如何评价，是否提示治疗期间的病情变化？'};
 const context='患者女性，40 岁。2021-04 行左侧乳腺癌保乳术 + 腋窝淋巴结清扫术；2021-05 至 2021-09 行化疗；2021-10 至 2021-11 行左乳放疗。2022-11 因病情进展行左乳全切术；2022-12 至 2023-05 再次化疗。2023-08 发现左侧胸壁复发，遂行靶向治疗至今共 5 个月。本次为评估靶向治疗效果行 PET-CT 检查。既往有双侧上颌窦及筛窦炎症史。体格检查示左前胸壁术后改变，近中线处皮下可触及多发软组织影，邻近皮肤增厚。';
 const r=finish(pool([q]),{selected_ids:['G1_Q1'],edits:[],summary_card},{case_context:context,disease:'乳腺癌术后胸壁复发',second_cancer_type:'乳腺癌'});
 const items=r.output_data.detail.overview.tabs.find(t=>t.id==='summary').summary_items;
 assert.equal(items.length,4);assert.deepEqual(items.map(t=>t.value),Object.values(summary_card));assert(items.every(t=>t.value.length<=50));assert(items.every(t=>!t.value.includes('鼻窦')));
 assert(r.selection_report.summary_card.every(x=>x.method==='model_brief'));
});
test('摘要异常或超长时回退完整短句，不影响已有题目引用',()=>{
 for(const summary_card of [undefined, {patient:'长'.repeat(100),findings:'99岁患者，胃癌确诊。',course:'建议首选手术治疗。',focus:'长'.repeat(100)}]){
  const r=finish(pool([q]),{selected_ids:['G1_Q1'],edits:[],summary_card});const items=r.output_data.detail.overview.tabs.find(t=>t.id==='summary').summary_items;
  assert(items.length>=1&&items.length<=4);assert(items.every(t=>t.value.length<=50&&!/99|建议|……/.test(t.value)));assert.deepEqual(r.output_data.Questions.questions[0].guidelineRef,q.guidelineRef);
 }
});


test('数组、JSON字符串及二次编码病程都按实际事件拆分',()=>{
 const code=fs.readFileSync(path.join(__dirname,'display.js'),'utf8');
 const list=['2022.02.23: 穿刺确诊浸润性癌，ER(-)，Her2(3+)。','2022.02.28-2022.07.27: 新辅助化疗AC*4序贯THP*4。','2022.08.12: 手术，非pCR，LN 2/15。','术后3个月：复查结果待回报。'];
 for(const input of [list,JSON.stringify(list),JSON.stringify(JSON.stringify(list)),list.join(';')]){
  const ctx=vm.createContext({input});vm.runInContext(code+'\nresult=buildDisplayTimeline(input,{})',ctx);const r=clone(ctx.result);
  assert.equal(r.length,4);assert.equal(r[1].date,'2022.02.28-2022.07.27');assert.equal(r[3].date,'术后3个月');assert(r.every(x=>!/[\[\]{}]/.test(x.detail)));assert(r[2].detail.includes('非pCR'));assert(r[2].detail.includes('2/15'));
 }
 const ctx=vm.createContext({input:'治疗效果及进一步方案待病理结果回报后制定。'});vm.runInContext(code+'\nresult=buildDisplayTimeline(input,{})',ctx);assert.equal(ctx.result[0].date,'时间未详');
});
test('病例变量中的数组转为换行文本，上下游病程ID一致',()=>{
 const raw={case_title:'测试病例',disease:'乳腺癌',second_cancer_type:'乳腺癌',case_context:['40岁女性。','乳腺癌术后复发。'],case_timeline:['2022.02.23：病理确诊。','2023.08：胸壁复发。'],learning_points_candidate:['分期评估','疗效复评']};
 const r=run('ogy1PAMdD268kXeo',{case_json:JSON.stringify(raw)});
 assert.equal(r.case_timeline,'2022.02.23：病理确诊。\n2023.08：胸壁复发。');assert.equal(r.learning_points,'分期评估\n疗效复评');
 const p=run('bJcPjyWI8hiwuVOS',{group1:JSON.stringify({questions:[q]}),case_packet:r.production_variables});const model=JSON.parse(p.system_text);assert.equal(model.timeline_sources.length,2);assert.equal(model.timeline_sources[1].source_id,'E2');
});
test('病程编辑不得更改日期、数字、阴阳性，长事件按完整分句保留',()=>{
 const code=fs.readFileSync(path.join(__dirname,'display.js'),'utf8');
 const input='2024.03：检查结果提示HER2阳性，疑似进展。';
 for(const edit of [{source_id:'E1',title:'复查评估',detail:'检查结果提示HER2阴性，已进展。'},{source_id:'E1',date:'2025.03',title:'复查评估',detail:'检查结果提示HER2阳性，疑似进展。'}]){
  const ctx=vm.createContext({input,reply:{timeline_edits:[edit]}});vm.runInContext(code+'\nresult=buildDisplayTimeline(input,reply)',ctx);assert.equal(ctx.result[0].detail,'检查结果提示HER2阳性，疑似进展。');assert.equal(ctx.result[0].date,'2024.03');
 }
 const long='2024.03：'+('复查影像未见明确进展，继续观察并记录病情变化。'.repeat(6));
 const ctx=vm.createContext({input:long});vm.runInContext(code+'\nresult=buildDisplayTimeline(input,{})',ctx);assert(ctx.result.length>1);assert.equal(ctx.result.map(x=>x.detail).join(''),long.split('：')[1]);assert(ctx.result.every(x=>x.detail.length<=90));
});

const sample=pool(records[0].original_questions);
const report={tests:results,passed:results.filter(t=>t.status==='PASS').length,failed:results.filter(t=>t.status==='FAIL').length,app_calls_before:1,app_calls_after:1,editor_input_sample_chars:sample.system_text.length,full_candidate_pool_sample_chars:JSON.stringify(sample.candidate_pool).length,online_tested:false};
fs.writeFileSync(path.join(out,'离线校验报告.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(report.failed)process.exit(1);
