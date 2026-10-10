function main({
  adverse_events,
  fallback_anchor_a,
  fallback_anchor_b
}) {
  const EVENT_PATTERNS = [
    { pattern: /1型糖尿病|type\s*1\s*diabetes|T1DM/i, label: "1型糖尿病" },
    { pattern: /糖尿病酮症酸中毒|\bDKA\b/i, label: "糖尿病酮症酸中毒" },
    { pattern: /间质性肺炎|免疫相关肺炎|肺炎|pneumonitis|interstitial\s+lung/i, label: "肺炎/间质性肺病" },
    { pattern: /心肌炎|myocarditis/i, label: "心肌炎" },
    { pattern: /肝炎|免疫相关肝损伤|hepatitis/i, label: "肝炎/肝损伤" },
    { pattern: /结肠炎|colitis/i, label: "结肠炎" },
    { pattern: /垂体炎|hypophysitis/i, label: "垂体炎" },
    { pattern: /甲状腺炎|甲状腺功能|thyroid/i, label: "甲状腺功能异常" },
    { pattern: /肾上腺功能|adrenal/i, label: "肾上腺功能异常" },
    { pattern: /肾炎|免疫相关肾损伤|nephritis/i, label: "肾炎/肾损伤" },
    { pattern: /胰腺炎|pancreatitis/i, label: "胰腺炎" },
    { pattern: /重症肌无力|肌炎|脑炎|神经病变|myasthenia|myositis|encephalitis|neuropathy/i, label: "神经肌肉系统毒性" },
    { pattern: /皮炎|皮疹|Stevens[- ]?Johnson|\bSJS\b|\bTEN\b|dermatitis|rash/i, label: "皮肤毒性" },
    { pattern: /血小板减少|中性粒细胞减少|溶血性贫血|thrombocytopenia|neutropenia|hemolytic/i, label: "血液学毒性" },
    { pattern: /关节炎|arthritis/i, label: "关节炎" }
  ];

  function parseMaybe(value) {
    if (typeof value !== "string") return value;
    const text = value.trim();
    if (!text) return "";
    try {
      return JSON.parse(text);
    } catch (_) {
      return value;
    }
  }

  function collectText(value, output) {
    const parsed = parseMaybe(value);
    if (typeof parsed === "string") {
      if (parsed.trim()) output.push(parsed.trim());
      return;
    }
    if (Array.isArray(parsed)) {
      parsed.forEach((item) => collectText(item, output));
      return;
    }
    if (parsed && typeof parsed === "object") {
      Object.values(parsed).forEach((item) => collectText(item, output));
    }
  }

  function clean(value) {
    return String(value ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/[\u0000-\u001F\u007F\uFFFD]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function gradeOf(text) {
    const patterns = [
      /\bG(?:rade)?\s*([1-5])\b/i,
      /CTCAE\s*(?:G|Grade)?\s*([1-5])\b/i,
      /([1-5])\s*级/
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return Number(match[1]);
    }
    return null;
  }

  function relationIsExplicit(text) {
    return /(免疫检查点抑制剂相关|免疫相关|治疗相关|药物相关|irAE|immune[- ]related|treatment[- ]related|drug[- ]related)/i.test(
      text
    );
  }

  function isInfectionOnly(text) {
    return (
      /(感染|病原|细菌|真菌|病毒|定植|污染|抗感染|培养|灌洗液|BAL)/i.test(text) &&
      !relationIsExplicit(text)
    );
  }

  function eventNameOf(text) {
    const labels = [];
    for (const item of EVENT_PATTERNS) {
      if (item.pattern.test(text) && !labels.includes(item.label)) {
        labels.push(item.label);
      }
    }
    if (
      labels.includes("1型糖尿病") &&
      labels.includes("糖尿病酮症酸中毒")
    ) {
      return "1型糖尿病并糖尿病酮症酸中毒";
    }
    if (labels.length > 0) return labels.slice(0, 2).join("并");

    if (!relationIsExplicit(text)) return "";
    const prefix = text
      .split(/[：:；;]/)[0]
      .replace(/^\s*\d+[.、)）]\s*/, "")
      .replace(/\bG(?:rade)?\s*[1-5]\b/gi, "")
      .replace(/CTCAE\s*(?:G|Grade)?\s*[1-5]\b/gi, "")
      .replace(/[1-5]\s*级/g, "")
      .replace(
        /(免疫检查点抑制剂相关|免疫相关|治疗相关|药物相关|irAE|immune[- ]related|treatment[- ]related|drug[- ]related)/gi,
        ""
      )
      .replace(/^[\s：:、，,-]+|[\s：:、，,-]+$/g, "")
      .trim();
    return prefix.slice(0, 60);
  }

  function normalizedEventKey(value) {
    return clean(value)
      .replace(/\bG(?:rade)?\s*[1-5]\b/gi, "")
      .replace(/[1-5]\s*级/g, "")
      .replace(
        /(免疫检查点抑制剂相关|免疫相关|治疗相关|药物相关|irAE|immune[- ]related|treatment[- ]related|drug[- ]related)/gi,
        ""
      )
      .replace(/[\s｜|、，,。；;：:()（）/\\_-]/g, "")
      .toLowerCase();
  }

  const textParts = [];
  collectText(adverse_events, textParts);
  const fullText = clean(textParts.join("\n"));
  const explicitlyNoEvent =
    !fullText ||
    /^(?:无|未见|未发生|无明确)(?:严重)?(?:不良反应|irAE)?$/i.test(fullText);
  const explicitlyNoSecond =
    /无第二(?:项|个)?(?:严重)?不良反应|仅(?:有|发生)一项(?:严重)?不良反应/i.test(
      fullText
    );

  const splitText = textParts
    .join("\n")
    .replace(/(^|\n|[；;])\s*(\d+[.、)）])/g, "$1\n$2");
  const segments = splitText
    .split(/\r?\n|[；;]/)
    .map(clean)
    .filter(Boolean)
    .filter(
      (segment) =>
        !/无第二(?:项|个)?(?:严重)?不良反应/i.test(segment)
    );

  const found = [];
  const unresolved = [];

  segments.forEach((segment, order) => {
    if (isInfectionOnly(segment)) return;
    const grade = gradeOf(segment);
    const eventName = eventNameOf(segment);
    const candidate =
      relationIsExplicit(segment) ||
      EVENT_PATTERNS.some((item) => item.pattern.test(segment)) ||
      grade !== null;
    if (!candidate) return;

    if (!eventName || grade === null) {
      unresolved.push({
        source_text: segment,
        missing: [
          !eventName ? "event_name" : "",
          grade === null ? "grade" : ""
        ].filter(Boolean)
      });
      return;
    }

    const key = eventName.toLowerCase();
    const existing = found.find((item) => item.key === key);
    const item = {
      key,
      event_name: eventName,
      grade: `G${grade}`,
      grade_value: grade,
      source_text: segment,
      order
    };
    if (!existing) {
      found.push(item);
    } else if (grade > existing.grade_value) {
      Object.assign(existing, item);
    }
  });

  function parseFallbackAnchor(value, order) {
    const text = clean(value);
    const match = text.match(/^G([1-5])\s*[｜|]\s*(.{1,80})$/i);
    if (!match) return null;
    const eventName = clean(match[2]);
    if (!eventName || !fullText.includes(eventName)) return null;
    return {
      key: normalizedEventKey(eventName),
      event_name: eventName,
      grade: `G${Number(match[1])}`,
      grade_value: Number(match[1]),
      source_text: eventName,
      order,
      source: "fallback"
    };
  }

  const fallbackItems = [
    parseFallbackAnchor(fallback_anchor_a, 1000),
    parseFallbackAnchor(fallback_anchor_b, 1001)
  ].filter(Boolean);
  const merged = [...found];
  for (const item of fallbackItems) {
    const existing = merged.find((candidate) => {
      const left = normalizedEventKey(candidate.event_name);
      const right = normalizedEventKey(item.event_name);
      return left === right || left.includes(right) || right.includes(left);
    });
    if (!existing) {
      merged.push(item);
    } else if (item.grade_value > existing.grade_value) {
      Object.assign(existing, item);
    }
  }

  merged.sort(
    (left, right) =>
      right.grade_value - left.grade_value || left.order - right.order
  );
  const selected = merged.slice(0, 2);
  const anchorA = selected[0] || null;
  const anchorB = selected[1] || null;
  const fallbackApplied = fallbackItems.length > 0;
  const baseNeedsFallback =
    !explicitlyNoEvent &&
    (unresolved.length > 0 || (fullText.length > 0 && selected.length === 0));
  const needsFallback = baseNeedsFallback && !fallbackApplied;

  function treatmentClassOf(text) {
    if (/免疫检查点抑制剂|免疫治疗|免疫相关|\bICI\b|PD-?1|PD-?L1|CTLA-?4/i.test(text)) {
      return "免疫检查点抑制剂";
    }
    if (/CAR[- ]?T|嵌合抗原受体/i.test(text)) return "CAR-T治疗";
    if (/抗体偶联药物|\bADC\b/i.test(text)) return "抗体偶联药物";
    if (/靶向治疗|\bTKI\b|酪氨酸激酶抑制剂/i.test(text)) return "靶向治疗";
    if (/化疗|细胞毒/i.test(text)) return "化疗";
    return "抗肿瘤治疗";
  }

  const treatmentClass = treatmentClassOf(fullText);
  function buildQuery(anchor) {
    if (!anchor) return "";
    const core =
      `${treatmentClass} ${anchor.event_name} ${anchor.grade} ` +
      "诊断检查 分级管理 暂停或永久停用抗肿瘤治疗 监测 专科会诊 再挑战条件 正式指南";
    const needsInfection =
      /(肺炎|间质性肺病|pneumonitis|interstitial\s+lung)/i.test(
        anchor.event_name
      ) ||
      /(感染|病原|细菌|真菌|病毒|定植|污染|抗感染|培养|灌洗液|BAL)/i.test(
        anchor.source_text
      );
    return needsInfection
      ? `${core} 感染鉴别与并行管理`
      : core;
  }

  const fallbackSystemPrompt =
    "你只从输入的脱敏adverse_events原文抽取最多两项明确记录且带明确G1-G5分级的治疗相关/免疫相关不良反应，按级别从高到低、同级按原文顺序排列。不得推断未记录事件或分级；感染、病原学、定植和污染不得当作治疗相关不良反应，除非原文明示其为治疗相关事件。第二项不存在时留空。只输出json_object：{\"anchor_a\":\"G级别｜事件原文\",\"anchor_b\":\"\",\"has_a\":true,\"has_b\":false}。本回退最多调用一次。";

  return {
    anchor_a: anchorA ? `${anchorA.grade}｜${anchorA.event_name}` : "",
    anchor_b: anchorB ? `${anchorB.grade}｜${anchorB.event_name}` : "",
    query_a: buildQuery(anchorA),
    query_b: buildQuery(anchorB),
    has_a: Boolean(anchorA),
    has_b: Boolean(anchorB),
    anchor_a_detail: anchorA,
    anchor_b_detail: anchorB,
    needs_fallback: needsFallback,
    fallback_applied: fallbackApplied,
    unresolved_segments: unresolved,
    omitted_event_count: Math.max(0, merged.length - 2),
    fallback_max_calls: 1,
    fallback_input: needsFallback ? fullText : "",
    fallback_system_prompt: fallbackSystemPrompt,
    fallback_output_schema:
      '{"anchor_a":"","anchor_b":"","has_a":false,"has_b":false}',
    no_second_event_is_valid:
      explicitlyNoSecond || (!needsFallback && selected.length < 2)
  };
}
