function applyEditorialEdits(selected, agentReply, report) {
  const audit = {scope:'wording_only_not_medical_revalidation',applied:[],rejected:[]};
  report.editorial = audit;
  let reply;
  try {
    reply=agentReply;
    for(let i=0;i<4&&typeof reply==='string';i++)reply=JSON.parse(reply.replace(/^\uFEFF/,'').replace(/^```(?:json)?\s*|\s*```$/g,'').trim());
  } catch(_) { return selected; }
  if(!Array.isArray(reply?.edits))return selected;
  const byId=new Map(selected.map(c=>[c.candidate_id,c]));
  const seen=new Set();
  const proposals=new Map();
  const limits={question:160,explain:160,keyPoint:70};
  const tokens=s=>{
    const numbers=s.match(/[<>≤≥＜＞]?[+-]?\d+(?:\.\d+)?(?:\s*[-~～至]\s*\d+(?:\.\d+)?)?\s*(?:%|％|级|年|月|周|天|日|周期|mg|g|mm|cm|μmol\/L|g\/L)?/g)||[];
    const latin=s.match(/[A-Za-z][A-Za-z0-9+_/-]*/g)||[];
    const qualifiers=s.match(/尚未|未见|未提供|未明确|未证实|未记录|未排除|不详|阴性|阳性|疑似|可能|考虑|不能|不得|不应|无需|无须|必须|仅限|仅在|只在|所有|任何|均可|首选|永久|暂时|暂停|停用|停药|恢复|再挑战|推荐|建议|标准|优于|劣于|不劣于|等同|排除|证实|确诊|减量|增量/g)||[];
    return JSON.stringify([numbers.map(x=>x.replace(/\s/g,'')).sort(),latin.sort(),qualifiers.sort()]);
  };
  for(const edit of reply.edits){
    const id=edit?.candidate_id;
    if(!byId.has(id)||seen.has(id)||!edit||typeof edit!=='object'||Array.isArray(edit)){
      audit.rejected.push({candidate_id:id||'',reason:'UNKNOWN_OR_DUPLICATE_ID'});continue;
    }
    seen.add(id);
    if(Object.keys(edit).some(k=>k!=='candidate_id'&&!Object.hasOwn(limits,k))){
      audit.rejected.push({candidate_id:id,reason:'FORBIDDEN_FIELD'});continue;
    }
    const changes={};const original=byId.get(id).question;
    for(const key of Object.keys(limits)){
      if(!Object.hasOwn(edit,key))continue;
      const value=edit[key];const old=original[key];
      if(typeof value!=='string'||!value.trim()||value.length>limits[key]||value.length<old.length*0.65||tokens(value)!==tokens(old)||/https?:\/\/|\{\{|<script/i.test(value)){
        audit.rejected.push({candidate_id:id,field:key,reason:'LENGTH_OR_PROTECTED_FACT_CHANGED'});continue;
      }
      if(value!==old){changes[key]=value;audit.applied.push({candidate_id:id,field:key,before:old,after:value});}
    }
    proposals.set(id,changes);
  }
  return selected.map(c=>({...c,question:{...c.question,...(proposals.get(c.candidate_id)||{})}}));
}

const TUMOR_DISPLAY_MAP = {"乳腺叶状肿瘤": "胸部肿瘤", "乳腺癌": "乳腺癌", "乳腺肉瘤": "胸部肿瘤", "儿童心脏肿瘤": "", "儿童早期肿瘤": "", "儿童星形细胞瘤": "", "儿童横纹肌肉瘤": "", "儿童罕见癌症": "", "儿童血管瘤": "", "儿童颅咽管瘤": "", "原位导管癌": "", "原发灶不明的转移癌": "", "复发性癌症": "", "恶性间皮瘤": "", "未知原发性癌症": "", "纵隔肿瘤": "", "转移性肿瘤": "", "青少年癌症": "", "气管支气管瘤": "胸部肿瘤", "胸腺瘤": "胸部肿瘤", "胸膜间皮瘤": "胸部肿瘤", "上呼吸消化道恶性黑色素瘤": "头颈部肿瘤", "下咽癌": "头颈部肿瘤", "口咽癌": "头颈部肿瘤", "唇和口腔癌": "头颈部肿瘤", "唾液腺癌": "头颈部肿瘤", "喉癌": "头颈部肿瘤", "头颈部皮肤癌": "头颈部肿瘤", "头颈部鳞癌": "头颈部肿瘤", "扁桃体恶性肿瘤": "头颈部肿瘤", "甲状腺癌": "头颈部肿瘤", "耳部恶性肿瘤": "头颈部肿瘤", "隐性原发转移的鳞状颈癌": "头颈部肿瘤", "颌骨恶性肿瘤": "头颈部肿瘤", "鼻咽癌": "头颈部肿瘤", "鼻腔和（副）鼻窦癌症": "头颈部肿瘤", "心包肿瘤": "", "心脏肿瘤": "", "尿路上皮癌": "泌尿系肿瘤", "尿道癌": "泌尿系肿瘤", "肾盂和输尿管移行细胞癌": "泌尿系肿瘤", "肾细胞癌": "泌尿系肿瘤", "膀胱癌": "泌尿系肿瘤", "Vater壶腹癌": "消化系统肿瘤", "壶腹周围癌": "消化系统肿瘤", "大肠癌": "消化系统肿瘤", "小肠癌": "消化系统肿瘤", "直肠癌": "直肠癌", "结直肠癌": "消化系统肿瘤", "结肠癌": "消化系统肿瘤", "肛周皮肤癌": "消化系统肿瘤", "肛管肿瘤": "消化系统肿瘤", "肛门肿瘤": "消化系统肿瘤", "肝癌": "消化系统肿瘤", "胃癌": "胃癌", "胆道恶性肿瘤": "消化系统肿瘤", "胰腺癌": "胰腺癌", "阑尾肿瘤": "消化系统肿瘤", "食管癌": "食管癌", "食管胃交界处肿瘤": "消化系统肿瘤", "前列腺癌": "泌尿系肿瘤", "卵巢癌": "妇科肿瘤", "外阴癌": "妇科肿瘤", "子宫内膜癌": "妇科肿瘤", "宫颈癌": "妇科肿瘤", "性腺外生殖细胞肿瘤": "", "滋养细胞肿瘤": "妇科肿瘤", "睾丸癌": "泌尿系肿瘤", "纵隔生殖细胞瘤": "", "胎盘恶性肿瘤": "妇科肿瘤", "输卵管癌": "妇科肿瘤", "阴茎癌": "泌尿系肿瘤", "阴道癌": "妇科肿瘤", "颅外生殖细胞肿瘤": "", "乳头状瘤病": "皮肤肿瘤", "皮肤基底细胞癌": "皮肤肿瘤", "皮肤鳞状细胞癌": "皮肤肿瘤", "蕈样肉芽肿": "皮肤肿瘤", "黑色素瘤": "皮肤肿瘤", "默克尔细胞癌": "皮肤肿瘤", "泪腺癌": "眼部肿瘤", "眼内黑色素瘤": "眼部肿瘤", "眼眶肉瘤": "眼部肿瘤", "眼睑癌": "眼部肿瘤", "结膜癌": "眼部肿瘤", "结膜黑色素瘤": "眼部肿瘤", "视网膜母细胞瘤": "眼部肿瘤", "副神经节瘤": "神经内分泌肿瘤", "十二指肠和Vater壶腹神经内分泌肿瘤": "神经内分泌肿瘤", "嗜铬细胞瘤": "神经内分泌肿瘤", "垂体瘤": "神经内分泌肿瘤", "多发性内分泌肿瘤综合征": "神经内分泌肿瘤", "梅克尔细胞癌": "神经内分泌肿瘤", "甲状旁腺癌": "神经内分泌肿瘤", "神经母细胞瘤": "神经内分泌肿瘤", "空肠回肠神经内分泌肿瘤": "神经内分泌肿瘤", "结肠、直肠神经内分泌肿瘤": "神经内分泌肿瘤", "肾上腺皮质癌": "神经内分泌肿瘤", "肾上腺神经内分泌肿瘤": "神经内分泌肿瘤", "胃神经内分泌肿瘤": "神经内分泌肿瘤", "胰腺神经内分泌肿瘤": "神经内分泌肿瘤", "阑尾神经内分泌肿瘤": "神经内分泌肿瘤", "非典型畸胎瘤": "神经内分泌肿瘤", "肺癌": "肺癌", "室管膜瘤": "头颈部肿瘤", "神经纤维瘤": "头颈部肿瘤", "脑干胶质瘤": "头颈部肿瘤", "脑胶质瘤": "头颈部肿瘤", "脑膜瘤": "头颈部肿瘤", "髓母细胞瘤": "头颈部肿瘤", "原发性腹膜癌": "", "腹膜间皮瘤": "", "多发性骨髓瘤": "血液肿瘤", "恶性免疫增生性疾病": "血液肿瘤", "慢性骨髓增殖性肿瘤": "血液肿瘤", "淋巴瘤": "血液肿瘤", "白血病": "血液肿瘤", "组织细胞增多症": "血液肿瘤", "骨髓增殖性肿瘤": "血液肿瘤", "骨髓增生异常综合征": "血液肿瘤", "卡波西肉瘤": "骨与软组织肿瘤", "四肢和躯干软组织肉瘤": "骨与软组织肿瘤", "胃肠道间质瘤": "骨与软组织肿瘤", "腹膜后软组织肉瘤": "骨与软组织肿瘤", "腹部和胸腔内脏器官软组织肉瘤": "骨与软组织肿瘤", "血管瘤": "骨与软组织肿瘤", "尤文氏肉瘤": "骨与软组织肿瘤", "恶性骨巨细胞瘤": "骨与软组织肿瘤", "未分化多形性肉瘤": "骨与软组织肿瘤", "脊索瘤": "骨与软组织肿瘤", "软骨肉瘤": "骨与软组织肿瘤", "骨肉瘤": "骨与软组织肿瘤"};

function classifyTumor(value) {
  const second = typeof value === 'string' ? value.trim() : '';
  if (!second || !Object.prototype.hasOwnProperty.call(TUMOR_DISPLAY_MAP, second))
    return { cancer_type:'', second_cancer_type:'', taxonomy_warnings:[second ? '二级癌种不在CSV字典：'+second : '未确定原发肿瘤对应的二级癌种'] };
  const first = TUMOR_DISPLAY_MAP[second];
  return { cancer_type:first, second_cancer_type:second, taxonomy_warnings:first ? [] : ['二级癌种已确定，但一级归属尚未确认：'+second] };
}
// Text-shape signals only. Never change options or infer medical correctness.
function optionStyleMetrics(question) {
  const q = question && typeof question === 'object' ? question : {};
  const letters = ['A', 'B', 'C', 'D'];
  const options = Array.isArray(q.options) ? q.options : letters.map(k => q.options && q.options[k]);
  const answer = typeof q.answer === 'number' ? q.answer : letters.indexOf(String(q.answer || '').toUpperCase());
  if (options.length !== 4 || options.some(s => typeof s !== 'string' || !s.trim()) || !Number.isInteger(answer) || answer < 0 || answer > 3) return null;
  // Count Unicode characters except spaces/punctuation/symbols; letters/digits count individually.
  const lengths = options.map(s => Array.from(s.replace(/[\s\p{P}\p{S}]/gu, '')).length);
  const wrongLengths = lengths.filter((_, i) => i !== answer).sort((a, b) => a - b);
  const medianWrong = wrongLengths[1];
  const longest = Math.max(...lengths), shortest = Math.min(...lengths);
  const uniqueLongest = lengths[answer] === longest && lengths.filter(n => n === longest).length === 1;
  const codes = [];
  if (uniqueLongest && lengths[answer] - medianWrong >= 6 && lengths[answer] > medianWrong * 1.4) codes.push('CORRECT_OPTION_LONGER');
  if (longest - shortest >= 8 && longest > shortest * 1.5) codes.push('OPTION_LENGTH_SPREAD');
  // These phrases are review clues, not proof that the corresponding option is wrong.
  const absolutePattern = /所有.{0,12}(?:均|都)|(?:一定|必然|必为|必定|绝不|完全可靠)|不会(?:发生|复发)|无需(?:任何|所有)|停止所有|放弃所有|等待自然病程/;
  const absolutePositions = options.map((s, i) => absolutePattern.test(s) ? letters[i] : null).filter(Boolean);
  if (absolutePositions.length && !absolutePositions.includes(letters[answer])) codes.push('DISTRACTOR_ABSOLUTE_CUE');
  const warnings = [];
  if (codes.includes('CORRECT_OPTION_LONGER')) warnings.push('正确项独自较长：应复核是否只有正确项包含条件、理由或多个动作。');
  if (codes.includes('OPTION_LENGTH_SPREAD')) warnings.push('四项长度差异较大：应统一表达层次，不得机械补字或截断。');
  if (codes.includes('DISTRACTOR_ABSOLUTE_CUE')) warnings.push('干扰项含绝对化或极端措辞：需复核是否构成无需医学推理的排除线索，不能仅凭关键词判错。');
  return {
    version: 'option-style-1.0', length_unit: 'unicode_chars_excluding_spaces_punctuation_symbols',
    option_lengths: lengths, answer_position: letters[answer], correct_is_unique_longest: uniqueLongest,
    correct_to_distractor_median_ratio: medianWrong ? Number((lengths[answer] / medianWrong).toFixed(2)) : null,
    max_min_difference: longest - shortest,
    max_min_ratio: shortest ? Number((longest / shortest).toFixed(2)) : null,
    absolute_phrase_positions: absolutePositions, warning_codes: codes, warnings,
    interpretation: '仅为措辞线索，不是医学质量评分；无提示也不等于无缺陷。药名、缩写或必要条件可能导致合理长度差异。'
  };
}

function prepareSelection({agent_reply,candidate_pool,case_id,disease,difficulty}) {
  const object=v=>{for(let i=0;i<4&&typeof v==='string';i++)v=JSON.parse(v.replace(/^\uFEFF/,'').replace(/^```(?:json)?\s*|\s*```$/g,'').trim());return v;};
  const pool=object(candidate_pool);
  if(!pool||!Array.isArray(pool.candidates)||!Array.isArray(pool.groups)||pool.candidate_count!==pool.candidates.length) throw new Error('候选池结构或数量不一致');
  if(pool.case_packet?.case_id&&case_id&&pool.case_packet.case_id!==case_id) throw new Error('CASE_MISMATCH');
  const warnings=[];
  const report={schema_version:'triple-selection-1.0',candidate_count:pool.candidates.length,medical_approval_confirmed:false,
    source_groups:pool.groups,selected:[],selection_notes:[],warnings,notice:'终选保留真实审核信息，成功生成不等于医学审核通过',workflow_revision:'20260910-two-level-test'};
  const normalize=s=>String(s||'').replace(/\s+/g,' ').trim();
  function signature(c) {
    const q=c.question, options=Array.isArray(q.options)?q.options:Object.values(q.options||{});
    return JSON.stringify([normalize(q.question),options.map(normalize).sort(),normalize(q.answer_text)]);
  }
  const problemCount=c=>Array.isArray(c.source_question_audit?.problems)?c.source_question_audit.problems.length+(c.source_question_audit.passed===false?1:0):0;
  const unknown=c=>c.source_question_audit?0:1;
  const ranked=pool.candidates.map((c,i)=>({...c,stable_index:i})).sort((a,b)=>problemCount(a)-problemCount(b)||unknown(a)-unknown(b)||a.stable_index-b.stable_index);
  const seen=new Map(),unique=[];
  for(const c of ranked){const sig=signature(c);if(seen.has(sig)){warnings.push(c.candidate_id+'与'+seen.get(sig)+'重复，已合并');continue;}seen.set(sig,c.candidate_id);unique.push(c);}
  const byId=new Map(unique.map(c=>[c.candidate_id,c]));
  const desired=Math.min(5,unique.length);
  if(!desired){
    report.selection_status='insufficient';
    for(const g of pool.groups){if(g.error)warnings.push(g.group_id+': '+g.error);warnings.push(...(g.upstream_missing_information||[]));}
    if(!warnings.length)warnings.push('本次调用未返回结构有效的题目，不能复制或补造题目');
    const final_data={schema_version:'1.0',case_id:String(case_id||''),cancer_type:'',second_cancer_type:'',generation_status:'insufficient',
      difficulty:String(difficulty||'进阶'),question_count:0,questions:[],missing_information:[...new Set(warnings)]};
    return {stop:{final_data,final_json:JSON.stringify(final_data),case_page_data:{},case_page_json:'{}',selection_report:report,selection_report_json:JSON.stringify(report),quality_notice:warnings.join('\n')}};
  }
  let selected=null;
  try {
    const reply=object(agent_reply),ids=reply?.selected_ids;
    if(!Array.isArray(ids)||ids.length!==desired||new Set(ids).size!==desired||ids.some(id=>!byId.has(id)))throw new Error('ID无效、重复、题数不符或选择了已合并的重复候选');
    selected=ids.map(id=>byId.get(id));
    report.selection_method='model_ids';
  }catch(e){
    report.selection_method='deterministic_fallback'; report.fallback_reason=String(e.message||e);
    selected=[];const remaining=unique.slice();
    while(selected.length<desired){
      const duplicateTopic=c=>selected.filter(s=>normalize(s.question.keyPoint)===normalize(c.question.keyPoint)).length;
      const repeatedDecision=c=>selected.filter(s=>s.question.type===c.question.type&&s.question.timepoint===c.question.timepoint).length;
      remaining.sort((a,b)=>problemCount(a)-problemCount(b)||duplicateTopic(a)-duplicateTopic(b)||repeatedDecision(a)-repeatedDecision(b)||unknown(a)-unknown(b)||a.stable_index-b.stable_index);
      selected.push(remaining.shift());
    }
    warnings.push('终选回复异常，已按审核问题数量、考点重复情况和稳定候选顺序选择实际题目');
  }
  selected=selected.sort((a,b)=>a.stable_index-b.stable_index);
  selected=applyEditorialEdits(selected,report.selection_method==='model_ids'?agent_reply:null,report);
  report.selection_status='success';
  report.selected=selected.map((c,i)=>({final_id:'Q'+(i+1),candidate_id:c.candidate_id,group_id:c.group_id,source_question_id:c.source_question_id,
    evidence_status:c.evidence_status||'not_provided',evidence_key:c.evidence_key||null,source_question_audit:c.source_question_audit||null,audit_scope:report.editorial.applied.some(e=>e.candidate_id===c.candidate_id)?'original_before_editorial_not_revalidated':'original_candidate'}));
  for(const c of selected){if(c.source_question_audit?.passed===false)warnings.push(c.candidate_id+'审核仍有问题：'+(c.source_question_audit.problems||[]).join('；'));if(!c.source_question_audit)warnings.push(c.candidate_id+'未提供与原题绑定的审核，不能视为PASS');}
  let seed=2166136261;for(const ch of String(case_id||'')+selected.map(c=>c.candidate_id).join('|'))seed=Math.imul(seed^ch.charCodeAt(0),16777619)>>>0;
  const targets=Array.from({length:desired},(_,i)=>(i+seed%4)%4);
  return {source:{generation_status:'success',questions:selected.map((c,i)=>({...c.question,id:'Q'+(i+1)})),missing_information:[...new Set(pool.groups.flatMap(g=>g.upstream_missing_information||[]))]},report,targets};
}

function buildSelectedCase({
  agent_reply,
  candidate_pool,
  case_id,
  case_title,
  disease,
  case_context,
  learning_points,
  case_timeline,
  biomarkers,
  decision_points,
  case_image_index,
  difficulty
}) {
  const prepared = prepareSelection({ agent_reply, candidate_pool, case_id, disease, difficulty });
  if (prepared.stop) return prepared.stop;
  const source = prepared.source;
  const letters = ['A', 'B', 'C', 'D'];
  function cleanText(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
  function displayText(value, maxLength) {
    const s = cleanText(value);
    return s.length > maxLength ? s.slice(0, maxLength).trim() + '……' : s;
  }

  const diseaseText = cleanText(disease);

  const cancerType = ""; // Final taxonomy is assigned from the CSV map in main.

  const resolvedCaseId = cleanText(
    case_id || source.case_id
  );

  const resolvedDifficulty = cleanText(
    difficulty ||
    source.difficulty ||
    "进阶"
  );

  const questions = source.questions.map((q, index) => {
    const sourceOptions = Array.isArray(q.options) ? [...q.options] : letters.map(k => q.options && q.options[k]);
    if (sourceOptions.length !== 4 || sourceOptions.some(v => typeof v !== "string" || !v.trim()) || new Set(sourceOptions.map(v => v.trim())).size !== 4) {
      throw new Error(`Q${index + 1}需要四项不重复的有效选项`);
    }
    const originalAnswerIndex = typeof q.answer === "number" ? q.answer : letters.indexOf(String(q.answer).toUpperCase());
    if (!Number.isInteger(originalAnswerIndex) || originalAnswerIndex < 0 || originalAnswerIndex > 3) throw new Error(`Q${index + 1}答案索引非法`);
    const correctAnswerText = sourceOptions[originalAnswerIndex];
    if (q.answer_text !== correctAnswerText) throw new Error(`Q${index + 1}答案文字与选项不一致`);
    const dependentText = [q.question, q.explain, q.keyPoint, ...sourceOptions].join("\n");
    const orderSensitive = /(?:选项|答案|选择|排除|选)\s*[A-D]|[A-D]\s*(?:项|选项|正确|错误)|[A-D]\s*(?:和|与|及|、|或|\+|\/|and|or)\s*[A-D]|(?:以上|上述|前述|前两|前三|后两|其余|所有|全部).{0,6}(?:选项|都|均|皆|正确|错误)|(?:^|\n)\s*[A-D][.、：:)]/i.test(dependentText);
    let target = prepared.targets[index];
    let reorderedOptions;
    if (orderSensitive) {
      target = originalAnswerIndex;
      reorderedOptions = sourceOptions;
      prepared.report.warnings.push(`Q${index + 1}含位置相关表述，为保护题意保留原选项顺序；不因答案分布停止输出。`);
    } else {
      reorderedOptions = sourceOptions.filter((_, i) => i !== originalAnswerIndex);
      reorderedOptions.splice(target, 0, correctAnswerText);
    }
    prepared.report.selected[index].answer_mapping = { original: letters[originalAnswerIndex], final: letters[target], order_preserved: orderSensitive };
    return { id: q.id, type: q.type, phase: q.phase, timepoint: q.timepoint, question: q.question,
      options: { A: reorderedOptions[0], B: reorderedOptions[1], C: reorderedOptions[2], D: reorderedOptions[3] },
      answer: letters[target], answer_text: correctAnswerText, explain: q.explain, keyPoint: q.keyPoint, guidelineRef: q.guidelineRef };
  });
  prepared.report.option_style_checks = questions.map((q, index) => ({
    final_id: q.id, candidate_id: prepared.report.selected[index].candidate_id,
    ...optionStyleMetrics(q)
  }));
  for (const check of prepared.report.option_style_checks) {
    if (check.warnings.length) prepared.report.warnings.push(
      check.final_id + '（' + check.candidate_id + '）选项表达待复核：' +
      check.option_lengths.join('/') + '字；' + check.warnings.join(' ')
    );
  }
  const actualQuestionCount = questions.length;
  const answerDistribution = questions.reduce((c, q) => { c[q.answer]++; return c; }, { A: 0, B: 0, C: 0, D: 0 });
  prepared.report.answer_distribution = answerDistribution;
  if (Math.max(...Object.values(answerDistribution)) > 2 || Object.values(answerDistribution).filter(v => v > 0).length < 3) {
    prepared.report.warnings.push("为保护位置相关选项语义，本组答案分布未均衡；这不是证据不足，不删除题目。");
  }
  const finalData = { schema_version: "1.0", case_id: resolvedCaseId, cancer_type: source.cancer_type || cancerType,
    generation_status: "success", difficulty: resolvedDifficulty, question_count: actualQuestionCount, questions,
    missing_information: source.missing_information || [] };


  function isSafeRemoteUrl(value) {
    const url = String(value ?? "").trim();

    if (!/^https?:\/\//i.test(url)) {
      return false;
    }

    if (
      /^https?:\/\/(?:localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/i.test(
        url
      )
    ) {
      return false;
    }

    return !/[?&](?:token|access_token|api_key|apikey|auth|authorization|credential|signature|sig)=/i.test(
      url
    );
  }

  const MAX_CASE_IMAGES = 6;

  function isGenericImageLabel(value) {
    const label = cleanText(value);

    if (!label) {
      return true;
    }

    return (
      /^(?:图片|图像|配图|image|img)\s*\d*(?:\.(?:png|jpe?g|gif|webp|bmp))?$/i.test(
        label
      ) ||
      /^\d+\.(?:png|jpe?g|gif|webp|bmp)$/i.test(
        label
      ) ||
      /^(?:演示文稿|幻灯片)\s*\d*$/i.test(
        label
      )
    );
  }

  function isObviousNonCaseImage(value) {
    const label = cleanText(value);

    return /(二维码|扫码|公众号|关注|转发|下载|logo|头像|专家介绍|医生介绍|讲者|个人简介|简历|课程|直播|广告|品牌|海报|封面|栏目|责任编辑|排版编辑)/i.test(
      label
    );
  }

  function temporalKey(value) {
    const match = cleanText(value).match(
      /((?:19|20)\d{2})(?:\s*[年.\/-]\s*(\d{1,2}))?(?:\s*[月.\/-]\s*(\d{1,2}))?/
    );

    if (!match) {
      return "";
    }

    const parts = [match[1]];

    if (match[2]) {
      parts.push(
        String(Number(match[2]))
      );
    }

    if (match[3]) {
      parts.push(
        String(Number(match[3]))
      );
    }

    return parts.join("-");
  }

  function findRelatedTimeline(
    timepoint,
    timelineItems
  ) {
    const normalizedTimepoint =
      cleanText(timepoint);

    if (!normalizedTimepoint) {
      return null;
    }

    const exactTextMatch =
      timelineItems.find(
        (item) =>
          cleanText(item.detail).includes(
            normalizedTimepoint
          ) ||
          cleanText(item.date).includes(
            normalizedTimepoint
          )
      );

    if (exactTextMatch) {
      return exactTextMatch;
    }

    const imageTemporalKey =
      temporalKey(normalizedTimepoint);

    if (!imageTemporalKey) {
      return null;
    }

    return (
      timelineItems.find(
        (item) =>
          temporalKey(item.date) ===
            imageTemporalKey ||
          temporalKey(item.detail) ===
            imageTemporalKey
      ) || null
    );
  }

  function parseImageIndex(
    value,
    timelineItems
  ) {
    const records = [];
    const seenIds = new Set();

    for (
      const rawLine of String(
        value ?? ""
      ).split(/\r?\n/)
    ) {
      const parts = rawLine
        .split("|")
        .map(
          (part) => part.trim()
        );

      const id = parts[0] || "";
      const src = parts[1] || "";
      const timepoint = parts[2] || "";
      const originalCaption =
        parts.slice(3).join(" | ").trim();

      if (
        !/^IMG\d+$/.test(id) ||
        seenIds.has(id) ||
        !isSafeRemoteUrl(src)
      ) {
        continue;
      }

      const caption =
        isGenericImageLabel(
          originalCaption
        )
          ? ""
          : cleanText(
              originalCaption
            );

      const usableTimepoint =
        /^(?:无|不详|未详|未提供|解析结果未提供)$/i.test(
          cleanText(timepoint)
        )
          ? ""
          : cleanText(timepoint);

      // 仅按原始图注和时间点筛选；
      // 不读取图片内容，也不根据文件名推断医学含义。
      if (
        (!caption &&
          !usableTimepoint) ||
        isObviousNonCaseImage(
          originalCaption
        )
      ) {
        continue;
      }

      const relatedTimeline =
        findRelatedTimeline(
          usableTimepoint,
          timelineItems
        );

      seenIds.add(id);

      records.push({
        id,
        src,
        timepoint:
          usableTimepoint,
        caption,
        alt:
          caption ||
          `病例原始图片 ${id}`,
        mapping_status:
          relatedTimeline
            ? "matched_by_timepoint"
            : "caption_only",
        related_timeline:
          relatedTimeline
            ? {
                date:
                  relatedTimeline.date,
                title:
                  relatedTimeline.title,
                detail:
                  relatedTimeline.detail
              }
            : null
      });

      if (
        records.length >=
        MAX_CASE_IMAGES
      ) {
        break;
      }
    }

    return records;
  }

  function buildSummaryItems() {
    const candidates = [
      [
        "患者与就诊背景",
        case_context
      ],
      [
        "疾病与分期",
        disease
      ],
      [
        "分子与病理",
        biomarkers
      ],
      [
        "核心教学点",
        learning_points ||
          decision_points
      ]
    ];

    return candidates
      .filter(
        ([, value]) =>
          cleanText(value)
      )
      .map(
        (
          [label, value],
          index
        ) => ({
          order: index + 1,
          label,
          value: displayText(
            value,
            260
          )
        })
      );
  }

  function buildTimelineItems() {
    const rawTimeline =
      String(
        case_timeline ?? ""
      ).trim();

    if (!rawTimeline) {
      return [];
    }

    let entries = rawTimeline
      .split(/\r?\n|[；;]/)
      .map(
        (item) => item.trim()
      )
      .filter(Boolean);

    if (entries.length === 0) {
      entries = [rawTimeline];
    }

    return entries.map(
      (detail, index) => {
        const dateMatch =
          detail.match(
            /(?:19|20)\d{2}(?:(?:年\s*\d{1,2}月?(?:\s*\d{1,2}日?)?)|(?:[.\/-]\s*\d{1,2}(?:[.\/-]\s*\d{1,2})?))?\+?/
          );

        return {
          date: dateMatch
            ? cleanText(
                dateMatch[0]
              )
             : (()=>{
                const stage=detail.split(/[：:]/)[0].trim();
                return stage.length<=30 && /初诊|就诊|入院|术前|术后|治疗|随访|出院|复发|进展|周期|个月|年后|周后|天后/.test(stage)?stage:'时间未详';
              })(),
          title:
            `诊疗节点 ${index + 1}`,
          detail: displayText(
            detail,
            300
          )
        };
      }
    );
  }

  const timelineItems =
    buildTimelineItems();

  const pageImages =
    parseImageIndex(
      case_image_index,
      timelineItems
    );

  const heroImage =
    pageImages.find(
      (item) =>
        item.related_timeline
    ) ||
    pageImages.find(
      (item) => item.caption
    ) ||
    null;

  const resolvedTitle =
    cleanText(
      case_title ||
      source.case_title ||
      diseaseText ||
      "肿瘤病例"
    );

  const overviewTabs = [
    {
      id: "summary",
      label: "病例摘要",
      order: 1,
      summary_items:
        buildSummaryItems()
    },
    {
      id: "timeline",
      label: "病程轴",
      order: 2,
      timeline_items:
        timelineItems
    }
  ];

  if (pageImages.length > 0) {
    overviewTabs.push({
      id: "images",
      label: "病例图片",
      order: 3,

      // 图片只出现在病例详情页；
      // 不输出题号、答案或医学图像推断。
      image_items:
        pageImages
    });
  }

  const casePageData = {
    schema_version: "1.0",
    case_id: resolvedCaseId,
    cancer_type:
      source.cancer_type ||
      cancerType,
    difficulty:
      resolvedDifficulty,

    // 与最终实际发布题量保持一致。
    decision_point_count:
      actualQuestionCount,

    image: {
      src: heroImage
        ? heroImage.src
        : "",
      alt: heroImage
        ? (
            heroImage.caption ||
            `${resolvedTitle}病例主题图`
          )
        : ""
    },

    home: {
      recommendation_label:
        "今日推荐病例",
      display_title:
        resolvedTitle,
      description:
        displayText(
          case_context ||
          diseaseText,
          180
        )
    },

    overview: {
      hero: {
        title:
          resolvedTitle,
        subtitle:
          displayText(
            learning_points ||
            diseaseText,
            120
          )
      },
      tabs:
        overviewTabs
    }
  };

  return {
    selection_report: prepared.report,
    selection_report_json: JSON.stringify(prepared.report, null, 2),
    quality_notice: [prepared.report.notice, ...prepared.report.warnings, ...prepared.report.selection_notes, prepared.report.model_risk_message].filter(Boolean).join('\n'),
    final_data: finalData,
    final_json:
      JSON.stringify(
        finalData,
        null,
        2
      ),
    case_page_data:
      casePageData,
    case_page_json:
      JSON.stringify(
        casePageData,
        null,
        2
      )
  };
}

// Public contract: one JSON object, with object-valued Questions and detail.
function main(inputs) {
  const result = buildSelectedCase(inputs);
  const Questions = result.final_data;
  const detail = result.case_page_data;
  const classification = classifyTumor(inputs.second_cancer_type);
  Questions.cancer_type = classification.cancer_type;
  delete Questions.second_cancer_type;
  if (Object.keys(detail).length) { detail.cancer_type=Questions.cancer_type; delete detail.second_cancer_type; }
  result.selection_report.taxonomy_warnings=classification.taxonomy_warnings;
  result.selection_report_json=JSON.stringify(result.selection_report);
  result.final_json=JSON.stringify(Questions);
  if (!Questions || typeof Questions !== 'object' || Array.isArray(Questions) ||
      !detail || typeof detail !== 'object' || Array.isArray(detail)) {
    throw new Error('最终题目或病例数据不是JSON对象');
  }
  if (!Array.isArray(Questions.questions) || Questions.question_count !== Questions.questions.length) {
    throw new Error('最终题目数量与questions数组不一致');
  }
  if (Object.keys(detail).length) {
    for (const key of ['case_id', 'cancer_type', 'difficulty']) {
      if (Questions[key] !== detail[key]) throw new Error('题目与病例字段不一致：' + key);
    }
    if (detail.decision_point_count !== Questions.question_count) throw new Error('病例决策数量与题目数量不一致');
    if (detail.overview && Array.isArray(detail.overview.tabs) &&
        !detail.overview.tabs.some(t => t.id === 'images')) {
      detail.overview.tabs.push({ id: 'images', label: '病例图片', order: 3, image_items: [] });
    }
  }
  if(Object.keys(detail).length){
    detail.image={src:'',alt:''};
    const tab=detail.overview?.tabs?.find(t=>t.id==='images');
    if(tab){tab.label='病例图片';tab.order=3;tab.image_items=[];}
  }
  const output_data = { Questions, detail };
  return { ...result, case_page_json: JSON.stringify(detail, null, 2),
    output_data, output_json: JSON.stringify(output_data, null, 2) };
}
