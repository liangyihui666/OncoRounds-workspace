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
    case_id: "病例ID",
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
