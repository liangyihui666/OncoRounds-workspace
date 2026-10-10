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

function main(inputs) {
  const source = inputs && typeof inputs === "object" ? inputs : {};
  const ROOT_FIELDS = [
    "schema_version",
    "generation_status",
    "case_summary",
    "question_count",
    "difficulty",
    "questions",
    "missing_information",
    "risk_message"
  ];
  const INTERNAL_QUESTION_FIELDS = [
    "id",
    "type",
    "phase",
    "timepoint",
    "question",
    "options",
    "answer",
    "answer_text",
    "explain",
    "keyPoint",
    "evidence_id",
    "support_mode",
    "evidence_summary"
  ];
  const PUBLIC_QUESTION_FIELDS = [
    "id",
    "type",
    "phase",
    "timepoint",
    "question",
    "options",
    "answer",
    "answer_text",
    "explain",
    "keyPoint"
  ];
  const REF_FIELDS = [
    "evidence_type",
    "doc_id",
    "split_index",
    "type",
    "authority",
    "source_title",
    "source_version",
    "source_section",
    "source_url",
    "evidence_summary"
  ];
  const ABILITY_TYPES = new Set([
    "诊断与分期",
    "分子诊断",
    "治疗决策",
    "疗效复评与局部治疗",
    "耐药与后线管理",
    "不良反应管理"
  ]);
  const SUPPORT_MODES = new Set(["hard", "clinical_reasoning"]);
  const FORBIDDEN_MODEL_METADATA = [
    "guidelineRef",
    "evidence_type",
    "doc_id",
    "split_index",
    "authority",
    "source_title",
    "source_version",
    "source_section",
    "source_url"
  ];
  const FULL_INTERNAL_FIELDS = INTERNAL_QUESTION_FIELDS.filter(
    (field) => field !== "id"
  );
  const errors = [];
  const warnings = [];
  const repairTasks = [];
  const repairTaskKeys = new Set();
  let requiresFullRevision = false;

  function hasOwn(object, key) {
    return Boolean(object && Object.prototype.hasOwnProperty.call(object, key));
  }

  function nonEmptyString(value) {
    return typeof value === "string" && Boolean(value.trim());
  }

  function normalizedText(value) {
    return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  }

  function pushTask(task) {
    if (task.scope === "root" || task.scope === "set") {
      requiresFullRevision = true;
    }
    const normalized = {
      target_ids: Array.from(
        new Set(
          (Array.isArray(task.target_ids) ? task.target_ids : []).filter(
            (id) => typeof id === "string" && /^Q[1-5]$/.test(id)
          )
        )
      ),
      code: nonEmptyString(task.code) ? task.code : "STRUCTURE_ERROR",
      fields: Array.from(
        new Set(
          (Array.isArray(task.fields) ? task.fields : []).filter(
            (field) => typeof field === "string" && field
          )
        )
      ),
      message: nonEmptyString(task.message) ? task.message : "修复机械结构错误"
    };
    const key = JSON.stringify(normalized);
    if (repairTaskKeys.has(key)) return;
    repairTaskKeys.add(key);
    repairTasks.push(normalized);
  }

  function fail(message, task) {
    errors.push(message);
    if (task) pushTask(task);
  }

  function questionTask(id, code, fields, message) {
    return {
      scope: "question",
      target_ids: /^Q[1-5]$/.test(String(id)) ? [String(id)] : [],
      code,
      fields,
      message
    };
  }

  function setTask(code, targetIds, message) {
    return {
      scope: "set",
      target_ids: targetIds,
      code,
      fields: FULL_INTERNAL_FIELDS,
      message
    };
  }

  function rootTask(code, fields, message) {
    return {
      scope: "root",
      target_ids: [],
      code,
      fields,
      message
    };
  }

  function readJsonStringEnd(text, start) {
    let escaped = false;
    for (let index = start + 1; index < text.length; index++) {
      const char = text[index];
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') return index + 1;
    }
    return -1;
  }

  function skipJsonWhitespace(text, start) {
    let cursor = start;
    while (cursor < text.length && /\s/.test(text[cursor])) cursor += 1;
    return cursor;
  }

  function scanJsonValueEnd(text, start) {
    const first = text[start];
    if (first === '"') return readJsonStringEnd(text, start);
    if (first !== "{" && first !== "[") {
      let cursor = start;
      while (
        cursor < text.length &&
        text[cursor] !== "," &&
        text[cursor] !== "}" &&
        text[cursor] !== "]"
      ) {
        cursor += 1;
      }
      return cursor;
    }

    let objectDepth = 0;
    let arrayDepth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index++) {
      const char = text[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') {
        inString = true;
        continue;
      }
      if (char === "{") objectDepth += 1;
      else if (char === "}") objectDepth -= 1;
      else if (char === "[") arrayDepth += 1;
      else if (char === "]") arrayDepth -= 1;
      if (objectDepth === 0 && arrayDepth === 0) return index + 1;
    }
    return -1;
  }

  function duplicateRootKeys(text) {
    let cursor = skipJsonWhitespace(text, 0);
    if (text[cursor] !== "{") return [];
    cursor += 1;
    const seen = new Set();
    const duplicates = new Set();

    while (cursor < text.length) {
      cursor = skipJsonWhitespace(text, cursor);
      if (text[cursor] === "}") break;
      if (text[cursor] !== '"') return [];
      const keyEnd = readJsonStringEnd(text, cursor);
      if (keyEnd < 0) return [];
      let key;
      try {
        key = JSON.parse(text.slice(cursor, keyEnd));
      } catch (_) {
        return [];
      }
      if (seen.has(key)) duplicates.add(key);
      seen.add(key);
      cursor = skipJsonWhitespace(text, keyEnd);
      if (text[cursor] !== ":") return [];
      cursor = skipJsonWhitespace(text, cursor + 1);
      const valueEnd = scanJsonValueEnd(text, cursor);
      if (valueEnd <= cursor) return [];
      cursor = skipJsonWhitespace(text, valueEnd);
      if (text[cursor] === ",") {
        cursor += 1;
        continue;
      }
      if (text[cursor] === "}") break;
      return [];
    }
    return Array.from(duplicates).sort();
  }

  function parseCandidate(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return { parsed: value, raw: JSON.stringify(value), error: "" };
    }
    if (typeof value !== "string" || !value.trim()) {
      return { parsed: null, raw: "", error: "候选为空或不是JSON对象/字符串" };
    }
    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {
          parsed: null,
          raw: value,
          error: "候选根值必须是JSON对象"
        };
      }
      const duplicates = duplicateRootKeys(value);
      if (duplicates.length > 0) {
        return {
          parsed: null,
          raw: value,
          error: `候选根对象存在重复键：${duplicates.join("、")}`
        };
      }
      return { parsed, raw: value, error: "" };
    } catch (error) {
      return {
        parsed: null,
        raw: value,
        error: `候选不能被JSON.parse直接解析：${String(
          error && error.message ? error.message : error
        )}`
      };
    }
  }

  function parsePool(value) {
    if (typeof value === "string") {
      if (!value.trim()) return { pool: {}, error: "evidence_pool为空" };
      try {
        const parsed = JSON.parse(value);
        return {
          pool: parsed && typeof parsed === "object" ? parsed : {},
          error:
            parsed && typeof parsed === "object"
              ? ""
              : "evidence_pool根值不是对象或数组"
        };
      } catch (error) {
        return {
          pool: {},
          error: `evidence_pool不能被JSON.parse直接解析：${String(
            error && error.message ? error.message : error
          )}`
        };
      }
    }
    if (value && typeof value === "object") return { pool: value, error: "" };
    return { pool: {}, error: "evidence_pool为空或不是对象" };
  }

  function poolRecords(pool) {
    if (Array.isArray(pool)) return pool;
    if (Array.isArray(pool.records)) return pool.records;
    const records = [];
    for (const lane of [
      "guideline_a",
      "guideline_b",
      "clinical_study_initial",
      "clinical_study_supplement",
      "irae_a",
      "irae_b"
    ]) {
      if (!Array.isArray(pool[lane])) continue;
      records.push(
        ...pool[lane].filter(
          (record) => record && typeof record === "object" && !Array.isArray(record)
        )
      );
    }
    return records;
  }

  function locatorKey(docId, splitIndex) {
    return `${String(docId)}::${String(splitIndex)}`;
  }

  function recordHardType(record) {
    if (["指南", "临床研究"].includes(record.hard_evidence_type)) {
      return record.hard_evidence_type;
    }
    const type = String(record.type || "").toLowerCase();
    if (type === "guideline" && nonEmptyString(record.authority)) return "指南";
    if (
      (record.lane === "clinical_study_initial" ||
        record.lane === "clinical_study_supplement") &&
      record.eligible_clinical_study === true
    ) {
      return "临床研究";
    }
    return "";
  }

  function recordReasoningEligible(record) {
    return record.reasoning_eligible === true || Boolean(recordHardType(record));
  }

  function forbiddenAnswerLetter(text) {
    const value = String(text === null || text === undefined ? "" : text);
    return (
      /正确答案(?:为|是|：|:)?\s*[ABCD](?![A-Za-z])/i.test(value) ||
      /选项\s*[ABCD](?![A-Za-z])/i.test(value) ||
      /[ABCD]\s*项(?![A-Za-z])/i.test(value)
    );
  }

  function hasAuditableQuestion(questions) {
    if (!Array.isArray(questions)) return false;
    return questions.some((question) => {
      if (!question || typeof question !== "object" || Array.isArray(question)) {
        return false;
      }
      if (nonEmptyString(question.question)) return true;
      if (Array.isArray(question.options) && question.options.some(nonEmptyString)) {
        return true;
      }
      return ["answer_text", "explain", "keyPoint", "timepoint"].some((field) =>
        nonEmptyString(question[field])
      );
    });
  }

  function blankReference(summary) {
    return {
      evidence_type: "",
      doc_id: "",
      split_index: "",
      type: "",
      authority: "",
      source_title: "",
      source_version: "",
      source_section: "",
      source_url: "",
      evidence_summary: ""
    };
  }

  function hydrateQuestion(question, record, evidenceType) {
    if (!question || typeof question !== "object" || Array.isArray(question)) {
      return question;
    }
    const hydrated = {};
    for (const field of PUBLIC_QUESTION_FIELDS) {
      if (hasOwn(question, field)) hydrated[field] = question[field];
    }
    const reference = blankReference(question.evidence_summary);
    if (record) {
      reference.evidence_summary = typeof question.evidence_summary === "string" ? question.evidence_summary : "";
      reference.evidence_type = evidenceType;
      reference.doc_id = hasOwn(record, "doc_id") ? record.doc_id : "";
      reference.split_index = hasOwn(record, "split_index")
        ? record.split_index
        : "";
      reference.type = typeof record.type === "string" ? record.type : "";
      reference.authority =
        typeof record.authority === "string" ? record.authority : "";
      reference.source_title =
        typeof record.source_title === "string" ? record.source_title : "";
      reference.source_version =
        typeof record.source_version === "string" ? record.source_version : "";
      reference.source_section =
        typeof record.source_section === "string" ? record.source_section : "";
      reference.source_url =
        typeof record.source_url === "string" ? record.source_url : "";
    }
    hydrated.guidelineRef = reference;
    return hydrated;
  }

  function validatorFullPool(pool, records) {
    const lanes =
      pool && pool.lanes && typeof pool.lanes === "object" && !Array.isArray(pool.lanes)
        ? pool.lanes
        : Object.fromEntries(
            [
              "guideline_a",
              "guideline_b",
              "clinical_study_initial",
              "clinical_study_supplement",
              "irae_a",
              "irae_b"
            ].map((lane) => [
              lane,
              records
                .filter((record) => record && record.lane === lane)
                .map((record) => record.evidence_id)
            ])
          );
    return {
      audit_mode: "FULL_POOL_FOR_INSUFFICIENCY",
      contract_version: pool.contract_version || "1.2",
      records,
      lanes,
      capacity_report:
        pool && pool.capacity_report && typeof pool.capacity_report === "object"
          ? pool.capacity_report
          : {},
      retrieval_health:
        pool && pool.retrieval_health && typeof pool.retrieval_health === "object"
          ? pool.retrieval_health
          : { ok: false, errors: [{ lane: "registry", message: "缺少检索健康状态" }] },
      compression_report:
        pool && pool.compression_report && typeof pool.compression_report === "object"
          ? pool.compression_report
          : {}
    };
  }

  function serializeValidatorEvidence(evidence) {
    const full = (rows) => (Array.isArray(rows) ? rows : []).map(({raw_snippet, ...r}) => ({...r, snippet: typeof raw_snippet === "string" ? raw_snippet : r.snippet}));
    if (Array.isArray(evidence)) return full(evidence);
    if (evidence && typeof evidence === "object") return {...evidence, records:full(evidence.records)};
    return [];
  }

  function buildReturn({
    decision,
    medicalAuditable,
    publicCandidate,
    internalRaw,
    citedRecords,
    validatorEvidence,
    hardCount,
    reasoningCount
  }) {
    if (publicCandidate) { const c=classifyTumor(inputs.second_cancer_type); publicCandidate.cancer_type=c.cancer_type; publicCandidate.second_cancer_type=c.second_cancer_type; warnings.push(...c.taxonomy_warnings); }
    const publicRaw = publicCandidate ? JSON.stringify(publicCandidate) : "";
    const publicReferenceMap =
      publicCandidate && Array.isArray(publicCandidate.questions)
        ? publicCandidate.questions
            .filter((question) => question && typeof question === "object" && !Array.isArray(question))
            .map((question) => ({
              id: typeof question.id === "string" ? question.id : "",
              guidelineRef:
                question.guidelineRef && typeof question.guidelineRef === "object"
                  ? question.guidelineRef
                  : blankReference("")
            }))
        : [];
    const recommendedRevisionMode =
      errors.length === 0
        ? ""
        : requiresFullRevision
          ? "FULL"
          : "PATCH";
    return {
      structure_decision: decision,
      structure_errors: errors,
      structure_warnings: warnings,
      medical_auditable: medicalAuditable,
      candidate_json_passthrough: publicRaw,
      public_reference_map_json: JSON.stringify(publicReferenceMap),
      internal_candidate_json: internalRaw,
      cited_evidence: citedRecords,
      cited_evidence_json: JSON.stringify(citedRecords),
      validator_evidence_json: JSON.stringify(serializeValidatorEvidence(validatorEvidence)),
      repair_tasks: repairTasks,
      repair_tasks_json: JSON.stringify(repairTasks),
      recommended_revision_mode: recommendedRevisionMode,
      hard_evidence_count: hardCount,
      clinical_reasoning_count: reasoningCount
    };
  }

  const candidateResult = parseCandidate(source.candidate_json);
  const poolResult = parsePool(source.evidence_pool);
  const records = poolRecords(poolResult.pool).filter(
    (record) => record && typeof record === "object" && !Array.isArray(record)
  );

  if (candidateResult.error) {
    fail(
      candidateResult.error,
      rootTask("JSON_PARSE", ROOT_FIELDS, "输出一个可被JSON.parse直接解析的完整内部候选对象")
    );
    return buildReturn({
      decision: "FAIL",
      medicalAuditable: false,
      publicCandidate: null,
      internalRaw: candidateResult.raw,
      citedRecords: [],
      validatorEvidence: [],
      hardCount: 0,
      reasoningCount: 0
    });
  }

  const candidate = candidateResult.parsed;
  const questions = Array.isArray(candidate.questions) ? candidate.questions : [];
  // Warning-only: the independent reviewer decides whether the wording leaks the answer.
  questions.forEach((q, index) => {
    const style = optionStyleMetrics(q);
    if (style && style.warnings.length) warnings.push(
      'OPTION_STYLE ' + (q.id || 'Q' + (index + 1)) +
      '：四项有效字符数=' + style.option_lengths.join('/') +
      '，正确项=' + style.answer_position + '；' + style.warnings.join(' ')
    );
  });
  if(questions.length > 0 && questions.length < 5) warnings.push('FIVE_QUESTION_GAP：目前'+questions.length+'题，仍需补齐'+(5-questions.length)+'个独立决策；结构通过不代表五题任务完成');
  const medicalAuditable =
    candidate.generation_status === "insufficient" || hasAuditableQuestion(questions);

  if (poolResult.error) {
    fail(
      poolResult.error,
      rootTask(
        "EVIDENCE_POOL_INVALID",
        ["evidence_pool"],
        "修复证据池输入后重新装配，禁止猜测来源元数据"
      )
    );
  } else {
    const health = poolResult.pool && poolResult.pool.retrieval_health;
    if (!health || typeof health !== "object" || typeof health.ok !== "boolean") {
      fail(
        "证据池缺少可核验的retrieval_health状态",
        rootTask("RETRIEVAL_HEALTH_MISSING", ["evidence_pool"], "修复检索错误接线与证据注册后重新执行")
      );
    } else if (health.ok !== true) {
      const messages = Array.isArray(health.errors)
        ? health.errors
            .map((item) => `${String(item && item.lane ? item.lane : "unknown")}: ${String(item && item.message ? item.message : "检索失败")}`)
            .join("；")
        : "检索节点返回错误";
      fail(
        `证据检索链存在技术错误：${messages}`,
        rootTask("RETRIEVAL_FAILURE", ["evidence_pool"], "修复检索工具错误后重新运行；不得把技术空结果判为医学证据不足")
      );
    }
  }

  for (const field of ROOT_FIELDS) {
    if (!hasOwn(candidate, field)) {
      fail(
        `根对象缺少字段：${field}`,
        rootTask("ROOT_FIELD_MISSING", [field], `补齐根字段${field}`)
      );
    }
  }
  if (candidate.schema_version !== "1.1") {
    fail(
      "schema_version必须逐字等于1.1",
      rootTask("SCHEMA_VERSION", ["schema_version"], "schema_version固定为1.1")
    );
  }
  if (candidate.difficulty !== "进阶") {
    fail(
      "difficulty必须逐字等于进阶",
      rootTask("DIFFICULTY", ["difficulty"], "difficulty固定为进阶")
    );
  }
  if (typeof candidate.case_summary !== "string") {
    fail(
      "case_summary必须为字符串",
      rootTask("CASE_SUMMARY_TYPE", ["case_summary"], "输出脱敏且忠实的病例摘要")
    );
  } else if (!candidate.case_summary.trim()) {
    fail(
      "case_summary必须为非空字符串",
      rootTask("CASE_SUMMARY_EMPTY", ["case_summary"], "输出非空、脱敏且忠实的病例摘要")
    );
  } else if (candidate.case_summary.length > 400) {
    fail(
      "case_summary超过400字",
      rootTask("CASE_SUMMARY_LENGTH", ["case_summary"], "在不改写病例事实的前提下将摘要限制在400字内")
    );
  }

  const publicCandidate = {};
  for (const field of ROOT_FIELDS) {
    if (field !== "questions" && hasOwn(candidate, field)) {
      publicCandidate[field] = candidate[field];
    }
  }

  if (candidate.generation_status === "insufficient") {
    if (candidate.question_count !== 0) {
      fail(
        "insufficient时question_count必须为0",
        rootTask("INSUFFICIENT_COUNT", ["question_count"], "insufficient时题量固定为0")
      );
    }
    if (!Array.isArray(candidate.questions) || candidate.questions.length !== 0) {
      fail(
        "insufficient时questions必须为空数组",
        rootTask("INSUFFICIENT_QUESTIONS", ["questions"], "insufficient时不得夹带候选题")
      );
    }
    if (
      !Array.isArray(candidate.missing_information) ||
      candidate.missing_information.length === 0 ||
      candidate.missing_information.some((item) => !nonEmptyString(item))
    ) {
      fail(
        "insufficient时missing_information必须为具体的非空字符串数组",
        rootTask(
          "INSUFFICIENT_MISSING_INFORMATION",
          ["missing_information"],
          "列明缺少的证据类型、适用人群或独立决策方向"
        )
      );
    }
    if (!nonEmptyString(candidate.risk_message)) {
      fail(
        "insufficient时risk_message必须具体且非空",
        rootTask("INSUFFICIENT_RISK", ["risk_message"], "具体说明为何无法形成任何题目")
      );
    }
    publicCandidate.questions = [];
    return buildReturn({
      decision: errors.length === 0 ? "INSUFFICIENT" : "FAIL",
      medicalAuditable,
      publicCandidate,
      internalRaw: candidateResult.raw,
      citedRecords: [],
      validatorEvidence: validatorFullPool(poolResult.pool, records),
      hardCount: 0,
      reasoningCount: 0
    });
  }

  if (candidate.generation_status !== "success") {
    fail(
      "generation_status只能为success或insufficient",
      rootTask(
        "GENERATION_STATUS",
        ["generation_status"],
        "根据实际结果输出success或insufficient"
      )
    );
  }
  if (!Array.isArray(candidate.questions) || candidate.questions.length < 1 || candidate.questions.length > 5 || candidate.question_count !== candidate.questions.length) {
    fail("success时必须有1至5题，question_count等于实际长度", rootTask("QUESTION_COUNT", ["question_count", "questions"], "保留实际题目并校正数量，不复制题目凑数"));
  }
  const evidenceById = new Map();
  const evidenceByLocator = new Map();
  for (const record of records) {
    const evidenceId = record.evidence_id;
    if (nonEmptyString(evidenceId)) {
      const list = evidenceById.get(evidenceId) || [];
      list.push(record);
      evidenceById.set(evidenceId, list);
    }
    if (hasOwn(record, "doc_id") && hasOwn(record, "split_index")) {
      const locator = locatorKey(record.doc_id, record.split_index);
      const list = evidenceByLocator.get(locator) || [];
      list.push(record);
      evidenceByLocator.set(locator, list);
    }
  }

  const hydratedQuestions = [];
  const citedRecords = [];
  const citedEvidenceIds = new Set();
  const locatorUsage = new Map();
  let hardCount = 0;
  let reasoningCount = 0;

  const extensionIds=questions.filter(q=>/^【延伸情境】/.test(q?.question||'')).map(q=>q.id);
  if(extensionIds.length>2) fail('延伸情境题超过2道',setTask('TOO_MANY_EXTENSIONS',extensionIds,'最多2道延伸题；其余改为有真实依据的病例题，不得删除标记冒充真实病例'));
  for (let index = 0; index < questions.length; index++) {
    const question = questions[index];
    const expectedId = `Q${index + 1}`;
    const taskId =
      question && typeof question === "object" && /^Q[1-5]$/.test(String(question.id))
        ? String(question.id)
        : expectedId;

    if (!question || typeof question !== "object" || Array.isArray(question)) {
      fail(
        `第${index + 1}题不是对象`,
        setTask("QUESTION_NOT_OBJECT", [expectedId], `完整重建${expectedId}`)
      );
      hydratedQuestions.push(question);
      continue;
    }

    if(Array.isArray(question.options) && question.options.some(s=>typeof s==='string' && /^[A-D]\s*[)）.、：:]/.test(s))) fail(taskId+'：选项正文不得重复字母前缀',questionTask(taskId,'OPTION_PREFIX',['options','answer_text'],'去掉选项正文前缀并同步answer_text，保持解析字母对应'));
    for(const message of teachingErrors(question)) fail(taskId+'：'+message,questionTask(taskId,'OPTION_EXPLANATION_OR_SCENARIO',['question','explain'],message));
    for (const field of INTERNAL_QUESTION_FIELDS) {
      if (!hasOwn(question, field)) {
        fail(
          `${taskId}缺少字段：${field}`,
          questionTask(taskId, "QUESTION_FIELD_MISSING", [field], `补齐${taskId}.${field}`)
        );
      }
    }
    const forbiddenFields = FORBIDDEN_MODEL_METADATA.filter((field) =>
      hasOwn(question, field)
    );
    if (forbiddenFields.length > 0) {
      fail(
        `${taskId}包含禁止由模型填写的来源元数据：${forbiddenFields.join("、")}`,
        questionTask(
          taskId,
          "MODEL_SUPPLIED_EVIDENCE_METADATA",
          forbiddenFields,
          "删除模型填写的来源元数据，只保留evidence_id、support_mode与evidence_summary"
        )
      );
    }
    if (question.id !== expectedId) {
      fail(
        `第${index + 1}题id必须为${expectedId}`,
        setTask("QUESTION_ID_SEQUENCE", questions.map((item, i) => `Q${i + 1}`), "按实际长度连续编号Q1至QN（N≤5）")
      );
    }
    if (!ABILITY_TYPES.has(question.type)) {
      fail(
        `${taskId}的type不在六项允许值中`,
        questionTask(taskId, "ABILITY_TYPE", ["type"], "将type改为匹配主要能力的允许值")
      );
    }
    for (const field of [
      "phase",
      "timepoint",
      "question",
      "answer_text",
      "explain",
      "keyPoint",
      "evidence_id",
      "support_mode",
      "evidence_summary"
    ]) {
      if (!nonEmptyString(question[field])) {
        fail(
          `${taskId}的${field}必须为非空字符串`,
          questionTask(taskId, "EMPTY_FIELD", [field], `补齐${taskId}.${field}`)
        );
      }
    }

    if (!Array.isArray(question.options) || question.options.length !== 4) {
      fail(
        `${taskId}的options必须恰好4项`,
        questionTask(taskId, "OPTION_COUNT", ["options", "answer", "answer_text"], "重建4个选项并同步答案")
      );
    } else {
      if (question.options.some((option) => !nonEmptyString(option))) {
        fail(
          `${taskId}存在空选项或非字符串选项`,
          questionTask(taskId, "EMPTY_OPTION", ["options", "answer", "answer_text"], "重建4个非空字符串选项并同步答案")
        );
      }
      const normalizedOptions = question.options.map(normalizedText);
      if (new Set(normalizedOptions).size !== 4) {
        fail(
          `${taskId}存在重复选项`,
          questionTask(taskId, "DUPLICATE_OPTIONS", ["options", "answer", "answer_text"], "重建4个互不重复的选项并同步答案")
        );
      }
      if (
        question.options.some((option) =>
          /以上(?:都|全|均)(?:是|正确)|以上(?:都|均)不是/.test(String(option))
        )
      ) {
        fail(
          `${taskId}包含以上都是/以上都不是类选项`,
          questionTask(taskId, "SHORTCUT_OPTION", ["options", "answer", "answer_text"], "用独立且可判断的临床干扰项替换捷径选项")
        );
      }
      question.options.forEach((option, optionIndex) => {
        if (typeof option === "string" && option.length > 60) {
          fail(
            `${taskId}选项${optionIndex + 1}超过60字`,
            questionTask(taskId, "OPTION_LENGTH", ["options", "answer", "answer_text"], "在不改变医学结论的前提下将每个选项限制在60字内")
          );
        }
      });
    }

    if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) {
      fail(
        `${taskId}的answer必须为0至3整数`,
        questionTask(taskId, "ANSWER_INDEX", ["options", "answer", "answer_text"], "修复答案索引并同步answer_text")
      );
    } else if (
      !Array.isArray(question.options) ||
      question.answer_text !== question.options[question.answer]
    ) {
      fail(
        `${taskId}的answer_text与options[answer]不逐字一致`,
        questionTask(taskId, "ANSWER_TEXT_MISMATCH", ["options", "answer", "answer_text"], "使answer_text逐字等于options[answer]")
      );
    }

    if (forbiddenAnswerLetter(question.keyPoint)) {
      fail(
        `${taskId}的keyPoint含答案字母引用`,
        questionTask(taskId, "ANSWER_LETTER_REFERENCE", ["keyPoint"], "删除keyPoint中的选项字母指代，explain保留四行字母标记")
      );
    }
    for (const [field, limit] of [
      ["question", 160],
      ["explain", 800],
      ["keyPoint", 70],
      ["evidence_summary", 80]
    ]) {
      if (typeof question[field] === "string" && question[field].length > limit) {
        fail(
          `${taskId}的${field}超过${limit}字`,
          questionTask(taskId, `${field.toUpperCase()}_LENGTH`, [field], `在不改变医学结论的前提下将${field}限制在${limit}字内`)
        );
      }
    }

    if (!SUPPORT_MODES.has(question.support_mode)) {
      fail(
        `${taskId}的support_mode只能为hard或clinical_reasoning`,
        questionTask(taskId, "SUPPORT_MODE", ["support_mode", "evidence_id", "evidence_summary"], "根据实际证据重新选择允许的support_mode")
      );
    }

    const matches = nonEmptyString(question.evidence_id)
      ? evidenceById.get(question.evidence_id) || []
      : [];
    let record = null;
    let evidenceType = "";
    if (matches.length !== 1) {
      fail(
        `${taskId}的evidence_id在证据池中匹配${matches.length}条，必须恰好1条`,
        questionTask(taskId, "EVIDENCE_ID_NOT_UNIQUE", ["evidence_id", "support_mode", "evidence_summary"], "改用证据池中可唯一定位且直接支持答案的evidence_id")
      );
    } else {
      record = matches[0];
      if(!nonEmptyString(record.raw_snippet) && !nonEmptyString(record.snippet)) fail(taskId+'：引用正文为空',questionTask(taskId,'EMPTY_EVIDENCE_TEXT',FULL_INTERNAL_FIELDS,'更换为有正文且支持结论的记录'));
      const locator = locatorKey(record.doc_id, record.split_index);
      const locatorMatches = evidenceByLocator.get(locator) || [];
      if (locatorMatches.length !== 1) {
        fail(
          `${taskId}绑定记录的doc_id+split_index在证据池中匹配${locatorMatches.length}条`,
          rootTask("EVIDENCE_LOCATOR_NOT_UNIQUE", ["evidence_pool"], "修复证据注册去重后重新装配")
        );
      }
      if (question.support_mode === "clinical_reasoning") {
        evidenceType = "病例+临床推理";
        if (!recordReasoningEligible(record)) {
          fail(
            `${taskId}声明clinical_reasoning，但绑定记录未被证据注册节点确认为可引用来源`,
            questionTask(taskId, "REASONING_EVIDENCE_INELIGIBLE", FULL_INTERNAL_FIELDS, "用合格指南、原始研究或身份可机械确认的高质量二级资料完整重建该题")
          );
        } else {
          reasoningCount += 1;
        }
      } else if (question.support_mode === "hard") {
        evidenceType = recordHardType(record);
        if (!evidenceType) {
          fail(
            `${taskId}声明hard，但绑定记录未被证据注册节点确定为合格指南或临床研究`,
            questionTask(taskId, "HARD_EVIDENCE_INELIGIBLE", FULL_INTERNAL_FIELDS, "用合格硬证据完整重建该题，或在非高风险结论下改为真实的临床推理题")
          );
        } else {
          hardCount += 1;
        }
      }
      if (!nonEmptyString(record.source_title)) {
        fail(
          `${taskId}绑定记录缺少source_title`,
          rootTask("SOURCE_TITLE_MISSING", ["evidence_pool"], "修复证据注册的正式来源名称后重新装配")
        );
      }
      if (!nonEmptyString(record.doc_id)) {
        fail(
          `${taskId}绑定记录缺少doc_id`,
          rootTask("DOC_ID_MISSING", ["evidence_pool"], "修复证据注册定位后重新装配")
        );
      }
      if (!hasOwn(record, "split_index") || record.split_index === "") {
        fail(
          `${taskId}绑定记录缺少split_index`,
          rootTask("SPLIT_INDEX_MISSING", ["evidence_pool"], "修复证据注册定位后重新装配")
        );
      }

      const uses = locatorUsage.get(locator) || [];
      uses.push({
        id: taskId,
        timepoint: question.timepoint,
        answer_text: question.answer_text,
        keyPoint: question.keyPoint
      });
      locatorUsage.set(locator, uses);
      if (!citedEvidenceIds.has(record.evidence_id)) {
        citedEvidenceIds.add(record.evidence_id);
        citedRecords.push(record);
      }
    }

    hydratedQuestions.push(hydrateQuestion(question, record, evidenceType));
  }

  for (const [locator, uses] of locatorUsage.entries()) {
    if (uses.length > 1) warnings.push(`同一证据定位${locator}支持${uses.length}题：复核是否考查不同真实决策；不设置复用题数配额`);
  }
  // Evidence counts are diagnostic only; no hard/reasoning quota.
  publicCandidate.questions = hydratedQuestions;
  for (const question of hydratedQuestions) {
    if (!question || typeof question !== "object" || Array.isArray(question)) continue;
    const ref = question.guidelineRef;
    if (!ref || typeof ref !== "object" || Array.isArray(ref)) {
      fail(
        `${question.id || "题目"}装配后的guidelineRef无效`,
        rootTask("HYDRATION_FAILED", ["guidelineRef"], "修复装配节点后重新执行")
      );
      continue;
    }
    for (const field of REF_FIELDS) {
      if (!hasOwn(ref, field)) {
        fail(
          `${question.id || "题目"}装配后的guidelineRef缺少${field}`,
          rootTask("HYDRATED_REF_FIELD_MISSING", [field], "修复确定性证据装配")
        );
      }
    }
  }

  return buildReturn({
    decision: errors.length === 0 ? "PASS" : "FAIL",
    medicalAuditable,
    publicCandidate,
    internalRaw: candidateResult.raw,
    citedRecords,
    validatorEvidence: citedRecords,
    hardCount,
    reasoningCount
  });
}
