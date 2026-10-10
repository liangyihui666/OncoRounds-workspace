function main(inputs) {
  const source = inputs && typeof inputs === "object" ? inputs : {};
  const LANE_DEFINITIONS = [
    { key: "guideline_a_staging", prefix: "GS", limit: 4 },
    { key: "guideline_a", prefix: "GA", limit: 4 },
    { key: "guideline_b", prefix: "GB", limit: 6 },
    { key: "clinical_study_initial", prefix: "CS", limit: 5 },
    { key: "clinical_study_supplement", prefix: "CS", limit: 3 },
    { key: "irae_a", prefix: "IR", limit: 4 },
    { key: "irae_b", prefix: "IR", limit: 4 }
  ];
  const LANE_LIMITS = Object.fromEntries(
    LANE_DEFINITIONS.map((item) => [item.key, item.limit])
  );
  const RETRIEVAL_ERROR_FIELDS = [
    { key: "guideline_a_staging_error", lane: "guideline_a_staging" },
    { key: "guideline_a_staging_system_error", lane: "guideline_a_staging" },
    { key: "guideline_a_error", lane: "guideline_a" },
    { key: "guideline_a_system_error", lane: "guideline_a" },
    { key: "guideline_b_error", lane: "guideline_b" },
    { key: "guideline_b_system_error", lane: "guideline_b" },
    { key: "clinical_study_initial_error", lane: "clinical_study_initial" },
    { key: "clinical_study_initial_system_error", lane: "clinical_study_initial" },
    { key: "clinical_study_supplement_error", lane: "clinical_study_supplement" },
    { key: "clinical_study_supplement_system_error", lane: "clinical_study_supplement" },
    { key: "irae_a_error", lane: "irae_a" },
    { key: "irae_a_system_error", lane: "irae_a" },
    { key: "irae_b_error", lane: "irae_b" },
    { key: "irae_b_system_error", lane: "irae_b" },
    { key: "knowledge_search_error", lane: "knowledge_search" }
  ];
  const CONTENT_KEYS = new Set([
    "snippet",
    "text",
    "content",
    "pagecontent",
    "chunk",
    "q",
    "a",
    "answer"
  ]);

  function hasOwn(object, key) {
    return Boolean(object && Object.prototype.hasOwnProperty.call(object, key));
  }

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

  function asObject(value) {
    const parsed = parseMaybe(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  }

  function hasRecordShape(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    return Object.keys(value).some((key) =>
      /^(doc_?id|docId|documentId|dataId|split_?index|splitIndex|chunkIndex|snippet|text|content|pageContent)$/i.test(
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
    for (const key of [
      "records",
      "results",
      "result",
      "list",
      "data",
      "searchResults",
      "searchResult",
      "chunks"
    ]) {
      if (!hasOwn(value, key)) continue;
      const records = toRecords(value[key]);
      if (records.length > 0) return records;
    }
    return [];
  }

  function metadataOf(record) {
    return asObject(record && (record.metadata || record.metaData || record.meta));
  }

  function pick(record, metadata, keys) {
    for (const key of keys) {
      if (hasOwn(record, key) && record[key] !== null && record[key] !== undefined) {
        return record[key];
      }
      if (
        hasOwn(metadata, key) &&
        metadata[key] !== null &&
        metadata[key] !== undefined
      ) {
        return metadata[key];
      }
    }
    return "";
  }

  function pickNonBlank(record, metadata, keys) {
    for (const key of keys) {
      for (const container of [record, metadata]) {
        if (!hasOwn(container, key)) continue;
        const value = container[key];
        if (value === null || value === undefined) continue;
        if (typeof value === "string" && !value.trim()) continue;
        return value;
      }
    }
    return "";
  }

  function scalarString(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    return "";
  }

  function normalizeSpaces(value) {
    return scalarString(value)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
      .replace(/\uFFFD/g, "")
      .replace(/\s+/g, " ")
      .trim();
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
        hasOwn(named, name.toLowerCase()) ? named[name.toLowerCase()] : match
      )
      .replace(/&#(\d+);/g, (_, code) => {
        const value = Number(code);
        return Number.isFinite(value) ? String.fromCodePoint(value) : "";
      })
      .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
        const value = parseInt(code, 16);
        return Number.isFinite(value) ? String.fromCodePoint(value) : "";
      });
  }

  function cleanFullText(value) {
    let text = scalarString(value);
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
    // 保留段落边界，避免“Results/结果”标题与下一句黏连后无法识别。
    return unique.join("\n").trim();
  }

  function compressSnippet(fullText, lane) {
    const text = scalarString(fullText).trim();
    if (text.length <= 1000) return text;
    if (lane !== "clinical_study_initial" && lane !== "clinical_study_supplement") {
      return text.slice(0, 1000).trim();
    }

    // 临床研究长摘要的结果段常位于Methods之后。身份判定使用未截断全文；
    // 模型可见snippet则保留题名前文、Results/结果及Conclusion/结论附近文本。
    const windows = [];
    const addWindow = (start, length) => {
      const safeStart = Math.max(0, Math.min(text.length, start));
      const value = text.slice(safeStart, safeStart + length).trim();
      if (value && !windows.includes(value)) windows.push(value);
    };
    addWindow(0, 300);
    const resultsMatch = /(?:^|[\s.;。；])(?:results?|结果)\s*[:：]?/i.exec(text);
    if (resultsMatch) addWindow(Math.max(0, resultsMatch.index - 80), 560);
    const conclusionMatch = /(?:^|[\s.;。；])(?:conclusions?|结论)\s*[:：]?/i.exec(text);
    if (conclusionMatch) addWindow(Math.max(0, conclusionMatch.index - 40), 260);
    if (windows.length === 1) addWindow(Math.max(0, text.length - 650), 650);
    return windows.join("…").slice(0, 1000).trim();
  }

  function sourceText(record, metadata) {
    const direct = pickNonBlank(record, metadata, [
      "snippet",
      "text",
      "content",
      "pageContent",
      "chunk"
    ]);
    if (scalarString(direct).trim()) return direct;
    const q = scalarString(
      pickNonBlank(record, metadata, ["q", "question"])
    ).trim();
    const a = scalarString(
      pickNonBlank(record, metadata, ["a", "answer"])
    ).trim();
    return [q, a].filter(Boolean).join("\n");
  }

  function safeSourceUrl(value) {
    const text = normalizeSpaces(value);
    return /^https?:\/\/\S+$/i.test(text) ? text : "";
  }

  function locatorKey(docId, splitIndex) {
    return `${String(docId)}::${String(splitIndex)}`;
  }

  function validSplitIndex(value) {
    // 发布合同要求非负整数；不把字符串静默改型，以免改变来源定位。
    return Number.isInteger(value) && value >= 0;
  }

  function normalizeRecord(rawRecord, lane) {
    const record = rawRecord && typeof rawRecord === "object" ? rawRecord : {};
    const metadata = metadataOf(record);
    const isClinicalStudyLane =
      lane === "clinical_study_initial" || lane === "clinical_study_supplement";
    const docId = pickNonBlank(record, metadata, [
      "doc_id",
      "docId",
      "document_id",
      "documentId",
      "dataId",
      "sourceId"
    ]);
    const splitIndex = pickNonBlank(record, metadata, [
      "split_index",
      "splitIndex",
      "chunk_index",
      "chunkIndex",
      "index"
    ]);
    const recordTitle = normalizeSpaces(record.title);
    const metadataTitle = normalizeSpaces(metadata.title);
    const studyName = normalizeSpaces(
      pickNonBlank(record, metadata, ["study_name", "studyName"])
    );
    const guidelineName = normalizeSpaces(
      pickNonBlank(record, metadata, ["guideline_name", "guidelineName"])
    );
    const dataSourceName = normalizeSpaces(
      pickNonBlank(record, metadata, ["dataSourceName", "data_source_name"])
    );
    const namedSource = normalizeSpaces(
      pickNonBlank(record, metadata, [
        "formal_title",
        "formalTitle",
        "source_title",
        "sourceName",
        "documentTitle",
        "publicationTitle"
      ])
    );
    const explicitSection = normalizeSpaces(
      pickNonBlank(record, metadata, [
        "source_section",
        "section",
        "heading",
        "chapter",
        "chunk_title",
        "chunkTitle"
      ])
    );
    // 临床研究的dataSourceName常是期刊名；正式研究/文章题名优先来自
    // study_name、metaData.title或record.title。record.title同时保留为分块章节。
    const sourceTitle = isClinicalStudyLane
      ? studyName || metadataTitle || recordTitle || namedSource || dataSourceName
      : dataSourceName || guidelineName || namedSource;
    const sourceSection = isClinicalStudyLane
      ? explicitSection || recordTitle
      : explicitSection || recordTitle || metadataTitle;
    const explicitAuthority = normalizeSpaces(
      pickNonBlank(record, metadata, [
        "authority",
        "issuing_authority",
        "organization"
      ])
    );
    const sourceAuthority = isClinicalStudyLane
      ? explicitAuthority ||
        normalizeSpaces(
          pickNonBlank(record, metadata, [
            "journal_name",
            "meeting_name",
            "publisher",
            "dataSourceName",
            "data_source_name"
          ])
        )
      : explicitAuthority;
    const fullText = cleanFullText(sourceText(record, metadata));
    const snippet = compressSnippet(fullText, lane);

    if (typeof docId !== "string" || !docId.trim()) {
      return { valid: false, reason: "MISSING_DOC_ID" };
    }
    if (!validSplitIndex(splitIndex)) {
      return { valid: false, reason: "INVALID_SPLIT_INDEX" };
    }
    if (!sourceTitle) {
      return { valid: false, reason: "MISSING_SOURCE_TITLE" };
    }
    if (!snippet) {
      return { valid: false, reason: "EMPTY_SNIPPET" };
    }

    return {
      valid: true,
      full_text: fullText,
      record: {
        evidence_id: "",
        lane,
        doc_id: docId,
        split_index: splitIndex,
        type: normalizeSpaces(
          pickNonBlank(record, metadata, ["type", "source_type"])
        ),
        authority: sourceAuthority,
        source_title: sourceTitle,
        source_version: normalizeSpaces(
          pickNonBlank(record, metadata, [
            "source_version",
            "version",
            "year",
            "publish_year",
            "publication_year"
          ])
        ),
        source_section: sourceSection,
        source_url: safeSourceUrl(
          pickNonBlank(record, metadata, [
            "source_url",
            "url",
            "link",
            "sourceUrl"
          ])
        ),
        snippet,
        hard_evidence_type: "",
        reasoning_eligible: false,
        eligibility_class: "ineligible"
      }
    };
  }

  function identifiableStudy(record, fullText) {
    const text = [
      record.source_title,
      record.source_version,
      record.source_section,
      scalarString(fullText) || record.snippet
    ].join(" ");
    const identityText = `${record.source_title} ${record.source_section}`;
    if (
      /(case\s*report|case\s*series|病例报告|病例分享|个案报道|个案报告|we\s+(?:first\s+)?report(?:ed)?\s+(?:a\s+)?cases?|report(?:ed)?\s+cases?)/i.test(
        `${record.source_title} ${record.source_section} ${record.snippet}`
      )
    ) {
      return false;
    }
    const hasRegistry =
      /\bNCT\d{6,8}\b/i.test(text) ||
      /\bChiCTR[-_A-Za-z0-9]*\d{4,}\b/i.test(text) ||
      /\b(?:jRCT|UMIN|ACTRN|ISRCTN|CTR)[-_A-Za-z0-9]*\d{4,}\b/i.test(text);
    const hasIdentity =
      hasRegistry ||
      /(\btrial\b|\bstudy\b|临床试验|随机研究|队列研究)/i.test(
        record.source_title
      );
    const hasDesign =
      /(随机|对照|双盲|开放标签|单臂|队列|前瞻|回顾|phase\s*[i1-4v]+|[一二三四1-4]期|randomi[sz]ed|cohort)/i.test(
        text
      );
    const hasPopulation =
      /(患者|受试者|入组|人群|participants?|patients?|eligible)/i.test(text);
    const hasIntervention =
      /(接受|使用|治疗|联合|单药|方案|治疗组|对照组|versus|\bvs\.?\b|received|treated|treatment|therapy|regimen|intervention)/i.test(
        text
      );
    const hasEndpoint =
      /(主要终点|次要终点|终点|PFS|OS|ORR|DFS|EFS|\bMPR\b|\bpCR\b|\bOR\b|endpoint)/i.test(
        text
      );
    const resultsMatch =
      /(?:^|[\r\n.;。；])\s*(?:results?|结果)\s*(?:[:：]|[\r\n]+|(?=(?:showed|demonstrated|reported|included|enrolled|randomized|显示|表明|提示|截至|共|纳入|入组)))/i.exec(text);
    const resultsWindow = resultsMatch
      ? text.slice(resultsMatch.index, resultsMatch.index + 1200)
      : "";
    const commonStudyTokens = new Set([
      "RESULT", "RESULTS", "TRIAL", "STUDY", "PHASE", "PFS", "OS", "ORR",
      "DFS", "EFS", "HR", "CI", "NSCLC", "SCLC", "ALK", "EGFR", "ROS1",
      "RET", "KRAS", "BRAF", "NTRK", "MET", "HER2", "PDL1", "TKI",
      "III", "IV"
    ]);
    function identityTokens(value) {
      const tokens = [];
      const pattern = /\b([A-Z][A-Z0-9-]{2,24}(?:\s+\d{2,5})?)\b/g;
      let match;
      while ((match = pattern.exec(String(value || ""))) !== null) {
        const token = match[1].replace(/\s+/g, " ").trim().toUpperCase();
        if (!commonStudyTokens.has(token) && !/^\d+$/.test(token)) tokens.push(token);
      }
      return Array.from(new Set(tokens));
    }
    function referencedStudyTokens(value) {
      const tokens = [];
      const pattern = /\b([A-Z][A-Z0-9-]{2,24}(?:\s+\d{2,5})?)\s*(?=(?:(?:trial|study)\b|研究|试验))/gi;
      let match;
      while ((match = pattern.exec(String(value || ""))) !== null) {
        const token = match[1].replace(/\s+/g, " ").trim().toUpperCase();
        if (!commonStudyTokens.has(token) && !/^\d+$/.test(token)) tokens.push(token);
      }
      return Array.from(new Set(tokens));
    }
    const currentStudyTokens = new Set(identityTokens(identityText));
    const priorAttribution =
      /\b(?:prior|previous|previously|earlier)\b|既往|此前|先前|其他(?:研究|试验)|另一项(?:研究|试验)/i;
    const futureOrDesignAction =
      /\b(?:will|shall)\s+(?:be\s+)?(?:enroll|recruit|register|receive|undergo)|\b(?:is|are|was|were)\s+(?:planned|expected|intended|designed)\s+to\s+(?:enroll|recruit|assess|evaluate|receive|undergo)|\b(?:aims?|plans?|intends?)\s+to\s+(?:enroll|recruit|assess|evaluate|receive|undergo)|拟纳入|计划纳入|计划入组|将入组|将招募|将接受|预期纳入|旨在纳入/i;
    const resultSegments = resultsWindow
      .split(/[。！？!?；;\n]+|\.(?:\s+|$)/)
      .map((segment) => segment.trim())
      .filter(Boolean);
    const ownResultSegments = [];
    let resultOwner = "unknown";
    for (const segment of resultSegments) {
      const allTokens = identityTokens(segment);
      const mentionedStudies = referencedStudyTokens(segment);
      const mentionsCurrent =
        allTokens.some((token) => currentStudyTokens.has(token)) ||
        /\b(?:this|our)\s+(?:study|trial)\b|\bwe\s+(?:enrolled|randomized|included|treated)|本研究|该研究/i.test(
          segment
        );
      const mentionsForeignStudy =
        currentStudyTokens.size > 0 &&
        mentionedStudies.length > 0 &&
        !mentionedStudies.some((token) => currentStudyTokens.has(token));

      if (priorAttribution.test(segment) || mentionsForeignStudy) {
        // 所有权持续到明确出现当前研究标识；分号后的裸ORR/PFS不得脱离前句归属。
        resultOwner = "prior";
        continue;
      }
      if (futureOrDesignAction.test(segment)) {
        if (mentionsCurrent) resultOwner = "design";
        continue;
      }
      if (mentionsCurrent) {
        resultOwner = "current";
      } else if (resultOwner === "prior" || resultOwner === "design") {
        continue;
      } else if (resultOwner === "unknown") {
        // Results段首个无他研/未来标识的陈述，按当前记录本研究结果处理。
        resultOwner = "current";
      }
      ownResultSegments.push(segment);
    }
    const ownResultsText = ownResultSegments.join(" ");
    const hasQuantitativeOutcome =
      /(\d+(?:\.\d+)?\s*%|\bHR\s*[=:：]?\s*\d|hazard\s*ratio\s*[=:：]?\s*\d|\b(?:mPFS|mOS|PFS|OS|ORR|DFS|EFS)\b[^。.;]{0,40}\d|中位[^。；;]{0,30}\d+|置信区间|95%\s*CI)/i.test(
        ownResultsText
      );
    const hasCompletedCohort =
      /(?:本研究|该研究)?(?:纳入|入组|随机分配|共)\s*(?:了)?\s*\d+\s*例|(?:enrolled|randomized|included)\s+\d+\s+(?:patients?|participants?)|\d+\s+(?:patients?|participants?)\s+(?:were\s+)?(?:enrolled|randomized|included)/i.test(
        ownResultsText
      );
    const hasOwnStudyResults =
      Boolean(resultsMatch) && (hasQuantitativeOutcome || hasCompletedCohort);
    const designOnlyIdentity =
      /(study\s+to\s+assess|trial\s+design|study\s+design|rationale\s+and\s+(?:study\s+)?design|\bprotocol\b)/i.test(
        identityText
      );
    const futureStudyAction =
      futureOrDesignAction.test(text);
    const explicitlyNoOwnResults =
      /(no\s+(?:[A-Z][A-Z0-9-]*\s+)?(?:study\s+)?(?:results?|outcomes?|findings)\s+(?:are|were)\s+available|尚无(?:本研究|该研究)?(?:结果|结局)|(?:本研究|该研究)(?:结果|结局)尚未(?:公布|报告)|未报告(?:本研究|该研究)(?:结果|结局))/i.test(
        text
      );
    if (
      designOnlyIdentity ||
      explicitlyNoOwnResults ||
      (futureStudyAction && !hasOwnStudyResults)
    ) {
      return false;
    }
    return Boolean(
      hasIdentity &&
        hasDesign &&
        hasPopulation &&
        hasIntervention &&
        hasEndpoint &&
        hasOwnStudyResults
    );
  }

  function hardEvidenceType(record, fullText) {
    if (
      record.type.toLowerCase() === "guideline" &&
      Boolean(record.authority) &&
      Boolean(record.source_title)
    ) {
      return "指南";
    }
    if (
      (record.lane === "clinical_study_initial" ||
        record.lane === "clinical_study_supplement") &&
      record.type.toLowerCase() !== "guideline" &&
      identifiableStudy(record, fullText)
    ) {
      return "临床研究";
    }
    return "";
  }

  function eligibleSecondaryForReasoning(record) {
    const type = record.type.toLowerCase().replace(/[\s-]+/g, "_");
    const identity = `${record.source_title} ${record.authority}`;
    const forbidden =
      /(病例分享|个案|case\s*report|会议新闻|会议报道|媒体|新闻|解读|述评|观点|医生文章|科普)/i.test(
        identity
      );
    const eligibleType =
      /(systematic_review|meta_analysis|evidence_review|society_education|official_education|educational_resource)/i.test(
        type
      );
    const eligibleIdentity =
      /(系统综述|meta[_ -]?analysis|systematic\s+review|循证综述|学会教育|official\s+education|educational\s+resource)/i.test(
        identity
      );
    return Boolean(
      !forbidden &&
        eligibleType &&
        eligibleIdentity &&
        record.authority &&
        record.source_title &&
        record.snippet
    );
  }

  function eligibleForConfiguredLane(record) {
    if (record.lane !== "guideline_a_staging") return true;

    const text = `${record.source_title} ${record.source_section} ${record.snippet}`;
    if (/(驱动基因阴性|儿童|青少年|pediatric)/i.test(text)) return false;
    if (/(术后病理评估|新辅助.{0,20}术后|\bpCR\b|\bMPR\b|\bypTNM\b)/i.test(text)) {
      return false;
    }

    return /(?:EBUS|CP-EBUS|mediastinoscopy|纵隔镜|淋巴结.{0,60}(?:分期|取样|采样|清扫|活检|组织学验证)|(?:分期|staging).{0,60}(?:淋巴结|lymph|nodal|mediastinal|hilar)|(?:mediastinal|hilar).{0,80}(?:sampling|dissection|staging))/i.test(
      text
    );
  }

  const prefixCounters = { GS: 0, GA: 0, GB: 0, CS: 0, IR: 0 };
  const seenLocators = new Set();
  const records = [];
  const laneEvidenceIds = {};
  const dropped = [];
  const inputCounts = {};
  const retrievalErrors = RETRIEVAL_ERROR_FIELDS.flatMap(({ key, lane }) => {
    const message = normalizeSpaces(source[key]);
    return message ? [{ lane, message: message.slice(0, 500) }] : [];
  });
  const retrievalHealth = {
    ok: retrievalErrors.length === 0,
    errors: retrievalErrors
  };

  for (const definition of LANE_DEFINITIONS) {
    const rawRecords = toRecords(source[definition.key]);
    inputCounts[definition.key] = rawRecords.length;
    laneEvidenceIds[definition.key] = [];
    let keptInLane = 0;

    for (let index = 0; index < rawRecords.length; index++) {
      if (keptInLane >= definition.limit) {
        dropped.push({
          lane: definition.key,
          index,
          reason: "LANE_LIMIT"
        });
        continue;
      }
      const normalized = normalizeRecord(rawRecords[index], definition.key);
      if (!normalized.valid) {
        dropped.push({ lane: definition.key, index, reason: normalized.reason });
        continue;
      }
      const record = normalized.record;
      record.hard_evidence_type = hardEvidenceType(record, normalized.full_text);
      if (!eligibleForConfiguredLane(record)) {
        dropped.push({
          lane: definition.key,
          index,
          reason: "LANE_CONTENT_MISMATCH",
          locator: locatorKey(record.doc_id, record.split_index)
        });
        continue;
      }
      record.reasoning_eligible = Boolean(
        record.hard_evidence_type || eligibleSecondaryForReasoning(record)
      );
      record.eligibility_class = record.hard_evidence_type
        ? "hard"
        : record.reasoning_eligible
          ? "clinical_reasoning_secondary"
          : "ineligible";
      if (!record.reasoning_eligible) {
        dropped.push({
          lane: definition.key,
          index,
          reason: "INELIGIBLE_SOURCE",
          locator: locatorKey(record.doc_id, record.split_index)
        });
        continue;
      }
      const locator = locatorKey(record.doc_id, record.split_index);
      if (seenLocators.has(locator)) {
        dropped.push({
          lane: definition.key,
          index,
          reason: "DUPLICATE_LOCATOR",
          locator
        });
        continue;
      }

      seenLocators.add(locator);
      prefixCounters[definition.prefix] += 1;
      record.evidence_id = `${definition.prefix}${String(
        prefixCounters[definition.prefix]
      ).padStart(2, "0")}`;
      records.push(record);
      laneEvidenceIds[definition.key].push(record.evidence_id);
      keptInLane += 1;
    }
  }

  const initialStudyCount = records.filter(
    (record) =>
      record.lane === "clinical_study_initial" &&
      record.hard_evidence_type === "临床研究"
  ).length;
  const supplementStudyCount = records.filter(
    (record) =>
      record.lane === "clinical_study_supplement" &&
      record.hard_evidence_type === "临床研究"
  ).length;
  const hardCandidateCount = records.filter((record) =>
    ["指南", "临床研究"].includes(record.hard_evidence_type)
  ).length;
  const eligibleCandidateCount = records.filter(
    (record) => record.reasoning_eligible === true
  ).length;
  function primaryDecisionDomain(record) {
    const text = `${record.source_title} ${record.source_section} ${record.snippet}`;
    if (record.lane === "irae_a" || record.lane === "irae_b") return "toxicity";
    if (/(鉴别诊断|病理诊断|小活检|再次取材|重新取材|病理复核|重新分期|分期评估|临床分期|淋巴结分期|纵隔镜|EBUS|\bstaging\b|mediastinoscopy)/i.test(text)) {
      return "diagnosis_staging";
    }
    if (/(寡进展|CNS\s*进展|脑转移|广泛进展|疾病进展|复发|耐药|后线|局部治疗)/i.test(text)) {
      return "progression_later_line";
    }
    if (/(分子检测|基因检测|融合检测|ALK.{0,16}检测|PD-?L1.{0,16}检测|免疫组织化学|\bIHC\b)/i.test(text)) {
      return "molecular_testing";
    }
    if (/(可切除|手术时机|根治性手术|R0\s*切除|多学科|\bMDT\b|病理缓解|完全病理缓解|主要病理缓解|\bMPR\b|\bpCR\b|瘤床)/i.test(text)) {
      return "local_operative";
    }
    if (/(术后|辅助治疗|长期随访|复查随访)/i.test(text)) {
      return "postoperative_followup";
    }
    if (/(一线治疗|系统治疗|靶向治疗|免疫治疗|化学治疗|化疗|\bTKI\b)/i.test(text)) {
      return "systemic_treatment";
    }
    return "other";
  }
  const decisionDomains = Array.from(
    new Set(records.filter((record) => record.reasoning_eligible).map(primaryDecisionDomain))
  );
  const identifiableStudyCount = initialStudyCount + supplementStudyCount;
  // 容量按互不相同的临床决策域估算；合格原始研究可额外支持研究解读题。
  // 不再仅凭“同一 locator 最多可复用两次”把同质分块虚增成五题。
  const estimatedQuestionCapacity = Math.min(
    5,
    eligibleCandidateCount,
    decisionDomains.length + identifiableStudyCount
  );
  const insufficientForFive =
    hardCandidateCount < 2 || estimatedQuestionCapacity < 5;
  const needsClinicalSupplement = retrievalHealth.ok && insufficientForFive;
  const supplementReasons = [];
  if (!retrievalHealth.ok) {
    supplementReasons.push("检索链存在技术错误，禁止把技术空结果送入研究补检或判为医学证据不足");
  }
  if (hardCandidateCount < 2) {
    supplementReasons.push("硬证据候选少于2条");
  }
  if (estimatedQuestionCapacity < 5) {
    supplementReasons.push("压缩证据池的理论五题容量不足");
  }

  const keptCounts = Object.fromEntries(
    Object.entries(laneEvidenceIds).map(([lane, ids]) => [lane, ids.length])
  );
  const compressionReport = {
    input_counts: inputCounts,
    kept_counts: keptCounts,
    kept_total: records.length,
    dropped_total: dropped.length,
    dropped
  };
  const capacityReport = {
    hard_candidate_count: hardCandidateCount,
    eligible_candidate_count: eligibleCandidateCount,
    decision_domain_count: decisionDomains.length,
    decision_domains: decisionDomains,
    estimated_question_capacity: estimatedQuestionCapacity,
    evidence_pool_insufficient_for_five: insufficientForFive,
    identifiable_initial_study_count: initialStudyCount,
    identifiable_supplement_study_count: supplementStudyCount
  };
  const evidencePool = {
    contract_version: "1.2",
    publication_schema_version: "1.1",
    limits: LANE_LIMITS,
    records,
    lanes: laneEvidenceIds,
    retrieval_health: retrievalHealth,
    capacity_report: capacityReport,
    compression_report: compressionReport
  };

  return {
    evidence_pool: evidencePool,
    evidence_pool_json: JSON.stringify(evidencePool),
    retrieval_health_ok: retrievalHealth.ok,
    retrieval_health: retrievalHealth,
    retrieval_errors: retrievalErrors,
    needs_clinical_supplement: needsClinicalSupplement,
    supplement_decision: !retrievalHealth.ok
      ? "BLOCKED_TECHNICAL"
      : insufficientForFive
        ? "TRIGGER"
        : "SKIP",
    supplement_reason: supplementReasons.join("；"),
    evidence_pool_insufficient_for_five: insufficientForFive,
    estimated_question_capacity: estimatedQuestionCapacity,
    hard_candidate_count: hardCandidateCount,
    eligible_candidate_count: eligibleCandidateCount,
    identifiable_initial_study_count: initialStudyCount,
    identifiable_supplement_study_count: supplementStudyCount,
    compression_report: compressionReport,
    compression_report_json: JSON.stringify(compressionReport)
  };
}
