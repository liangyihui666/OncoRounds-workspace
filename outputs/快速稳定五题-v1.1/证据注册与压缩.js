function main({
  guideline_a,
  guideline_b,
  clinical_study_initial,
  clinical_study_supplement,
  irae_a,
  irae_b
}) {
  const LANE_LIMITS = {
    guideline_a: 6,
    guideline_b: 6,
    clinical_study_initial: 5,
    clinical_study_supplement: 3,
    irae_a: 4,
    irae_b: 4
  };

  const CONTENT_KEYS = new Set([
    "snippet",
    "text",
    "content",
    "pageContent",
    "chunk",
    "q",
    "a",
    "answer"
  ]);

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
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }
    const keys = Object.keys(value);
    return keys.some((key) =>
      /^(doc_?id|docId|dataId|split_?index|splitIndex|chunkIndex|snippet|text|content|pageContent)$/i.test(
        key
      )
    );
  }

  function toRecords(input) {
    const value = parseMaybe(input);
    if (Array.isArray(value)) {
      return value.flatMap((item) => toRecords(item));
    }
    if (!value || typeof value !== "object") return [];
    if (hasRecordShape(value)) return [value];

    const wrapperKeys = [
      "records",
      "results",
      "result",
      "list",
      "data",
      "searchResults",
      "searchResult",
      "chunks"
    ];
    for (const key of wrapperKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const records = toRecords(value[key]);
        if (records.length > 0) return records;
      }
    }
    return [];
  }

  function asObject(value) {
    const parsed = parseMaybe(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  }

  function pick(record, metadata, keys) {
    for (const key of keys) {
      if (
        Object.prototype.hasOwnProperty.call(record, key) &&
        record[key] !== null &&
        record[key] !== undefined
      ) {
        return record[key];
      }
      if (
        Object.prototype.hasOwnProperty.call(metadata, key) &&
        metadata[key] !== null &&
        metadata[key] !== undefined
      ) {
        return metadata[key];
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
    try {
      return JSON.stringify(value);
    } catch (_) {
      return "";
    }
  }

  function decodeHtml(text) {
    const named = {
      amp: "&",
      lt: "<",
      gt: ">",
      quot: '"',
      apos: "'",
      nbsp: " "
    };
    return text
      .replace(/&([a-z]+);/gi, (match, name) =>
        Object.prototype.hasOwnProperty.call(named, name.toLowerCase())
          ? named[name.toLowerCase()]
          : match
      )
      .replace(/&#(\d+);/g, (_, code) => {
        const value = Number(code);
        return Number.isFinite(value) ? String.fromCharCode(value) : "";
      })
      .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
        const value = parseInt(code, 16);
        return Number.isFinite(value) ? String.fromCharCode(value) : "";
      });
  }

  function cleanSnippet(value) {
    let text = stringValue(value);
    text = text
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<(?:br|\/p|\/li|\/div|\/h[1-6])\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ");
    text = decodeHtml(text)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
      .replace(/\uFFFD/g, "")
      .replace(/[\t\f\v]+/g, " ")
      .replace(/ *\n+ */g, "\n")
      .replace(/ {2,}/g, " ")
      .trim();

    const segments = text.match(/[^。！？!?；;\n]+[。！？!?；;]?/g) || [];
    const seen = new Set();
    const unique = [];
    for (const raw of segments) {
      const segment = raw.replace(/\s+/g, " ").trim();
      const key = segment.replace(/[\s。！？!?；;，,、]/g, "").toLowerCase();
      if (!segment || !key || seen.has(key)) continue;
      seen.add(key);
      unique.push(segment);
    }
    return unique.join("").slice(0, 1000).trim();
  }

  function sourceText(record) {
    const metadata = asObject(record.metadata || record.metaData || record.meta);
    const direct = pick(record, metadata, [
      "snippet",
      "text",
      "content",
      "pageContent",
      "chunk"
    ]);
    if (stringValue(direct).trim()) return direct;

    const q = stringValue(pick(record, metadata, ["q", "question"])).trim();
    const a = stringValue(pick(record, metadata, ["a", "answer"])).trim();
    return [q, a].filter(Boolean).join("\n");
  }

  function copySourceMetadata(record, metadata) {
    function stripContentFields(value, depth) {
      if (depth > 8 || value === null || value === undefined) return value;
      if (Array.isArray(value)) {
        return value.map((item) => stripContentFields(item, depth + 1));
      }
      if (typeof value !== "object") return value;

      const cleaned = {};
      for (const [key, child] of Object.entries(value)) {
        const normalizedKey = key.toLowerCase();
        if (
          CONTENT_KEYS.has(key) ||
          [
            "snippet",
            "text",
            "content",
            "pagecontent",
            "chunk",
            "q",
            "a",
            "answer"
          ].includes(normalizedKey)
        ) {
          continue;
        }
        cleaned[key] = stripContentFields(child, depth + 1);
      }
      return cleaned;
    }

    const topLevel = {};
    for (const [key, value] of Object.entries(record)) {
      if (CONTENT_KEYS.has(key) || key === "metadata" || key === "metaData" || key === "meta") {
        continue;
      }
      if (
        value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        topLevel[key] = value;
      }
    }
    return {
      top_level: topLevel,
      metadata: stripContentFields(metadata, 0)
    };
  }

  function normalizeRecord(record, lane) {
    const metadata = asObject(record.metadata || record.metaData || record.meta);
    const docId = stringValue(
      pick(record, metadata, [
        "doc_id",
        "docId",
        "document_id",
        "documentId",
        "dataId",
        "sourceId"
      ])
    ).trim();
    const splitRaw = pick(record, metadata, [
      "split_index",
      "splitIndex",
      "chunk_index",
      "chunkIndex",
      "index"
    ]);
    const hasSplit =
      splitRaw !== "" && splitRaw !== null && splitRaw !== undefined;
    const splitText = stringValue(splitRaw).trim();
    const splitIndex =
      typeof splitRaw === "number" && Number.isFinite(splitRaw)
        ? splitRaw
        : /^\d+$/.test(splitText)
          ? Number(splitText)
          : splitText;
    const snippet = cleanSnippet(sourceText(record));

    if (
      !docId ||
      !hasSplit ||
      !Number.isInteger(splitIndex) ||
      splitIndex < 0 ||
      !snippet
    ) {
      return {
        valid: false,
        reason: !docId
          ? "MISSING_DOC_ID"
          : !hasSplit
            ? "MISSING_SPLIT_INDEX"
            : !Number.isInteger(splitIndex) || splitIndex < 0
              ? "INVALID_SPLIT_INDEX"
              : "EMPTY_SNIPPET"
      };
    }

    return {
      valid: true,
      record: {
        lane,
        doc_id: docId,
        split_index: splitIndex,
        type: stringValue(pick(record, metadata, ["type", "source_type"])).trim(),
        authority: stringValue(
          pick(record, metadata, ["authority", "issuing_authority", "organization"])
        ).trim(),
        source_title: stringValue(
          pick(record, metadata, [
            "source_title",
            "title",
            "dataSourceName",
            "sourceName",
            "documentTitle"
          ])
        ).trim(),
        source_version: stringValue(
          pick(record, metadata, ["source_version", "version", "year", "publish_year"])
        ).trim(),
        source_section: stringValue(
          pick(record, metadata, ["source_section", "section", "heading", "chapter"])
        ).trim(),
        source_url: stringValue(
          pick(record, metadata, ["source_url", "url", "link", "sourceUrl"])
        ).trim(),
        snippet,
        source_metadata: copySourceMetadata(record, metadata)
      }
    };
  }

  function identifiableStudy(record) {
    const text = [
      record.source_title,
      record.source_version,
      record.snippet
    ]
      .join(" ")
      .toLowerCase();
    const hasRegistry =
      /\bNCT\d{6,8}\b/i.test(text) ||
      /\bChiCTR[-_A-Za-z0-9]*\d{4,}\b/i.test(text) ||
      /\b(?:jRCT|UMIN|ACTRN|ISRCTN|CTR)[-_A-Za-z0-9]*\d{4,}\b/i.test(text);
    const hasStudyIdentity =
      hasRegistry ||
      /(\btrial\b|\bstudy\b|临床试验|研究|队列)/i.test(record.source_title);
    const hasDesign =
      /(随机|对照|双盲|开放标签|单臂|队列|前瞻|回顾|phase\s*[i1-4v]+|[一二三四1-4]期|randomi[sz]ed|cohort)/i.test(
        text
      );
    const hasIntervention =
      /(联合|单药|方案|治疗组|对照组|versus|\bvs\.?\b|received|treated|regimen|intervention)/i.test(
        text
      );
    return Boolean(hasRegistry || (hasStudyIdentity && hasDesign && hasIntervention));
  }

  const lanes = {
    guideline_a,
    guideline_b,
    clinical_study_initial,
    clinical_study_supplement,
    irae_a,
    irae_b
  };

  const seenLocators = new Set();
  const pool = {};
  const dropped = [];
  const inputCounts = {};

  for (const [lane, input] of Object.entries(lanes)) {
    const rawRecords = toRecords(input);
    inputCounts[lane] = rawRecords.length;
    const kept = [];

    for (let index = 0; index < rawRecords.length; index++) {
      const normalized = normalizeRecord(rawRecords[index], lane);
      if (!normalized.valid) {
        dropped.push({ lane, index, reason: normalized.reason });
        continue;
      }

      const record = normalized.record;
      const locator = `${record.doc_id}::${String(record.split_index)}`;
      if (seenLocators.has(locator)) {
        dropped.push({ lane, index, reason: "DUPLICATE_LOCATOR", locator });
        continue;
      }

      seenLocators.add(locator);
      kept.push(record);
      if (kept.length >= LANE_LIMITS[lane]) break;
    }
    pool[lane] = kept;
  }

  const records = Object.values(pool).flat();
  const initialStudyCount = pool.clinical_study_initial.filter(
    (record) => record.type !== "guideline" && identifiableStudy(record)
  ).length;
  const supplementStudyCount =
    pool.clinical_study_supplement.filter(
      (record) => record.type !== "guideline" && identifiableStudy(record)
    ).length;
  const guidelineHardCount = records.filter(
    (record) =>
      record.type === "guideline" &&
      Boolean(record.authority) &&
      Boolean(record.snippet)
  ).length;
  const studyHardCount = [
    ...pool.clinical_study_initial,
    ...pool.clinical_study_supplement
  ].filter(
    (record) => record.type !== "guideline" && identifiableStudy(record)
  ).length;
  const hardCandidateCount = guidelineHardCount + studyHardCount;
  const theoreticalQuestionCapacity = Math.min(5, records.length * 2);
  const evidencePoolInsufficientForFive =
    hardCandidateCount < 2 || theoreticalQuestionCapacity < 5;
  const supplementAlreadyPresent = pool.clinical_study_supplement.length > 0;
  const supplementReasons = [];
  if (initialStudyCount === 0) {
    supplementReasons.push("初检未识别到具备研究身份的记录");
  }
  if (evidencePoolInsufficientForFive) {
    supplementReasons.push("压缩池无法满足固定五题的机械最低容量");
  }

  const evidencePool = {
    contract_version: "1.1",
    limits: LANE_LIMITS,
    ...pool,
    records
  };

  return {
    evidence_pool: evidencePool,
    evidence_pool_json: JSON.stringify(evidencePool),
    needs_clinical_supplement:
      !supplementAlreadyPresent && supplementReasons.length > 0,
    supplement_reason: supplementReasons.join("；"),
    evidence_pool_insufficient_for_five: evidencePoolInsufficientForFive,
    estimated_question_capacity: theoreticalQuestionCapacity,
    hard_candidate_count: hardCandidateCount,
    identifiable_initial_study_count: initialStudyCount,
    identifiable_supplement_study_count: supplementStudyCount,
    compression_report: {
      input_counts: inputCounts,
      kept_counts: Object.fromEntries(
        Object.entries(pool).map(([lane, items]) => [lane, items.length])
      ),
      kept_total: records.length,
      dropped_total: dropped.length,
      dropped
    }
  };
}
