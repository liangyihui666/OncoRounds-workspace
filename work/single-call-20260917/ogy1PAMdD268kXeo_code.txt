const TUMOR_DISPLAY_MAP = {"乳腺叶状肿瘤": "胸部肿瘤", "乳腺癌": "胸部肿瘤", "乳腺肉瘤": "胸部肿瘤", "儿童心脏肿瘤": "", "儿童早期肿瘤": "", "儿童星形细胞瘤": "", "儿童横纹肌肉瘤": "", "儿童罕见癌症": "", "儿童血管瘤": "", "儿童颅咽管瘤": "", "原位导管癌": "", "原发灶不明的转移癌": "", "复发性癌症": "", "恶性间皮瘤": "", "未知原发性癌症": "", "纵隔肿瘤": "", "转移性肿瘤": "", "青少年癌症": "", "气管支气管瘤": "胸部肿瘤", "胸腺瘤": "胸部肿瘤", "胸膜间皮瘤": "胸部肿瘤", "上呼吸消化道恶性黑色素瘤": "头颈部肿瘤", "下咽癌": "头颈部肿瘤", "口咽癌": "头颈部肿瘤", "唇和口腔癌": "头颈部肿瘤", "唾液腺癌": "头颈部肿瘤", "喉癌": "头颈部肿瘤", "头颈部皮肤癌": "头颈部肿瘤", "头颈部鳞癌": "头颈部肿瘤", "扁桃体恶性肿瘤": "头颈部肿瘤", "甲状腺癌": "头颈部肿瘤", "耳部恶性肿瘤": "头颈部肿瘤", "隐性原发转移的鳞状颈癌": "头颈部肿瘤", "颌骨恶性肿瘤": "头颈部肿瘤", "鼻咽癌": "头颈部肿瘤", "鼻腔和（副）鼻窦癌症": "头颈部肿瘤", "心包肿瘤": "", "心脏肿瘤": "", "尿路上皮癌": "泌尿系肿瘤", "尿道癌": "泌尿系肿瘤", "肾盂和输尿管移行细胞癌": "泌尿系肿瘤", "肾细胞癌": "泌尿系肿瘤", "膀胱癌": "泌尿系肿瘤", "Vater壶腹癌": "消化系统肿瘤", "壶腹周围癌": "消化系统肿瘤", "大肠癌": "消化系统肿瘤", "小肠癌": "消化系统肿瘤", "直肠癌": "消化系统肿瘤", "结直肠癌": "消化系统肿瘤", "结肠癌": "消化系统肿瘤", "肛周皮肤癌": "消化系统肿瘤", "肛管肿瘤": "消化系统肿瘤", "肛门肿瘤": "消化系统肿瘤", "肝癌": "消化系统肿瘤", "胃癌": "消化系统肿瘤", "胆道恶性肿瘤": "消化系统肿瘤", "胰腺癌": "消化系统肿瘤", "阑尾肿瘤": "消化系统肿瘤", "食管癌": "消化系统肿瘤", "食管胃交界处肿瘤": "消化系统肿瘤", "前列腺癌": "泌尿系肿瘤", "卵巢癌": "妇科肿瘤", "外阴癌": "妇科肿瘤", "子宫内膜癌": "妇科肿瘤", "宫颈癌": "妇科肿瘤", "性腺外生殖细胞肿瘤": "", "滋养细胞肿瘤": "妇科肿瘤", "睾丸癌": "泌尿系肿瘤", "纵隔生殖细胞瘤": "", "胎盘恶性肿瘤": "妇科肿瘤", "输卵管癌": "妇科肿瘤", "阴茎癌": "泌尿系肿瘤", "阴道癌": "妇科肿瘤", "颅外生殖细胞肿瘤": "", "乳头状瘤病": "皮肤肿瘤", "皮肤基底细胞癌": "皮肤肿瘤", "皮肤鳞状细胞癌": "皮肤肿瘤", "蕈样肉芽肿": "皮肤肿瘤", "黑色素瘤": "皮肤肿瘤", "默克尔细胞癌": "皮肤肿瘤", "泪腺癌": "眼部肿瘤", "眼内黑色素瘤": "眼部肿瘤", "眼眶肉瘤": "眼部肿瘤", "眼睑癌": "眼部肿瘤", "结膜癌": "眼部肿瘤", "结膜黑色素瘤": "眼部肿瘤", "视网膜母细胞瘤": "眼部肿瘤", "副神经节瘤": "神经内分泌肿瘤", "十二指肠和Vater壶腹神经内分泌肿瘤": "神经内分泌肿瘤", "嗜铬细胞瘤": "神经内分泌肿瘤", "垂体瘤": "神经内分泌肿瘤", "多发性内分泌肿瘤综合征": "神经内分泌肿瘤", "梅克尔细胞癌": "神经内分泌肿瘤", "甲状旁腺癌": "神经内分泌肿瘤", "神经母细胞瘤": "神经内分泌肿瘤", "空肠回肠神经内分泌肿瘤": "神经内分泌肿瘤", "结肠、直肠神经内分泌肿瘤": "神经内分泌肿瘤", "肾上腺皮质癌": "神经内分泌肿瘤", "肾上腺神经内分泌肿瘤": "神经内分泌肿瘤", "胃神经内分泌肿瘤": "神经内分泌肿瘤", "胰腺神经内分泌肿瘤": "神经内分泌肿瘤", "阑尾神经内分泌肿瘤": "神经内分泌肿瘤", "非典型畸胎瘤": "神经内分泌肿瘤", "肺癌": "胸部肿瘤", "室管膜瘤": "头颈部肿瘤", "神经纤维瘤": "头颈部肿瘤", "脑干胶质瘤": "头颈部肿瘤", "脑胶质瘤": "头颈部肿瘤", "脑膜瘤": "头颈部肿瘤", "髓母细胞瘤": "头颈部肿瘤", "原发性腹膜癌": "", "腹膜间皮瘤": "", "多发性骨髓瘤": "血液肿瘤", "恶性免疫增生性疾病": "血液肿瘤", "慢性骨髓增殖性肿瘤": "血液肿瘤", "淋巴瘤": "血液肿瘤", "白血病": "血液肿瘤", "组织细胞增多症": "血液肿瘤", "骨髓增殖性肿瘤": "血液肿瘤", "骨髓增生异常综合征": "血液肿瘤", "卡波西肉瘤": "骨与软组织肿瘤", "四肢和躯干软组织肉瘤": "骨与软组织肿瘤", "胃肠道间质瘤": "骨与软组织肿瘤", "腹膜后软组织肉瘤": "骨与软组织肿瘤", "腹部和胸腔内脏器官软组织肉瘤": "骨与软组织肿瘤", "血管瘤": "骨与软组织肿瘤", "尤文氏肉瘤": "骨与软组织肿瘤", "恶性骨巨细胞瘤": "骨与软组织肿瘤", "未分化多形性肉瘤": "骨与软组织肿瘤", "脊索瘤": "骨与软组织肿瘤", "软骨肉瘤": "骨与软组织肿瘤", "骨肉瘤": "骨与软组织肿瘤"};

function classifyTumor(value) {
  const second = typeof value === 'string' ? value.trim() : '';
  if (!second || !Object.prototype.hasOwnProperty.call(TUMOR_DISPLAY_MAP, second))
    return { cancer_type:'', second_cancer_type:'', taxonomy_warnings:[second ? '二级癌种不在CSV字典：'+second : '未确定原发肿瘤对应的二级癌种'] };
  const first = TUMOR_DISPLAY_MAP[second];
  return { cancer_type:first, second_cancer_type:second, taxonomy_warnings:first ? [] : ['二级癌种已确定，但一级归属尚未确认：'+second] };
}
function main({ case_json }) {
  const raw = String(case_json ?? "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start < 0 || end <= start) {
    throw new Error("病例结构化提取结果不是可解析的 JSON 对象");
  }

  const data = JSON.parse(raw.slice(start, end + 1));
  const requiredFields = [
    "case_title",
    "disease"
  ];
  const missingFields = requiredFields.filter(
    (field) => !String(data[field] ?? "").trim()
  );

  if (missingFields.length > 0) {
    throw new Error(`缺少生产工作流必需字段: ${missingFields.join(", ")}`);
  }

  function isSafeRemoteImageUrl(value) {
    if (!value) return false;

    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase();
      const privateIpv4 = /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;
      const sensitiveQueryName = /(^|_)(token|access_token|api_key|apikey|auth|authorization|credential|signature|sig)($|_)/i;

      if (!/^https?:$/.test(url.protocol)) return false;
      if (url.username || url.password) return false;
      if (host === "localhost" || host.endsWith(".local") || privateIpv4.test(host)) return false;
      if ([...url.searchParams.keys()].some((key) => sensitiveQueryName.test(key))) return false;

      return true;
    } catch {
      return false;
    }
  }

  function parseCaseImageIndex(value) {
    const rawIndex = String(value ?? "").trim();
    if (!rawIndex) {
      return { case_image_index: "", case_intro_images: [] };
    }

    const normalizedLines = [];
    const remoteUrls = [];

    for (const rawLine of rawIndex.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;

      const parts = line.split("|").map((part) => part.trim());
      const imageId = parts[0] || "";
      const sourceUrl = parts[1] || "";
      const timepoint = parts[2] || "";
      const caption = parts.slice(3).join(" | ").trim();

      if (!/^IMG\d+$/.test(imageId)) continue;

      const safeUrl = isSafeRemoteImageUrl(sourceUrl) ? sourceUrl : "";
      normalizedLines.push(`${imageId} | ${safeUrl} | ${timepoint} | ${caption}`);

      if (safeUrl && !remoteUrls.includes(safeUrl)) {
        remoteUrls.push(safeUrl);
      }
    }

    return {
      case_image_index: normalizedLines.join("\n"),
      case_intro_images: remoteUrls
    };
  }

  const imageData = parseCaseImageIndex(data.case_image_index);

  function stableCaseId(title) {
    const s = String(title || "").trim();
    if (!s) return "";
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    }
    return "CASE-" + h.toString(16).toUpperCase();
  }

  const classification = classifyTumor(data.second_cancer_type);
  const production_variables = {
    ...classification,
    case_id: data.case_id || stableCaseId(data.case_title),
    case_title: data.case_title || "",
    disease: data.disease || "",
    case_context: data.case_context || "",
    learning_points: data.learning_points_candidate || "",
    question_count: 5,
    question_draft: "",
    difficulty: data.difficulty || "进阶",
    review_feedback: "首次生成，无上一轮审核意见",
    case_mode: data.case_mode || "全程管理",
    case_timeline: data.case_timeline || "",
    biomarkers: data.biomarkers || "",
    decision_points: data.decision_points_candidate || "",
    adverse_events: data.adverse_events || "",
    evidence_notes: [data.evidence_notes || "", ...classification.taxonomy_warnings].filter(Boolean).join("\n"),
    case_image_index: imageData.case_image_index,
    case_intro_images: imageData.case_intro_images
  };

  function focus(priority) {
    return [production_variables.learning_points,
      '【本次调用的教学侧重，不是新增病例事实】' + priority,
      '在病例事实与合格证据允许时优先覆盖该侧重；目标生成5个独立决策点，实际只能形成1至4题时输出已有题目，不能为了分工编造诊断、检查结果或治疗事件。若本方向证据不足，可以选择其他真实且有证据支持的决策。不改变原病例时间线，不把教学侧重当作检索证据或既成医嘱。'
    ].filter(Boolean).join('\n');
  }
  return {
    production_variables,
    ...production_variables,
    learning_points_a: focus('初始诊断、临床分期、阴性取样解释、有限标本与分子诊断；避免多个题重复考查同一检测原则。'),
    learning_points_b: focus('实际系统治疗选择、疗效复评、围手术期评估和研究证据适用边界；避免只围绕同一研究DFS反复出题。'),
    learning_points_c: focus('病例已发生的随访或后续管理、多因素处理顺序及信息不全时的评估；若存在局部病灶，区分疑似、确诊及未提供全身状态，不能虚构寡进展。')
  };
}
