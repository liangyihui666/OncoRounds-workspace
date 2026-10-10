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

function prepareSelection({candidate_pool,case_id,disease,difficulty}) {
  const object=v=>{for(let i=0;i<4&&typeof v==='string';i++)v=JSON.parse(v.replace(/^\uFEFF/,'').replace(/^```(?:json)?\s*|\s*```$/g,'').trim());return v;};
  const pool=object(candidate_pool);
  if(!pool||!Array.isArray(pool.candidates)||!Array.isArray(pool.groups)||pool.candidate_count!==pool.candidates.length) throw new Error('候选池结构或数量不一致');
  if(pool.case_packet?.case_id&&case_id&&pool.case_packet.case_id!==case_id) throw new Error('CASE_MISMATCH');
  const warnings=[];
  const report={schema_version:'triple-selection-1.0',candidate_count:pool.candidates.length,medical_approval_confirmed:false,
    source_groups:pool.groups,selected:[],selection_notes:[],warnings,notice:'未提供与返回题目绑定的独立医学审核记录；程序检查不代表医学正确性。',workflow_revision:'20260929-full-review-five-outer',medical_review_status:'not_provided'};
  const declaredUnreviewed = pool.groups.length > 0 && pool.groups.every(g => g.medical_review_status === 'not_performed' || g.workflow_revision === '20260928-two-stage-revision');
  if (declaredUnreviewed) {
    report.medical_review_status = 'not_performed';
    report.notice = '本流程未进行独立医学审核；程序检查仅检查结构及引用定位，不代表医学正确性。';
  }
  const normalize=s=>String(s||'').replace(/\s+/g,' ').trim();
  function signature(c) {
    const q=c.question, options=Array.isArray(q.options)?q.options:Object.values(q.options||{});
    return JSON.stringify([normalize(q.question),options.map(normalize).sort(),normalize(q.answer_text)]);
  }
  const ranked=pool.candidates.map((c,i)=>({...c,stable_index:i}));
  const seen=new Map(),unique=[];
  for(const c of ranked){const sig=signature(c);if(seen.has(sig)){warnings.push(c.candidate_id+'与'+seen.get(sig)+'重复，已合并');continue;}seen.set(sig,c.candidate_id);unique.push(c);}
  const desired=Math.min(5,unique.length);
  report.required_question_count=5;
  report.available_candidate_count=unique.length;
  report.workflow_status=pool.groups.some(g=>g.flow_status==='FORMAT_ERROR')?'FORMAT_ERROR':pool.groups.some(g=>g.parse_status==='ERROR')?'UPSTREAM_ERROR':desired===5?'OUTPUT_READY':pool.groups.find(g=>g.flow_status&&g.flow_status!=='OUTPUT_READY')?.flow_status||'INCOMPLETE_QUESTION_SET';
  if(desired!==5){
    if(desired) warnings.push('五题任务未完成：当前'+desired+'个非重复候选，不作为完整五题题组输出；请查看上游补题诊断');
    report.selection_status='insufficient';
    for(const g of pool.groups){if(g.error)warnings.push(g.group_id+': '+g.error);warnings.push(...(g.upstream_missing_information||[]));}
    if(!warnings.length)warnings.push('本次调用未返回结构有效的题目，不能复制或补造题目');
    const final_data={schema_version:'1.0',case_id:String(case_id||''),cancer_type:'',second_cancer_type:'',generation_status:'insufficient',
      difficulty:String(difficulty||'进阶'),question_count:0,questions:[],missing_information:[...new Set(warnings)]};
    return {source:final_data,report};
  }
  const selected=unique.slice(0,5);
  report.selection_method='deterministic_original_order';
  report.editorial={scope:'original_candidate_text_preserved',applied:[],rejected:[]};
  report.selection_status='success';
  report.selected=selected.map((c,i)=>({final_id:'Q'+(i+1),candidate_id:c.candidate_id,group_id:c.group_id,source_question_id:c.source_question_id,
    evidence_status:c.evidence_status||'not_provided',evidence_key:c.evidence_key||null,source_question_audit:c.source_question_audit||null,audit_scope:report.editorial.applied.some(e=>e.candidate_id===c.candidate_id)?'original_before_editorial_not_revalidated':'original_candidate'}));
  for(const c of selected){if(c.source_question_audit?.passed===false)warnings.push(c.candidate_id+'审核仍有问题：'+(c.source_question_audit.problems||[]).join('；'));}
  if(selected.some(c => c.source_question_audit)) {
    report.medical_review_status = selected.every(c => c.source_question_audit) ? 'provided_not_confirmed' : 'partially_provided';
    report.notice = '已保留上游提供的审核记录，未在本流程重新核验；程序检查不代表医学正确性。';
  }
  return {source:{generation_status:'success',questions:selected.map((c,i)=>({...c.question,id:'Q'+(i+1)})),missing_information:[...new Set(pool.groups.flatMap(g=>g.upstream_missing_information||[]))]},report};
}

function buildSelectedCase({
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
  const prepared = prepareSelection({ candidate_pool, case_id, disease, difficulty });
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
    const explanationErrors=teachingErrors(q); if(explanationErrors.length) throw new Error('逐项解析校验失败：'+explanationErrors.join('；'));
    const target=originalAnswerIndex;
    const reorderedOptions=sourceOptions;
    prepared.report.selected[index].answer_mapping = { original: letters[originalAnswerIndex], final: letters[target], order_preserved: true };
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
    generation_status: actualQuestionCount===5 ? 'success' : 'insufficient', difficulty: resolvedDifficulty, question_count: actualQuestionCount, questions,
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
    const raw = String(case_timeline ?? '').trim();
    if (!raw) return [];
    // Only explicit leading dates/stages are dates. Never search inside event facts.
    const absolute = String.raw`(?:19|20)\d{2}(?:年(?:\s*\d{1,2}月(?:\s*\d{1,2}日)?)?|[./-]\d{1,2}(?:[./-]\d{1,2})?)(?:\s*[—–~～至]\s*(?:(?:19|20)\d{2}[年./-])?\d{1,2}(?:月(?:\d{1,2}日)?|[./-]\d{1,2})?)?`;
    const relative = String.raw`(?:后续阶段|初诊(?:时)?|首次就诊(?:时)?|入院(?:时|前|后)?|术前|术后|出院(?:时|前|后)?|复发(?:时)?|进展(?:时)?|随访(?:时)?|治疗(?:前|后|期间)|第[一二三四五六七八九十百\d]+(?:次住院|周期|疗程)(?:治疗)?(?:前|后|期间)?|(?:术后|入院后|出院后|治疗后)[一二三四五六七八九十半\d]+(?:个?月|年|周|天|日)|[一二三四五六七八九十半\d]+(?:个?月|年|周|天|日)(?:后|前)|时间(?:未详|不详|未提供))`;
    const time = '(?:' + absolute + '|' + relative + ')';
    const labelPattern = new RegExp('^' + time + '$');
    const prefixPattern = new RegExp('^(' + time + ')(?=[\\s：:，,]|$)');
    // Old one-line timelines may use semicolons between explicitly dated events.
    // Keep all other semicolons inside the same event; structured rows stay intact.
    const legacyBoundary = new RegExp('[；;]\\s*(?=' + time + '(?:[\\s：:，,]|$))', 'g');
    const lines = raw.split(/\r\n?|\n/).map(s => s.trim()).filter(Boolean);
    const entries = lines.flatMap(line => /[｜|]/.test(line) ? [line] : line.split(legacyBoundary));
    return entries.filter(s => s.trim()).map((entry, index) => {
      const line = entry.trim();
      const parts = line.split(/[｜|]/).map(s => s.trim());
      if (parts.length >= 3 && labelPattern.test(parts[0])) {
        return {
          date: parts[0],
          title: parts[1] || ('诊疗节点 ' + (index + 1)),
          detail: parts.slice(2).join('｜')
        };
      }
      const match = line.match(prefixPattern);
      // Preserve unrecognized text verbatim. No inherited or computed date.
      return {
        date: match ? match[1] : '时间未详',
        title: '诊疗节点 ' + (index + 1),
        detail: line
      };
    });
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
  const execution_report={schema_version:'oncorounds-execution-1.0',workflow_revision:'20260929-full-review-five-outer',
    case_id:Questions.case_id,status:result.selection_report.workflow_status,publishable:false,
    medical_review_status:result.selection_report.medical_review_status,
    extraction_check:inputs.extraction_check||null,source_groups:result.selection_report.source_groups,
    warnings:result.selection_report.warnings};
  const transport={record_type:'oncorounds_batch_item',transport_version:'1.0',output_data,execution_report};
  const response_json=JSON.stringify(inputs.transport_mode==='__ONCOROUNDS_BATCH_V2__'?transport:output_data);
  return { ...result, case_page_json: JSON.stringify(detail, null, 2),
    execution_report,response_json,output_data, output_json: JSON.stringify(output_data, null, 2) };
}
