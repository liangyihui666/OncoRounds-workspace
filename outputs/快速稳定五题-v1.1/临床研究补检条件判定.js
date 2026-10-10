function main({
  clinical_study_initial,
  evidence_pool,
  estimated_question_capacity,
  hard_candidate_count
}) {
  function parseMaybe(value) {
    if (typeof value !== "string") return value;
    const text = value.trim();
    if (!text) return [];
    try {
      return JSON.parse(text);
    } catch (_) {
      return value;
    }
  }

  function hasRecordShape(value) {
    return Boolean(
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).some((key) =>
        /^(doc_?id|docId|dataId|split_?index|splitIndex|chunkIndex|snippet|text|content|pageContent)$/i.test(
          key
        )
      )
    );
  }

  function toRecords(input) {
    const value = parseMaybe(input);
    if (Array.isArray(value)) return value.flatMap((item) => toRecords(item));
    if (!value || typeof value !== "object") return [];
    if (hasRecordShape(value)) return [value];
    if (Array.isArray(value.records)) return value.records;
    const keys = [
      "results",
      "result",
      "list",
      "data",
      "searchResults",
      "searchResult",
      "chunks"
    ];
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const records = toRecords(value[key]);
        if (records.length > 0) return records;
      }
    }
    const laneKeys = [
      "guideline_a",
      "guideline_b",
      "clinical_study_initial",
      "clinical_study_supplement",
      "irae_a",
      "irae_b"
    ];
    return laneKeys.flatMap((key) =>
      Array.isArray(value[key]) ? value[key] : []
    );
  }

  function metaOf(record) {
    const value = record && (record.metadata || record.metaData || record.meta);
    const parsed = parseMaybe(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  }

  function pick(record, keys) {
    const metadata = metaOf(record);
    for (const key of keys) {
      if (record && record[key] !== null && record[key] !== undefined) {
        return record[key];
      }
      if (metadata[key] !== null && metadata[key] !== undefined) {
        return metadata[key];
      }
    }
    return "";
  }

  function textOf(record) {
    return [
      pick(record, ["source_title", "title", "dataSourceName", "sourceName"]),
      pick(record, ["snippet", "text", "content", "pageContent", "a"])
    ]
      .map((value) => String(value ?? ""))
      .join(" ");
  }

  function identifiableStudy(record) {
    const text = textOf(record);
    const title = String(
      pick(record, ["source_title", "title", "dataSourceName", "sourceName"]) ?? ""
    );
    const hasRegistry =
      /\bNCT\d{6,8}\b/i.test(text) ||
      /\bChiCTR[-_A-Za-z0-9]*\d{4,}\b/i.test(text) ||
      /\b(?:jRCT|UMIN|ACTRN|ISRCTN|CTR)[-_A-Za-z0-9]*\d{4,}\b/i.test(text);
    const hasIdentity =
      hasRegistry || /(\btrial\b|\bstudy\b|临床试验|研究|队列)/i.test(title);
    const hasDesign =
      /(随机|对照|双盲|开放标签|单臂|队列|前瞻|回顾|phase\s*[i1-4v]+|[一二三四1-4]期|randomi[sz]ed|cohort)/i.test(
        text
      );
    const hasIntervention =
      /(联合|单药|方案|治疗组|对照组|versus|\bvs\.?\b|received|treated|regimen|intervention)/i.test(
        text
      );
    return Boolean(hasRegistry || (hasIdentity && hasDesign && hasIntervention));
  }

  function locator(record, index) {
    const docId = String(
      pick(record, ["doc_id", "docId", "document_id", "documentId", "dataId"]) ?? ""
    ).trim();
    const split = String(
      pick(record, ["split_index", "splitIndex", "chunk_index", "chunkIndex"]) ?? ""
    ).trim();
    return docId && split !== "" ? `${docId}::${split}` : `UNLOCATED::${index}`;
  }

  const initialRecords = toRecords(clinical_study_initial);
  const identifiableInitialStudies = initialRecords.filter(identifiableStudy);
  const poolRecords = toRecords(evidence_pool);
  const uniquePool = [];
  const seen = new Set();
  poolRecords.forEach((record, index) => {
    const key = locator(record, index);
    if (seen.has(key)) return;
    seen.add(key);
    uniquePool.push(record);
  });

  const hasExplicitCapacity =
    estimated_question_capacity !== "" &&
    estimated_question_capacity !== null &&
    estimated_question_capacity !== undefined;
  const explicitCapacity = Number(estimated_question_capacity);
  const capacity = hasExplicitCapacity && Number.isFinite(explicitCapacity)
    ? explicitCapacity
    : Math.min(5, uniquePool.length * 2);

  const hasExplicitHardCount =
    hard_candidate_count !== "" &&
    hard_candidate_count !== null &&
    hard_candidate_count !== undefined;
  const explicitHardCount = Number(hard_candidate_count);
  const derivedHardCount = uniquePool.filter((record) => {
    const type = String(pick(record, ["type", "source_type"]) ?? "");
    const authority = String(
      pick(record, ["authority", "issuing_authority", "organization"]) ?? ""
    ).trim();
    return (
      (type === "guideline" && Boolean(authority)) ||
      (type !== "guideline" && identifiableStudy(record))
    );
  }).length;
  const hardCount = hasExplicitHardCount && Number.isFinite(explicitHardCount)
    ? explicitHardCount
    : derivedHardCount;

  const noIdentifiableInitialStudy = identifiableInitialStudies.length === 0;
  const poolInsufficientForFive = capacity < 5 || hardCount < 2;
  const reasons = [];
  if (noIdentifiableInitialStudy) {
    reasons.push("初检无可识别临床研究");
  }
  if (poolInsufficientForFive) {
    reasons.push(
      capacity < 5
        ? "压缩证据池的理论五题容量不足"
        : "压缩证据池的硬证据候选少于2条"
    );
  }

  return {
    needs_clinical_supplement: reasons.length > 0,
    supplement_decision: reasons.length > 0 ? "TRIGGER" : "SKIP",
    supplement_reason: reasons.join("；"),
    identifiable_initial_study_count: identifiableInitialStudies.length,
    estimated_question_capacity: capacity,
    hard_candidate_count: hardCount,
    supplement_max_calls: 1
  };
}
