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
 for(const n of reversed.nodes){const b=base.nodes.find(b=>b.nodeId===n.nodeId);n.inputs=b.inputs;if(n.nodeId==='v12RevisionInput')n.catchError=b.catchError;}
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
