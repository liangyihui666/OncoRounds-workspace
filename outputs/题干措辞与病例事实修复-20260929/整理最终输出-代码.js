function teachingErrors(q) {
 const errors=[];
 const rows=typeof q.explain==='string'?q.explain.trim().split(/\r?\n/).filter(s=>s.trim()):[];
 const answer=typeof q.answer==='number'?q.answer:['A','B','C','D'].indexOf(q.answer);
 if(rows.length!==4) errors.push('解析必须恰好四行，按A/B/C/D逐项解释');
 for(let i=0;i<4;i++){
   const letter='ABCD'[i], row=rows[i]||'';
   const match=row.match(/^([A-D])｜(正确|不正确)：(.+)$/);
   if(!match||match[1]!==letter||match[2]!== (i===answer?'正确':'不正确')||!match[3].trim()) errors.push(letter+'解析缺失、格式错误或与答案不一致');
 }
 if(typeof q.explain==='string'&&q.explain.length>800)errors.push('逐项解析超过800字');
 if(/^【延伸情境】/.test(q.question||'')&&!/假设|若后续/.test(q.question))errors.push('延伸题须明确标注假设条件');
 return errors;
}
const TUMOR_DISPLAY_MAP = {"乳腺叶状肿瘤": "胸部肿瘤", "乳腺癌": "胸部肿瘤", "乳腺肉瘤": "胸部肿瘤", "儿童心脏肿瘤": "", "儿童早期肿瘤": "", "儿童星形细胞瘤": "", "儿童横纹肌肉瘤": "", "儿童罕见癌症": "", "儿童血管瘤": "", "儿童颅咽管瘤": "", "原位导管癌": "", "原发灶不明的转移癌": "", "复发性癌症": "", "恶性间皮瘤": "", "未知原发性癌症": "", "纵隔肿瘤": "", "转移性肿瘤": "", "青少年癌症": "", "气管支气管瘤": "胸部肿瘤", "胸腺瘤": "胸部肿瘤", "胸膜间皮瘤": "胸部肿瘤", "上呼吸消化道恶性黑色素瘤": "头颈部肿瘤", "下咽癌": "头颈部肿瘤", "口咽癌": "头颈部肿瘤", "唇和口腔癌": "头颈部肿瘤", "唾液腺癌": "头颈部肿瘤", "喉癌": "头颈部肿瘤", "头颈部皮肤癌": "头颈部肿瘤", "头颈部鳞癌": "头颈部肿瘤", "扁桃体恶性肿瘤": "头颈部肿瘤", "甲状腺癌": "头颈部肿瘤", "耳部恶性肿瘤": "头颈部肿瘤", "隐性原发转移的鳞状颈癌": "头颈部肿瘤", "颌骨恶性肿瘤": "头颈部肿瘤", "鼻咽癌": "头颈部肿瘤", "鼻腔和（副）鼻窦癌症": "头颈部肿瘤", "心包肿瘤": "", "心脏肿瘤": "", "尿路上皮癌": "泌尿系肿瘤", "尿道癌": "泌尿系肿瘤", "肾盂和输尿管移行细胞癌": "泌尿系肿瘤", "肾细胞癌": "泌尿系肿瘤", "膀胱癌": "泌尿系肿瘤", "Vater壶腹癌": "消化系统肿瘤", "壶腹周围癌": "消化系统肿瘤", "大肠癌": "消化系统肿瘤", "小肠癌": "消化系统肿瘤", "直肠癌": "消化系统肿瘤", "结直肠癌": "消化系统肿瘤", "结肠癌": "消化系统肿瘤", "肛周皮肤癌": "消化系统肿瘤", "肛管肿瘤": "消化系统肿瘤", "肛门肿瘤": "消化系统肿瘤", "肝癌": "消化系统肿瘤", "胃癌": "消化系统肿瘤", "胆道恶性肿瘤": "消化系统肿瘤", "胰腺癌": "消化系统肿瘤", "阑尾肿瘤": "消化系统肿瘤", "食管癌": "消化系统肿瘤", "食管胃交界处肿瘤": "消化系统肿瘤", "前列腺癌": "泌尿系肿瘤", "卵巢癌": "妇科肿瘤", "外阴癌": "妇科肿瘤", "子宫内膜癌": "妇科肿瘤", "宫颈癌": "妇科肿瘤", "性腺外生殖细胞肿瘤": "", "滋养细胞肿瘤": "妇科肿瘤", "睾丸癌": "泌尿系肿瘤", "纵隔生殖细胞瘤": "", "胎盘恶性肿瘤": "妇科肿瘤", "输卵管癌": "妇科肿瘤", "阴茎癌": "泌尿系肿瘤", "阴道癌": "妇科肿瘤", "颅外生殖细胞肿瘤": "", "乳头状瘤病": "皮肤肿瘤", "皮肤基底细胞癌": "皮肤肿瘤", "皮肤鳞状细胞癌": "皮肤肿瘤", "蕈样肉芽肿": "皮肤肿瘤", "黑色素瘤": "皮肤肿瘤", "默克尔细胞癌": "皮肤肿瘤", "泪腺癌": "眼部肿瘤", "眼内黑色素瘤": "眼部肿瘤", "眼眶肉瘤": "眼部肿瘤", "眼睑癌": "眼部肿瘤", "结膜癌": "眼部肿瘤", "结膜黑色素瘤": "眼部肿瘤", "视网膜母细胞瘤": "眼部肿瘤", "副神经节瘤": "神经内分泌肿瘤", "十二指肠和Vater壶腹神经内分泌肿瘤": "神经内分泌肿瘤", "嗜铬细胞瘤": "神经内分泌肿瘤", "垂体瘤": "神经内分泌肿瘤", "多发性内分泌肿瘤综合征": "神经内分泌肿瘤", "梅克尔细胞癌": "神经内分泌肿瘤", "甲状旁腺癌": "神经内分泌肿瘤", "神经母细胞瘤": "神经内分泌肿瘤", "空肠回肠神经内分泌肿瘤": "神经内分泌肿瘤", "结肠、直肠神经内分泌肿瘤": "神经内分泌肿瘤", "肾上腺皮质癌": "神经内分泌肿瘤", "肾上腺神经内分泌肿瘤": "神经内分泌肿瘤", "胃神经内分泌肿瘤": "神经内分泌肿瘤", "胰腺神经内分泌肿瘤": "神经内分泌肿瘤", "阑尾神经内分泌肿瘤": "神经内分泌肿瘤", "非典型畸胎瘤": "神经内分泌肿瘤", "肺癌": "胸部肿瘤", "室管膜瘤": "头颈部肿瘤", "神经纤维瘤": "头颈部肿瘤", "脑干胶质瘤": "头颈部肿瘤", "脑胶质瘤": "头颈部肿瘤", "脑膜瘤": "头颈部肿瘤", "髓母细胞瘤": "头颈部肿瘤", "原发性腹膜癌": "", "腹膜间皮瘤": "", "多发性骨髓瘤": "血液肿瘤", "恶性免疫增生性疾病": "血液肿瘤", "慢性骨髓增殖性肿瘤": "血液肿瘤", "淋巴瘤": "血液肿瘤", "白血病": "血液肿瘤", "组织细胞增多症": "血液肿瘤", "骨髓增殖性肿瘤": "血液肿瘤", "骨髓增生异常综合征": "血液肿瘤", "卡波西肉瘤": "骨与软组织肿瘤", "四肢和躯干软组织肉瘤": "骨与软组织肿瘤", "胃肠道间质瘤": "骨与软组织肿瘤", "腹膜后软组织肉瘤": "骨与软组织肿瘤", "腹部和胸腔内脏器官软组织肉瘤": "骨与软组织肿瘤", "血管瘤": "骨与软组织肿瘤", "尤文氏肉瘤": "骨与软组织肿瘤", "恶性骨巨细胞瘤": "骨与软组织肿瘤", "未分化多形性肉瘤": "骨与软组织肿瘤", "脊索瘤": "骨与软组织肿瘤", "软骨肉瘤": "骨与软组织肿瘤", "骨肉瘤": "骨与软组织肿瘤"};

function classifyTumor(value) {
  const second = typeof value === 'string' ? value.trim() : '';
  if (!second || !Object.prototype.hasOwnProperty.call(TUMOR_DISPLAY_MAP, second))
    return { cancer_type:'', second_cancer_type:'', taxonomy_warnings:[second ? '二级癌种不在CSV字典：'+second : '未确定原发肿瘤对应的二级癌种'] };
  const first = TUMOR_DISPLAY_MAP[second];
  return { cancer_type:first, second_cancer_type:second, taxonomy_warnings:first ? [] : ['二级癌种已确定，但一级归属尚未确认：'+second] };
}
function main(inputs) {
 const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch(_){return null;}};
 const arr=v=>Array.isArray(v)?v:[];
 const c=classifyTumor(inputs.second_cancer_type);
 const p=parse(inputs.candidate_json);
 const errors=arr(inputs.structure_errors).slice();
 if(inputs.structure_decision!=='PASS' && inputs.structure_decision!=='INSUFFICIENT' && !errors.length) errors.push('第二轮程序检查未通过');
 if(!p || p.schema_version!=='1.1' || !Array.isArray(p.questions)) errors.push('第二轮未返回有效完整题目JSON');
 if(p?.questions?.some(q=>!q||teachingErrors(q).length))errors.push('逐项解析或延伸标记格式错误');
 const valid=errors.length===0;
 const count=Array.isArray(p?.questions)?p.questions.length:0;
 const ready=valid && inputs.structure_decision==='PASS' && count===5;
 const partial=valid && inputs.structure_decision==='PASS' && count>0 && count<5;
 const missing=[...new Set([...arr(p?.missing_information),...errors].filter(s=>typeof s==='string'&&s.trim()))];
 if(partial) missing.push('五题任务未完成：程序有效草稿'+count+'题，仍缺'+(5-count)+'题；不是已完成题组');
 const selected=ready?{...p,cancer_type:c.cancer_type,second_cancer_type:c.second_cancer_type}:{
  schema_version:'1.1',generation_status:'insufficient',case_summary:typeof p?.case_summary==='string'?p.case_summary:'',
  difficulty:'进阶',question_count:0,questions:[],missing_information:missing.length?missing:['没有形成可用题目'],
  risk_message:valid?'当前证据不足以形成题目':'第二轮输出未通过程序检查，请查看具体错误',cancer_type:c.cancer_type,second_cancer_type:c.second_cancer_type
 };
 const check={scope:'program_structure_and_reference_identity_only',decision:valid?'PASS':'FAIL',errors,warnings:arr(inputs.structure_warnings)};
 const result={status:ready?'OUTPUT_READY':partial?'INCOMPLETE_QUESTION_SET':valid?'STOP_INSUFFICIENT':'FORMAT_ERROR',output_ready:ready,
  publishable:false,final_response_json:JSON.stringify(selected),final_questions_json:ready?JSON.stringify(selected):'',
  missing_information:JSON.stringify(selected.missing_information||[]),round_count:2};
 const cited=parse(inputs.cited_evidence);
 const evidenceRecords=arr(parse(inputs.evidence_pool)?.records);
 const questionBindings=arr(p?.questions).map(q=>{
   const ref=q?.guidelineRef;
   const matches=ref?evidenceRecords.filter(r=>r.doc_id===ref.doc_id&&String(r.split_index)===String(ref.split_index)):[];
   return {question_id:q?.id||'',evidence_id:matches.length===1?matches[0].evidence_id:null,
     doc_id:ref?.doc_id||'',split_index:ref?.split_index??null,matching_record_count:matches.length};
 });
 const usedIds=new Set(questionBindings.filter(b=>b.matching_record_count===1).map(b=>b.evidence_id));
 const evidenceSnapshot=evidenceRecords.filter(r=>usedIds.has(r.evidence_id)).map(r=>({
   evidence_id:r.evidence_id,doc_id:r.doc_id,split_index:r.split_index,type:r.type,authority:r.authority,
   source_title:r.source_title,source_version:r.source_version,source_section:r.source_section,source_url:r.source_url,
   snippet:typeof r.raw_snippet==='string'&&r.raw_snippet.trim()?r.raw_snippet:r.snippet,
   hard_evidence_type:r.hard_evidence_type,reasoning_eligible:r.reasoning_eligible
 }));
 const envelope={record_type:'oncorounds_final',transport_version:'1.0',workflow_revision:'20260929-wording-facts-five',
  case_id:String(inputs.case_id||''),case_title:String(inputs.case_title||''),disease:String(inputs.disease||''),
  cancer_type:c.cancer_type,second_cancer_type:c.second_cancer_type,...result,
  medical_review_status:'not_performed',program_check:check,
  completion:{required_question_count:5,available_question_count:valid?count:0,model_question_count:count,complete:ready},
  diagnostics:{scope:'debug_only_not_learner_content',question_evidence_bindings:questionBindings,cited_evidence_snapshot:evidenceSnapshot,retrieval_queries:{staging:inputs.query_staging||'',molecular:inputs.query_molecular||'',treatment:inputs.query_treatment||'',study:inputs.query_study||'',toxicity_a:inputs.query_toxicity_a||'',toxicity_b:inputs.query_toxicity_b||''},
    retrieval_health:parse(inputs.evidence_pool)?.retrieval_health||null,compression_report:parse(inputs.evidence_pool)?.compression_report||null,
    second_round_raw:ready?'':String(inputs.second_round_raw||''),partial_draft_questions:partial?p.questions:[]},
  selected_candidate_round:ready?2:null,audit_applies_to_selected_candidate:false,selected_candidate_audit:null,
  selected_evidence_context:{round:ready?2:null,returned_candidate_binding:ready&&Array.isArray(cited),records:ready?arr(cited):[]},
  fallback_reason:'',taxonomy_warnings:c.taxonomy_warnings,
  notice:'题目经过第二轮模型修订和程序检查，未执行独立医学审核；publishable仅为旧版医学审核标志，内容可用性请读取output_ready。'};
 return {...result,program_check_json:JSON.stringify(check),publication_payload_json:JSON.stringify(envelope)};
}