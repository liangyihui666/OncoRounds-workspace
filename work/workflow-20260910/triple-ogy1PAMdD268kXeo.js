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

  const production_variables = {
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
    evidence_notes: data.evidence_notes || "",
    case_image_index: imageData.case_image_index,
    case_intro_images: imageData.case_intro_images
  };

  function focus(priority) {
    return [production_variables.learning_points,
      '【本次调用的教学侧重，不是新增病例事实】' + priority,
      '在病例事实与合格证据允许时优先覆盖该侧重；仍生成5个独立决策点，不能为了分工编造诊断、检查结果或治疗事件。若本方向证据不足，可以选择其他真实且有证据支持的决策。不改变原病例时间线，不把教学侧重当作检索证据或既成医嘱。'
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
