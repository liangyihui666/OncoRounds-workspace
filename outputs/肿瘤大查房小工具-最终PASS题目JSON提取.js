function main({
  agent_reply,
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
  const text = String(agent_reply ?? "").trim();
  if (!text) throw new Error("肿瘤大查房小工具的 AI 回复内容为空");

  const abilityTypes = new Set([
    "诊断与分期",
    "分子诊断",
    "治疗决策",
    "疗效复评与局部治疗",
    "耐药与后线管理",
    "不良反应管理"
  ]);
  const evidenceTypes = new Set(["指南", "临床研究", "病例+临床推理"]);
  const referenceFields = [
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
  const bannedPhrases = [
    "以上都是",
    "以上都不是",
    "感染已排除",
    "无感染证据",
    "无阳性细菌学结果",
    "未提示感染直接证据",
    "抗感染无效，因此不是感染",
    "抗感染无效所以不是感染"
  ];

  function cleanText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function displayText(value, maxLength) {
    const normalized = cleanText(value);
    return normalized.length > maxLength
      ? `${normalized.slice(0, maxLength).trim()}……`
      : normalized;
  }

  // 日志前面可能混有HTML、变量模板和其他JSON，只从目标根字段开始识别结果对象。
  function parseObjectAt(start) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          const raw = text.slice(start, i + 1);
          try {
            return { start, end: i, value: JSON.parse(raw) };
          } catch (_) {
            return null;
          }
        }
      }
    }
    return null;
  }

  const blocks = [];
  const rootPattern = /\{\s*"(?:schema_version|decision|generation_status)"\s*:/g;
  let match;
  while ((match = rootPattern.exec(text)) !== null) {
    const parsed = parseObjectAt(match.index);
    if (parsed) blocks.push(parsed);
  }

  const decisionBlocks = blocks.filter(
    (item) => item.value && typeof item.value.decision === "string"
  );
  if (decisionBlocks.length === 0) {
    throw new Error("未找到独立校验 decision，禁止提取为发布 JSON");
  }
  const lastDecision = decisionBlocks[decisionBlocks.length - 1];
  if (lastDecision.value.decision !== "PASS") {
    throw new Error(`最后一次独立校验 decision=${lastDecision.value.decision}，禁止发布`);
  }
  if (!Number.isFinite(Number(lastDecision.value.score)) || Number(lastDecision.value.score) < 75) {
    throw new Error("最后一次独立 PASS 的 score 低于75或无效，禁止发布");
  }
  if (
    !Array.isArray(lastDecision.value.fatal_errors) ||
    lastDecision.value.fatal_errors.length > 0
  ) {
    throw new Error("最后一次独立校验 fatal_errors 必须为空数组");
  }
  if (
    typeof lastDecision.value.revision_instruction !== "string" ||
    cleanText(lastDecision.value.revision_instruction)
  ) {
    throw new Error("最后一次独立 PASS 的 revision_instruction 非空，禁止发布");
  }
  if (
    !Array.isArray(lastDecision.value.missing_information) ||
    lastDecision.value.missing_information.length > 0
  ) {
    throw new Error("最后一次独立 PASS 的 missing_information 必须为空数组");
  }
  const questionChecks = lastDecision.value.question_checks;
  if (!Array.isArray(questionChecks) || questionChecks.length !== 5) {
    throw new Error("最后一次独立 PASS 必须包含Q1至Q5五项 question_checks");
  }
  const checkIds = questionChecks.map((item) => item && item.id);
  if (checkIds.join(",") !== "Q1,Q2,Q3,Q4,Q5") {
    throw new Error("question_checks 必须按Q1至Q5完整排列");
  }
  if (questionChecks.some((item) =>
    item.passed !== true ||
    (Array.isArray(item.problems) ? item.problems.length > 0 : true) ||
    typeof item.revision !== "string" ||
    cleanText(item.revision)
  )) {
    throw new Error("独立 PASS 的五项 question_checks 必须全部 passed=true 且 problems/revision 为空");
  }

  const candidates = blocks.filter((item) => {
    const value = item.value;
    return value &&
      value.schema_version === "1.1" &&
      value.generation_status === "success" &&
      Array.isArray(value.questions) &&
      value.questions.length === 5;
  });
  if (candidates.length === 0) {
    throw new Error("未找到包含五道题的 generation_status=success JSON");
  }

  // 优先取最后一次独立 PASS 之后再次输出的最终题目；兼容该轮仅在 PASS 前输出一次题目。
  const previousDecision = decisionBlocks.length > 1
    ? decisionBlocks[decisionBlocks.length - 2]
    : null;
  const sameIterationCandidates = candidates.filter((item) =>
    !previousDecision || item.start > previousDecision.end
  );
  if (sameIterationCandidates.length === 0) {
    throw new Error("最后一次独立 PASS 所在轮次没有可关联的五题 success JSON");
  }
  const afterPass = sameIterationCandidates.filter((item) => item.start > lastDecision.end);
  const selected = afterPass.length ? afterPass : sameIterationCandidates;
  const source = selected[selected.length - 1].value;

  if (source.schema_version !== "1.1") {
    throw new Error("生成结果 schema_version 不是1.1，禁止发布");
  }
  if (source.question_count !== 5 || source.questions.length !== 5) {
    throw new Error("v1.1 成功发布必须恰好五题");
  }
  if (source.difficulty !== "进阶") {
    throw new Error("生成结果 difficulty 不是进阶，禁止发布");
  }
  if (!Array.isArray(source.missing_information) || source.missing_information.length !== 0) {
    throw new Error("成功发布的 missing_information 必须为空数组");
  }
  if (source.risk_message !== "") {
    throw new Error("成功发布的 risk_message 必须为空字符串");
  }

  const diseaseText = cleanText(disease);
  const cancerType = diseaseText.includes("肺") ? "肺癌" :
    diseaseText.includes("胃") ? "胃癌" :
    diseaseText.includes("食管") ? "食管癌" :
    diseaseText.includes("乳腺") ? "乳腺癌" :
    diseaseText.includes("结直肠") ? "结直肠癌" :
    diseaseText.includes("肝") ? "肝癌" :
    diseaseText.includes("胰腺") ? "胰腺癌" :
    diseaseText.includes("卵巢") ? "卵巢癌" :
    diseaseText.includes("前列腺") ? "前列腺癌" : diseaseText;

  const resolvedCaseId = cleanText(case_id || source.case_id);
  const resolvedCaseSummary = cleanText(source.case_summary);
  const suppliedDifficulty = cleanText(difficulty);
  if (suppliedDifficulty && suppliedDifficulty !== "进阶") {
    throw new Error("全局 difficulty 不是进阶，禁止发布");
  }
  const resolvedDifficulty = "进阶";

  if (!resolvedCaseId) throw new Error("case_id 为空，禁止发布");
  if (!resolvedCaseSummary) throw new Error("case_summary 为空，禁止发布");
  if (!cleanText(source.cancer_type || cancerType)) {
    throw new Error("cancer_type 为空，禁止发布");
  }

  const questions = source.questions.map((q, index) => {
    const qid = `Q${index + 1}`;
    if (!q || typeof q !== "object" || q.id !== qid) {
      throw new Error(`第${index + 1}题 id 必须为 ${qid}`);
    }
    if (!abilityTypes.has(q.type)) {
      throw new Error(`${qid} 的 type 不在六个能力维度枚举内`);
    }
    for (const field of ["phase", "timepoint", "question", "explain", "keyPoint"]) {
      if (!cleanText(q[field])) throw new Error(`${qid} 的 ${field} 不能为空`);
    }
    if (String(q.question).trim().length > 160) throw new Error(`${qid} 题干超过160字`);
    if (String(q.explain).trim().length > 160) throw new Error(`${qid} 解析超过160字`);
    if (String(q.keyPoint).trim().length > 70) throw new Error(`${qid} keyPoint超过70字`);

    if (!Array.isArray(q.options)) {
      throw new Error(`${qid} 的 options 必须保持为4项数组，禁止A/B/C/D对象转换`);
    }
    const sourceOptions = [...q.options];

    if (
      sourceOptions.length !== 4 ||
      sourceOptions.some((item) => typeof item !== "string" || !item.trim())
    ) {
      throw new Error(`Q${index + 1} 的 options 不是四项有效文本`);
    }
    if (sourceOptions.some((item) => item.trim().length > 60)) {
      throw new Error(`${qid} 存在超过60字的选项`);
    }
    if (new Set(sourceOptions.map((item) => item.trim())).size !== 4) {
      throw new Error(`${qid} 存在重复选项`);
    }

    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) {
      throw new Error(`${qid} 的 answer 必须保持为0至3整数，禁止答案字母转换`);
    }

    const correctAnswerText = sourceOptions[q.answer];
    if (q.answer_text !== correctAnswerText) {
      throw new Error(`Q${index + 1} 的 answer_text 与正确选项不一致`);
    }

    const ref = q.guidelineRef;
    if (!ref || typeof ref !== "object" || Array.isArray(ref)) {
      throw new Error(`${qid} 的 guidelineRef 不是对象`);
    }
    const refKeys = Object.keys(ref).sort();
    if (JSON.stringify(refKeys) !== JSON.stringify([...referenceFields].sort())) {
      throw new Error(`${qid} 的 guidelineRef 必须且只能包含10个字段`);
    }
    if (!evidenceTypes.has(ref.evidence_type)) {
      throw new Error(`${qid} 的 evidence_type 不在 v1.1 三值枚举内`);
    }
    for (const field of referenceFields) {
      if (field !== "split_index" && typeof ref[field] !== "string") {
        throw new Error(`${qid} 的 guidelineRef.${field} 必须为字符串`);
      }
    }
    if (!cleanText(ref.doc_id) || !Number.isInteger(ref.split_index) || ref.split_index < 0) {
      throw new Error(`${qid} 的证据 locator 无效`);
    }
    for (const field of ["type", "source_title", "evidence_summary"]) {
      if (!cleanText(ref[field])) throw new Error(`${qid} 的 guidelineRef.${field} 不能为空`);
    }
    if (ref.evidence_type === "指南" && (
      ref.type !== "guideline" || !cleanText(ref.authority)
    )) {
      throw new Error(`${qid} 的指南证据必须 type=guideline 且 authority 非空`);
    }
    if (ref.source_url && !isSafeRemoteUrl(ref.source_url)) {
      throw new Error(`${qid} 的 source_url 不是安全公开链接`);
    }

    const explanationText = `${q.explain} ${q.keyPoint}`;
    if (
      /正确答案(?:为|是)?\s*[ABCD](?![A-Za-z])/i.test(explanationText) ||
      /选项\s*[ABCD](?![A-Za-z])/i.test(explanationText) ||
      /(?<![A-Za-z])[ABCD]\s*项/i.test(explanationText)
    ) {
      throw new Error(`${qid} 的解析或 keyPoint 使用了答案/选项字母`);
    }
    const learnerText = [q.question, ...sourceOptions, q.explain, q.keyPoint, ref.evidence_summary].join(" ");
    for (const phrase of bannedPhrases) {
      if (learnerText.includes(phrase)) throw new Error(`${qid} 包含禁用短语：${phrase}`);
    }
    if (/<\/?[A-Za-z][^>]*>/.test(learnerText) || learnerText.includes("�")) {
      throw new Error(`${qid} 包含HTML或乱码替代字符`);
    }
    if (ref.evidence_type === "病例+临床推理") {
      const conclusion = [q.answer_text, q.explain, q.keyPoint, ref.evidence_summary].join(" ");
      if (
        /\d+(?:\.\d+)?\s*(?:mg|g|μg|ug)(?:\/\s*(?:kg|m2|m²))?\b|剂量|疗程|标准治疗|标准方案|(?:必须|永久|立即|强制)\s*(?:停药|停用|终止)|再挑战|重新启用|重启|恢复使用|≥\s*3\s*级|G\s*[34]|手术适应证|手术指征|必须手术/i.test(conclusion)
      ) {
        throw new Error(`${qid} 的病例+临床推理承载了只能由硬证据支持的高风险结论`);
      }
    }

    return {
      id: qid,
      type: q.type,
      phase: q.phase,
      timepoint: q.timepoint,
      question: q.question,
      options: sourceOptions,
      answer: q.answer,
      answer_text: correctAnswerText,
      explain: q.explain,
      keyPoint: q.keyPoint,
      guidelineRef: q.guidelineRef
    };
  });

  const evidenceCounts = questions.reduce((counts, question) => {
    const kind = question.guidelineRef.evidence_type;
    counts[kind] = (counts[kind] || 0) + 1;
    return counts;
  }, {});
  const hardEvidenceCount = (evidenceCounts["指南"] || 0) + (evidenceCounts["临床研究"] || 0);
  const reasoningCount = evidenceCounts["病例+临床推理"] || 0;
  if (hardEvidenceCount < 2 || reasoningCount < 2) {
    throw new Error(`v1.1配额失败：硬证据${hardEvidenceCount}题，病例+临床推理${reasoningCount}题`);
  }

  const locatorUses = new Map();
  for (const question of questions) {
    const ref = question.guidelineRef;
    const locator = `${ref.doc_id}::${ref.split_index}`;
    const uses = locatorUses.get(locator) || [];
    uses.push(question);
    locatorUses.set(locator, uses);
  }
  for (const [locator, uses] of locatorUses) {
    if (uses.length > 2) throw new Error(`证据 locator ${locator} 使用超过2次`);
    if (uses.length === 2) {
      if (uses[0].timepoint === uses[1].timepoint) {
        throw new Error(`证据 locator ${locator} 在同一timepoint重复使用`);
      }
      if (uses[0].answer_text === uses[1].answer_text) {
        throw new Error(`证据 locator ${locator} 的两题 answer_text 相同`);
      }
      if (uses[0].keyPoint === uses[1].keyPoint) {
        throw new Error(`证据 locator ${locator} 的两题 keyPoint 相同`);
      }
    }
  }

  const finalData = {
    schema_version: "1.1",
    case_id: resolvedCaseId,
    cancer_type: source.cancer_type || cancerType,
    generation_status: "success",
    case_summary: resolvedCaseSummary,
    difficulty: resolvedDifficulty,
    question_count: 5,
    questions,
    missing_information: [],
    risk_message: ""
  };

  function isSafeRemoteUrl(value) {
    const url = String(value ?? "").trim();
    if (!/^https?:\/\//i.test(url)) return false;
    if (/^https?:\/\/(?:localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/i.test(url)) {
      return false;
    }
    return !/[?&](?:token|access_token|api_key|apikey|auth|authorization|credential|signature|sig)=/i.test(url);
  }

  const MAX_CASE_IMAGES = 6;

  function isGenericImageLabel(value) {
    const label = cleanText(value);
    if (!label) return true;
    return /^(?:图片|图像|配图|image|img)\s*\d*(?:\.(?:png|jpe?g|gif|webp|bmp))?$/i.test(label) ||
      /^\d+\.(?:png|jpe?g|gif|webp|bmp)$/i.test(label) ||
      /^(?:演示文稿|幻灯片)\s*\d*$/i.test(label);
  }

  function isObviousNonCaseImage(value) {
    const label = cleanText(value);
    return /(二维码|扫码|公众号|关注|转发|下载|logo|头像|专家介绍|医生介绍|讲者|个人简介|简历|课程|直播|广告|品牌|海报|封面|栏目|责任编辑|排版编辑)/i.test(label);
  }

  function temporalKey(value) {
    const match = cleanText(value).match(/((?:19|20)\d{2})(?:\s*[年.\/-]\s*(\d{1,2}))?(?:\s*[月.\/-]\s*(\d{1,2}))?/);
    if (!match) return "";
    const parts = [match[1]];
    if (match[2]) parts.push(String(Number(match[2])));
    if (match[3]) parts.push(String(Number(match[3])));
    return parts.join("-");
  }

  function findRelatedTimeline(timepoint, timelineItems) {
    const normalizedTimepoint = cleanText(timepoint);
    if (!normalizedTimepoint) return null;

    const exactTextMatch = timelineItems.find((item) =>
      cleanText(item.detail).includes(normalizedTimepoint) ||
      cleanText(item.date).includes(normalizedTimepoint)
    );
    if (exactTextMatch) return exactTextMatch;

    const imageTemporalKey = temporalKey(normalizedTimepoint);
    if (!imageTemporalKey) return null;
    return timelineItems.find((item) =>
      temporalKey(item.date) === imageTemporalKey ||
      temporalKey(item.detail) === imageTemporalKey
    ) || null;
  }

  function parseImageIndex(value, timelineItems) {
    const records = [];
    const seenIds = new Set();
    for (const rawLine of String(value ?? "").split(/\r?\n/)) {
      const parts = rawLine.split("|").map((part) => part.trim());
      const id = parts[0] || "";
      const src = parts[1] || "";
      const timepoint = parts[2] || "";
      const originalCaption = parts.slice(3).join(" | ").trim();
      if (!/^IMG\d+$/.test(id) || seenIds.has(id) || !isSafeRemoteUrl(src)) continue;

      const caption = isGenericImageLabel(originalCaption) ? "" : cleanText(originalCaption);
      const usableTimepoint = /^(?:无|不详|未详|未提供|解析结果未提供)$/i.test(cleanText(timepoint))
        ? ""
        : cleanText(timepoint);

      // 仅按原始图注/时间点筛选；不读取图片内容，也不据文件名推断医学含义。
      if ((!caption && !usableTimepoint) || isObviousNonCaseImage(originalCaption)) continue;

      const relatedTimeline = findRelatedTimeline(usableTimepoint, timelineItems);
      seenIds.add(id);
      records.push({
        id,
        src,
        timepoint: usableTimepoint,
        caption,
        alt: caption || `病例原始图片 ${id}`,
        mapping_status: relatedTimeline ? "matched_by_timepoint" : "caption_only",
        related_timeline: relatedTimeline
          ? {
              date: relatedTimeline.date,
              title: relatedTimeline.title,
              detail: relatedTimeline.detail
            }
          : null
      });

      if (records.length >= MAX_CASE_IMAGES) break;
    }
    return records;
  }

  function buildSummaryItems() {
    const candidates = [
      ["患者与就诊背景", case_context],
      ["疾病方向", disease]
    ];
    return candidates
      .filter(([, value]) => cleanText(value))
      .map(([label, value], index) => ({
        order: index + 1,
        label,
        value: displayText(value, 260)
      }));
  }

  function buildTimelineItems() {
    const rawTimeline = String(case_timeline ?? "").trim();
    if (!rawTimeline) return [];

    let entries = rawTimeline
      .split(/\r?\n|[；;]/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (entries.length === 0) entries = [rawTimeline];

    return entries.map((detail, index) => {
      const dateMatch = detail.match(/(?:19|20)\d{2}(?:(?:年\s*\d{1,2}月?(?:\s*\d{1,2}日?)?)|(?:[.\/-]\s*\d{1,2}(?:[.\/-]\s*\d{1,2})?))?\+?/);
      return {
        date: dateMatch ? cleanText(dateMatch[0]) : "时间未详",
        title: `诊疗节点 ${index + 1}`,
        detail: displayText(detail, 300)
      };
    });
  }

  const timelineItems = buildTimelineItems();
  const pageImages = parseImageIndex(case_image_index, timelineItems);
  const resolvedTitle = cleanText(case_title || source.case_title || diseaseText || "肿瘤病例");
  const overviewTabs = [
    {
      id: "summary",
      label: "病例摘要",
      order: 1,
      summary_items: buildSummaryItems()
    }
  ];

  const casePageData = {
    schema_version: "1.1",
    case_id: resolvedCaseId,
    cancer_type: source.cancer_type || cancerType,
    difficulty: resolvedDifficulty,
    decision_point_count: 5,
    image: {
      src: "",
      alt: ""
    },
    home: {
      recommendation_label: "今日推荐病例",
      display_title: resolvedTitle,
      description: displayText(diseaseText, 180)
    },
    overview: {
      hero: {
        title: resolvedTitle,
        subtitle: displayText(diseaseText, 120)
      },
      tabs: overviewTabs
    },
    post_round: {
      reveal_after_question_count: 5,
      completion: {
        case_summary: resolvedCaseSummary,
        full_timeline: timelineItems,
        case_images: pageImages
      }
    }
  };

  return {
    final_data: finalData,
    final_json: JSON.stringify(finalData, null, 2),
    case_page_data: casePageData,
    case_page_json: JSON.stringify(casePageData, null, 2)
  };
}
