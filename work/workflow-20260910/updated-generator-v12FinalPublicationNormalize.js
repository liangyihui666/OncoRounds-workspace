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
  const classification=classifyTumor(inputs.second_cancer_type);
  const diagnostics=[];
  function candidate(value,round) {
    const p=parse(value);
    if(!p || p.schema_version!=='1.1' || !Array.isArray(p.questions)) {
      diagnostics.push({round,reason:'CANDIDATE_PARSE_OR_SCHEMA_ERROR'});return null;
    }
    const rejected=[];
    const questions=p.questions.filter((q,i)=>{
      const valid=q && typeof q==='object' && ['id','type','phase','timepoint','question','answer_text','explain','keyPoint'].every(k=>typeof q[k]==='string'&&q[k].trim()) &&
        Array.isArray(q.options)&&q.options.length===4&&q.options.every(s=>typeof s==='string'&&s.trim())&&new Set(q.options.map(s=>s.trim())).size===4 &&
        Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4&&q.answer_text===q.options[q.answer] && q.guidelineRef && typeof q.guidelineRef==='object';
      if(!valid) rejected.push(i+1); return valid;
    }).slice(0,5);
    if(rejected.length) diagnostics.push({round,reason:'INVALID_QUESTION_STRUCTURE',positions:rejected});
    return {...p,generation_status:questions.length?'success':'insufficient',questions,question_count:questions.length,
      cancer_type:classification.cancer_type,second_cancer_type:classification.second_cancer_type};
  }
  const r1=candidate(inputs.r1_candidate,1);
  const attempted=Boolean(inputs.r2_patch_decision||inputs.r2_decision||inputs.r2_candidate||inputs.r2_feedback);
  const r2=attempted?candidate(inputs.r2_candidate,2):null;
  const f2=parse(inputs.r2_feedback);
  const patchFailed=inputs.r2_patch_decision==='FAIL'||f2?.patch_merge_decision==='FAIL';
  let selected=null,round=null,fallback_reason='';
  if(r2?.questions.length && !patchFailed) { selected=r2; round=2; }
  else if(r1?.questions.length) { selected=r1; round=1; if(attempted) fallback_reason=patchFailed?'第二轮修订合并失败，保留首轮实际题目':'第二轮未形成有效题目，保留首轮实际题目'; }
  const reasons=[...new Set([...(arr(r1?.missing_information)),...(arr(r2?.missing_information)),
    ...arr(parse(inputs.r1_missing)),...arr(parse(inputs.r2_missing))].filter(s=>typeof s==='string'&&s.trim()))];
  if(!selected) selected={schema_version:'1.1',generation_status:'insufficient',case_summary:r2?.case_summary||r1?.case_summary||'',
    difficulty:'进阶',question_count:0,questions:[],missing_information:reasons.length?reasons:['两轮均未形成结构有效的题目；请查看上游解析、检索与审核记录'],
    risk_message:'未生成可输出题目',cancer_type:classification.cancer_type,second_cancer_type:classification.second_cancer_type};
  const output_ready=selected.questions.length>0;
  const reviewRound=round || (attempted?2:1);
  const feedback=String(inputs['r'+reviewRound+'_feedback']||'');
  const f=parse(feedback);
  const rawDecision=inputs['r'+reviewRound+'_decision'];
  const decision=['PASS','REVISE','STOP_INSUFFICIENT'].includes(rawDecision)?rawDecision:'REVISE';
  const rawScore=inputs['r'+reviewRound+'_score'];
  const score=typeof rawScore==='number'&&Number.isInteger(rawScore)&&rawScore>=0&&rawScore<=100?rawScore:0;
  const auditBound=round!==null && f?.round===round && f?.medical_auditable===true && f?.patch_merge_decision!=='FAIL';
  const selectedAudit=auditBound?{...f,returned_candidate_binding:true,scope:'selected_candidate_round'}:null;
  const cited=round?parse(inputs['r'+round+'_cited_evidence']):null;
  const result={status:output_ready?'OUTPUT_READY':'STOP_INSUFFICIENT',output_ready,
    publishable:output_ready&&auditBound&&decision==='PASS'&&inputs['r'+round+'_publishable']===true,
    final_response_json:JSON.stringify(selected),final_questions_json:output_ready?JSON.stringify(selected):'',
    validation_decision:decision,validation_score:score,validation_feedback:feedback,
    missing_information:JSON.stringify(selected.missing_information||[]),round_count:attempted?2:1};
  const envelope={record_type:'oncorounds_final',transport_version:'1.0',workflow_revision:'20260910-two-level-test',
    case_id:String(inputs.case_id||''),case_title:String(inputs.case_title||''),disease:String(inputs.disease||''),
    cancer_type:classification.cancer_type,second_cancer_type:classification.second_cancer_type,...result,
    selected_candidate_round:round,audit_applies_to_selected_candidate:auditBound,selected_candidate_audit:selectedAudit,
    selected_evidence_context:{round,returned_candidate_binding:round!==null&&Array.isArray(cited),records:arr(cited)},
    fallback_reason,taxonomy_warnings:classification.taxonomy_warnings,upstream_diagnostics:diagnostics,
    round_audits:[{round:1,decision:inputs.r1_decision||'',feedback:parse(inputs.r1_feedback)},
      {round:2,decision:inputs.r2_decision||'',feedback:f2,patch_merge_decision:inputs.r2_patch_decision||''}]};
  return {...result,publication_payload_json:JSON.stringify(envelope)};
}
