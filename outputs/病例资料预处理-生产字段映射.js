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
    "disease",
    "case_context",
    "case_timeline",
    "decision_points_candidate"
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

  const production_variables = {
    case_id: data.case_id || "",
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

  return {
    production_variables,
    ...production_variables
  };
}
