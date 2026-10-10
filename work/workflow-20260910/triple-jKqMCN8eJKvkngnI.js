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

function prepareSelection({ agent_reply, candidate_pool, case_id, disease, difficulty }) {
  function object(value) {
    for (let i = 0; i < 4 && typeof value === "string"; i++) {
      let s = value.replace(/^\uFEFF/, "").trim();
      const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
      if (fence) s = fence[1];
      value = JSON.parse(s);
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("不是JSON对象");
    return value;
  }
  let pool;
  try { pool = object(candidate_pool); } catch (_) { throw new Error("候选池不可解析，请检查candidate_pool变量引用。"); }
  if (!Array.isArray(pool.candidates) || !Array.isArray(pool.groups) || pool.candidate_count !== pool.candidates.length) {
    throw new Error("候选池结构或数量不一致。");
  }
  if (pool.case_packet?.case_id && case_id && pool.case_packet.case_id !== case_id) {
    throw new Error('CASE_MISMATCH：候选池与导出病例ID不同。');
  }
  const report = { schema_version: "triple-selection-1.0", selection_status: "pending",
    candidate_count: pool.candidates.length, medical_approval_confirmed: false,
    source_groups: pool.groups, selected: [], warnings: [],
    notice: "本次只完成候选终选与结构检查，不代表独立医学审核通过；用于医学教学前请人工复核。" };
  if (pool.candidates.length < 5) {
    const errors = pool.groups.filter(g => g.parse_status === "ERROR");
    const stopped = pool.groups.filter(g => g.parse_status !== "ERROR" && g.generation_status === "insufficient");
    const rejected = pool.groups.reduce((n, g) => n + (g.rejected_questions || []).length, 0);
    report.selection_status = "insufficient";
    report.failure_kind = errors.length ? "UPSTREAM_OUTPUT_ERROR"
      : stopped.length ? "UPSTREAM_INSUFFICIENT"
      : rejected ? "CANDIDATE_STRUCTURE_INCOMPLETE" : "CANDIDATE_COUNT_INSUFFICIENT";
    report.warnings.push(errors.length
      ? "仅成功读入" + pool.candidates.length + "道结构完整候选，另有" + errors.length + "组输出/解析异常；不能把这些异常等同于医学证据不足。"
      : "成功解析后的结构完整候选为" + pool.candidates.length + "道，不足5道。");
    for (const g of pool.groups) {
      if (g.parse_status === "ERROR") report.warnings.push(g.group_id + " [" + (g.error_code || "REPLY_PARSE_ERROR") + "] " + g.error);
      if (g.generation_status === "insufficient") report.warnings.push(g.group_id + "的上游最终输出明确为insufficient，未生成题目。");
      for (const reason of (g.upstream_missing_information || []).slice(0, 4)) report.warnings.push(g.group_id + "上游缺口：" + reason);
      if ((g.rejected_questions || []).length) report.warnings.push(g.group_id + "有" + g.rejected_questions.length + "道题因结构/答案映射不完整未入池，详见rejected_questions。");
    }
    const final_data = { schema_version: "1.0", case_id: String(case_id || ""), cancer_type: String(disease || ""),
      generation_status: "insufficient", difficulty: String(difficulty || "进阶"), question_count: 0, questions: [],
      missing_information: report.warnings.slice() };
    return { stop: { final_data, final_json: JSON.stringify(final_data, null, 2), case_page_data: {}, case_page_json: "{}",
      selection_report: report, selection_report_json: JSON.stringify(report, null, 2), quality_notice: report.warnings.join("\n") } };
  }

  let selection;
  try { selection = object(agent_reply); } catch (_) { throw new Error("终选回复不是合法JSON；这是终选格式错误，不是医学证据不足。"); }
  if (selection.selection_status !== "success" || !Array.isArray(selection.selected_ids) || selection.selected_ids.length !== 5 || new Set(selection.selected_ids).size !== 5) {
    throw new Error("终选必须返回success和5个不同selected_ids；不得用不足状态或重复ID替代选题。");
  }
  const byId = new Map(pool.candidates.map(c => [c.candidate_id, c]));
  if (byId.size !== pool.candidates.length) throw new Error("候选池存在重复candidate_id。");
  const selected = selection.selected_ids.map(id => {
    if (typeof id !== "string" || !byId.has(id)) throw new Error("终选引用不存在的candidate_id：" + String(id));
    return byId.get(id);
  });
  report.selection_status = "success";
  report.selection_notes = Array.isArray(selection.selection_notes) ? selection.selection_notes.filter(v => typeof v === "string") : [];
  report.model_risk_message = typeof selection.risk_message === "string" ? selection.risk_message : "";
  report.selected = selected.map((c, i) => ({ final_id: "Q" + (i + 1), candidate_id: c.candidate_id,
    group_id: c.group_id, source_question_id: c.source_question_id, exact_duplicate_of: c.exact_duplicate_of || null,
    evidence_status: c.evidence_status || "not_provided", evidence_key: c.evidence_key || null,
    source_question_audit: c.source_question_audit || null }));
  for (const c of selected) {
    if (c.evidence_status !== "located") report.warnings.push(c.candidate_id + "原始证据未唯一定位，尚不能核验摘要与原文一致。");
    if (c.source_question_audit?.passed === false) report.warnings.push(c.candidate_id + "对应来源题仍有审核问题：" + (c.source_question_audit.problems || []).join("；"));
  }
  report.workflow_revision = "20260904-followup-v2";
  const selectedGroups = new Set(selected.map(c => c.group_id));
  for (const g of pool.groups.filter(g => selectedGroups.has(g.group_id))) {
    if (!g.audit || g.audit.availability !== "provided") report.warnings.push(g.group_id + "未提供独立审核信息，不能推断为医学PASS。");
    else {
      report.warnings.push(g.group_id + "报告审核" + (g.audit.decision || "未知") + "，分数" + (g.audit.score == null ? "未提供" : g.audit.score) + (g.audit.returned_candidate_binding === true ? '；上游声明审核对应返回题，仍须核对真实结论。' : '；该审核尚未与返回题逐题绑定。'));
      if (g.audit.patch_merge_decision === "FAIL") report.warnings.push(g.group_id + "修订合并失败，需核对是否回退旧题；不能把本轮0分解释为入选题医学评分。");
    }
  }
  for (const c of selected) if (c.exact_duplicate_of) report.warnings.push(c.candidate_id + "与" + c.exact_duplicate_of + "完全重复，已保留原题并提示复核。");
  // 以病例与入选ID播种，同一输入可复现；不同病例不固定为ABCDA。
  const seedText = String(case_id || "") + "|" + selected.map(c => c.candidate_id + ":" + c.question.question).join("|");
  let seed = 2166136261;
  for (let i = 0; i < seedText.length; i++) seed = Math.imul(seed ^ seedText.charCodeAt(i), 16777619) >>> 0;
  const targets = [0, 1, 2, 3, seed % 4];
  for (let i = targets.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [targets[i], targets[j]] = [targets[j], targets[i]];
  }
  return { source: { generation_status: "success", questions: selected.map((c, i) => ({ ...c.question, id: "Q" + (i + 1) })), missing_information: [] },
    report, targets };
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

  const cancerType = /^(?:胃食管(?:结合部|交界处|交界部)|GEJ\b)/i.test(diseaseText)
    ? "胃食管结合部癌"
    : diseaseText.includes("肺")
    ? "肺癌"
    : diseaseText.includes("胃")
      ? "胃癌"
      : diseaseText.includes("食管")
        ? "食管癌"
        : diseaseText.includes("乳腺")
          ? "乳腺癌"
          : diseaseText.includes("结直肠")
            ? "结直肠癌"
            : diseaseText.includes("肝")
              ? "肝癌"
              : diseaseText.includes("胰腺")
                ? "胰腺癌"
                : diseaseText.includes("卵巢")
                  ? "卵巢癌"
                  : diseaseText.includes("前列腺")
                    ? "前列腺癌"
                    : diseaseText;

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
    missing_information: [] };


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
            : "时间未详",
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
  const output_data = { Questions, detail };
  return { ...result, case_page_json: JSON.stringify(detail, null, 2),
    output_data, output_json: JSON.stringify(output_data, null, 2) };
}
