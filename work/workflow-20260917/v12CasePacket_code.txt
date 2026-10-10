const TUMOR_DISPLAY_MAP = {"乳腺叶状肿瘤": "胸部肿瘤", "乳腺癌": "胸部肿瘤", "乳腺肉瘤": "胸部肿瘤", "儿童心脏肿瘤": "", "儿童早期肿瘤": "", "儿童星形细胞瘤": "", "儿童横纹肌肉瘤": "", "儿童罕见癌症": "", "儿童血管瘤": "", "儿童颅咽管瘤": "", "原位导管癌": "", "原发灶不明的转移癌": "", "复发性癌症": "", "恶性间皮瘤": "", "未知原发性癌症": "", "纵隔肿瘤": "", "转移性肿瘤": "", "青少年癌症": "", "气管支气管瘤": "胸部肿瘤", "胸腺瘤": "胸部肿瘤", "胸膜间皮瘤": "胸部肿瘤", "上呼吸消化道恶性黑色素瘤": "头颈部肿瘤", "下咽癌": "头颈部肿瘤", "口咽癌": "头颈部肿瘤", "唇和口腔癌": "头颈部肿瘤", "唾液腺癌": "头颈部肿瘤", "喉癌": "头颈部肿瘤", "头颈部皮肤癌": "头颈部肿瘤", "头颈部鳞癌": "头颈部肿瘤", "扁桃体恶性肿瘤": "头颈部肿瘤", "甲状腺癌": "头颈部肿瘤", "耳部恶性肿瘤": "头颈部肿瘤", "隐性原发转移的鳞状颈癌": "头颈部肿瘤", "颌骨恶性肿瘤": "头颈部肿瘤", "鼻咽癌": "头颈部肿瘤", "鼻腔和（副）鼻窦癌症": "头颈部肿瘤", "心包肿瘤": "", "心脏肿瘤": "", "尿路上皮癌": "泌尿系肿瘤", "尿道癌": "泌尿系肿瘤", "肾盂和输尿管移行细胞癌": "泌尿系肿瘤", "肾细胞癌": "泌尿系肿瘤", "膀胱癌": "泌尿系肿瘤", "Vater壶腹癌": "消化系统肿瘤", "壶腹周围癌": "消化系统肿瘤", "大肠癌": "消化系统肿瘤", "小肠癌": "消化系统肿瘤", "直肠癌": "消化系统肿瘤", "结直肠癌": "消化系统肿瘤", "结肠癌": "消化系统肿瘤", "肛周皮肤癌": "消化系统肿瘤", "肛管肿瘤": "消化系统肿瘤", "肛门肿瘤": "消化系统肿瘤", "肝癌": "消化系统肿瘤", "胃癌": "消化系统肿瘤", "胆道恶性肿瘤": "消化系统肿瘤", "胰腺癌": "消化系统肿瘤", "阑尾肿瘤": "消化系统肿瘤", "食管癌": "消化系统肿瘤", "食管胃交界处肿瘤": "消化系统肿瘤", "前列腺癌": "泌尿系肿瘤", "卵巢癌": "妇科肿瘤", "外阴癌": "妇科肿瘤", "子宫内膜癌": "妇科肿瘤", "宫颈癌": "妇科肿瘤", "性腺外生殖细胞肿瘤": "", "滋养细胞肿瘤": "妇科肿瘤", "睾丸癌": "泌尿系肿瘤", "纵隔生殖细胞瘤": "", "胎盘恶性肿瘤": "妇科肿瘤", "输卵管癌": "妇科肿瘤", "阴茎癌": "泌尿系肿瘤", "阴道癌": "妇科肿瘤", "颅外生殖细胞肿瘤": "", "乳头状瘤病": "皮肤肿瘤", "皮肤基底细胞癌": "皮肤肿瘤", "皮肤鳞状细胞癌": "皮肤肿瘤", "蕈样肉芽肿": "皮肤肿瘤", "黑色素瘤": "皮肤肿瘤", "默克尔细胞癌": "皮肤肿瘤", "泪腺癌": "眼部肿瘤", "眼内黑色素瘤": "眼部肿瘤", "眼眶肉瘤": "眼部肿瘤", "眼睑癌": "眼部肿瘤", "结膜癌": "眼部肿瘤", "结膜黑色素瘤": "眼部肿瘤", "视网膜母细胞瘤": "眼部肿瘤", "副神经节瘤": "神经内分泌肿瘤", "十二指肠和Vater壶腹神经内分泌肿瘤": "神经内分泌肿瘤", "嗜铬细胞瘤": "神经内分泌肿瘤", "垂体瘤": "神经内分泌肿瘤", "多发性内分泌肿瘤综合征": "神经内分泌肿瘤", "梅克尔细胞癌": "神经内分泌肿瘤", "甲状旁腺癌": "神经内分泌肿瘤", "神经母细胞瘤": "神经内分泌肿瘤", "空肠回肠神经内分泌肿瘤": "神经内分泌肿瘤", "结肠、直肠神经内分泌肿瘤": "神经内分泌肿瘤", "肾上腺皮质癌": "神经内分泌肿瘤", "肾上腺神经内分泌肿瘤": "神经内分泌肿瘤", "胃神经内分泌肿瘤": "神经内分泌肿瘤", "胰腺神经内分泌肿瘤": "神经内分泌肿瘤", "阑尾神经内分泌肿瘤": "神经内分泌肿瘤", "非典型畸胎瘤": "神经内分泌肿瘤", "肺癌": "胸部肿瘤", "室管膜瘤": "头颈部肿瘤", "神经纤维瘤": "头颈部肿瘤", "脑干胶质瘤": "头颈部肿瘤", "脑胶质瘤": "头颈部肿瘤", "脑膜瘤": "头颈部肿瘤", "髓母细胞瘤": "头颈部肿瘤", "原发性腹膜癌": "", "腹膜间皮瘤": "", "多发性骨髓瘤": "血液肿瘤", "恶性免疫增生性疾病": "血液肿瘤", "慢性骨髓增殖性肿瘤": "血液肿瘤", "淋巴瘤": "血液肿瘤", "白血病": "血液肿瘤", "组织细胞增多症": "血液肿瘤", "骨髓增殖性肿瘤": "血液肿瘤", "骨髓增生异常综合征": "血液肿瘤", "卡波西肉瘤": "骨与软组织肿瘤", "四肢和躯干软组织肉瘤": "骨与软组织肿瘤", "胃肠道间质瘤": "骨与软组织肿瘤", "腹膜后软组织肉瘤": "骨与软组织肿瘤", "腹部和胸腔内脏器官软组织肉瘤": "骨与软组织肿瘤", "血管瘤": "骨与软组织肿瘤", "尤文氏肉瘤": "骨与软组织肿瘤", "恶性骨巨细胞瘤": "骨与软组织肿瘤", "未分化多形性肉瘤": "骨与软组织肿瘤", "脊索瘤": "骨与软组织肿瘤", "软骨肉瘤": "骨与软组织肿瘤", "骨肉瘤": "骨与软组织肿瘤"};

function classifyTumor(value) {
  const second = typeof value === 'string' ? value.trim() : '';
  if (!second || !Object.prototype.hasOwnProperty.call(TUMOR_DISPLAY_MAP, second))
    return { cancer_type:'', second_cancer_type:'', taxonomy_warnings:[second ? '二级癌种不在CSV字典：'+second : '未确定原发肿瘤对应的二级癌种'] };
  const first = TUMOR_DISPLAY_MAP[second];
  return { cancer_type:first, second_cancer_type:second, taxonomy_warnings:first ? [] : ['二级癌种已确定，但一级归属尚未确认：'+second] };
}
function main(inputs) {
  const source = inputs && typeof inputs === "object" ? inputs : {};
  const LONG_FIELDS = [
    "case_context",
    "case_timeline",
    "biomarkers",
    "learning_points",
    "decision_points",
    "adverse_events",
    "evidence_notes"
  ];
  const LABELS = {
    case_id: "病例ID", cancer_type: "展示癌种", second_cancer_type: "二级原发癌种",
    case_title: "病例标题",
    disease: "疾病与病理分期",
    case_mode: "病例模式",
    case_context: "病例背景",
    case_timeline: "病例时间线",
    biomarkers: "病理与生物标志物",
    learning_points: "教学重点",
    decision_points: "临床决策点",
    adverse_events: "不良反应",
    evidence_notes: "证据与不确定性备注"
  };

  function firstDefined(keys) {
    for (const key of keys) {
      if (
        Object.prototype.hasOwnProperty.call(source, key) &&
        source[key] !== null &&
        source[key] !== undefined
      ) {
        return source[key];
      }
    }
    return "";
  }

  function stringValue(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    return "";
  }

  function splitParagraphs(value) {
    const text = stringValue(value).replace(/\r\n?/g, "\n").trim();
    if (!text) return [];
    return text
      .split(/\n[ \t]*\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }

  function comparisonKey(paragraph) {
    return paragraph.replace(/\s+/g, " ").trim();
  }

  const packet = {
    ...classifyTumor(source.second_cancer_type),
    case_id: stringValue(firstDefined(["case_id"])),
    case_title: stringValue(firstDefined(["case_title", "title"])),
    disease: stringValue(firstDefined(["disease"])),
    case_mode: stringValue(firstDefined(["case_mode", "mode"])),
    case_context: "",
    case_timeline: "",
    biomarkers: "",
    learning_points: "",
    decision_points: "",
    adverse_events: "",
    evidence_notes: ""
  };
  const fieldInputs = {
    case_context: firstDefined(["case_context", "context"]),
    case_timeline: firstDefined(["case_timeline", "timeline"]),
    biomarkers: firstDefined(["biomarkers"]),
    learning_points: firstDefined(["learning_points"]),
    decision_points: firstDefined(["decision_points"]),
    adverse_events: firstDefined(["adverse_events"]),
    evidence_notes: firstDefined(["evidence_notes"])
  };

  const firstOccurrence = new Map();
  const duplicates = [];
  let inputParagraphCount = 0;
  let outputParagraphCount = 0;

  for (const field of LONG_FIELDS) {
    const kept = [];
    const paragraphs = splitParagraphs(fieldInputs[field]);
    inputParagraphCount += paragraphs.length;
    paragraphs.forEach((paragraph, paragraphIndex) => {
      const key = comparisonKey(paragraph);
      if (firstOccurrence.has(key)) {
        duplicates.push({
          field,
          paragraph_index: paragraphIndex,
          duplicate_of: firstOccurrence.get(key)
        });
        return;
      }
      firstOccurrence.set(key, { field, paragraph_index: paragraphIndex });
      kept.push(paragraph);
      outputParagraphCount += 1;
    });
    packet[field] = kept.join("\n\n");
  }

  const casePacketText = Object.entries(packet)
    .filter(([, value]) => typeof value === "string" && value.length > 0)
    .map(([field, value]) => `【${LABELS[field]}】\n${value}`)
    .join("\n\n");
  const dedupeReport = {
    policy: "仅删除规范化空白后完全相同的段落；保留首次出现原文；不摘要、不改写",
    compared_fields: LONG_FIELDS,
    input_paragraph_count: inputParagraphCount,
    output_paragraph_count: outputParagraphCount,
    removed_duplicate_count: duplicates.length,
    duplicates
  };

  return {
    case_packet: packet,
    case_packet_json: JSON.stringify(packet),
    case_packet_text: casePacketText,
    dedupe_report: dedupeReport
  };
}
