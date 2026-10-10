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
