function main({ candidate_json, evidence_pool }) {
  const ROOT_FIELDS = [
    "schema_version",
    "generation_status",
    "case_summary",
    "question_count",
    "difficulty",
    "questions",
    "missing_information",
    "risk_message"
  ];
  const QUESTION_FIELDS = [
    "id",
    "type",
    "phase",
    "timepoint",
    "question",
    "options",
    "answer",
    "answer_text",
    "explain",
    "keyPoint",
    "guidelineRef"
  ];
  const REF_FIELDS = [
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
  const EVIDENCE_TYPES = new Set(["指南", "临床研究", "病例+临床推理"]);
  const ABILITY_TYPES = new Set([
    "诊断与分期",
    "分子诊断",
    "治疗决策",
    "疗效复评与局部治疗",
    "耐药与后线管理",
    "不良反应管理"
  ]);

  const errors = [];
  const warnings = [];
  const citedRecords = [];
  const citedKeys = new Set();

  function hasOwn(object, key) {
    return Boolean(
      object && Object.prototype.hasOwnProperty.call(object, key)
    );
  }

  function parseExact(value, label) {
    if (value && typeof value === "object") return value;
    if (typeof value !== "string" || !value.trim()) {
      errors.push(`${label}为空或不是JSON对象/字符串`);
      return null;
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      errors.push(
        `${label}不能被JSON.parse直接解析：${String(error && error.message ? error.message : error)}`
      );
      return null;
    }
  }

  function parsePool(value) {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch (_) {
        errors.push("evidence_pool不能被JSON.parse直接解析");
        return {};
      }
    }
    return value && typeof value === "object" ? value : {};
  }

  function poolRecords(value) {
    const pool = parsePool(value);
    if (Array.isArray(pool)) return pool;
    if (Array.isArray(pool.records)) return pool.records;
    const laneKeys = [
      "guideline_a",
      "guideline_b",
      "clinical_study_initial",
      "clinical_study_supplement",
      "irae_a",
      "irae_b"
    ];
    return laneKeys.flatMap((key) =>
      Array.isArray(pool[key]) ? pool[key] : []
    );
  }

  function locatorKey(docId, splitIndex) {
    return `${String(docId ?? "").trim()}::${String(splitIndex ?? "").trim()}`;
  }

  function sameScalar(left, right) {
    return String(left ?? "") === String(right ?? "");
  }

  function nonEmptyString(value) {
    return typeof value === "string" && Boolean(value.trim());
  }

  function forbiddenAnswerLetter(text) {
    const value = String(text ?? "");
    return (
      /正确答案(?:为|是|：|:)?\s*[ABCD](?![A-Za-z])/i.test(value) ||
      /选项\s*[ABCD](?![A-Za-z])/i.test(value) ||
      /[ABCD]\s*项(?![A-Za-z])/i.test(value)
    );
  }

  const candidate = parseExact(candidate_json, "candidate_json");
  const records = poolRecords(evidence_pool);
  const passthrough =
    typeof candidate_json === "string"
      ? candidate_json
      : candidate
        ? JSON.stringify(candidate)
        : "";

  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return {
      structure_decision: "FAIL",
      structure_errors: errors,
      structure_warnings: warnings,
      candidate_json_passthrough: passthrough,
      cited_evidence: [],
      cited_evidence_json: "[]",
      hard_evidence_count: 0,
      clinical_reasoning_count: 0
    };
  }

  for (const field of ROOT_FIELDS) {
    if (!hasOwn(candidate, field)) {
      errors.push(`根对象缺少字段：${field}`);
    }
  }

  if (candidate.schema_version !== "1.1") {
    errors.push("schema_version必须逐字等于1.1");
  }
  if (candidate.difficulty !== "进阶") {
    errors.push("difficulty必须逐字等于进阶");
  }

  if (candidate.generation_status === "insufficient") {
    if (candidate.question_count !== 0) {
      errors.push("insufficient时question_count必须为0");
    }
    if (!Array.isArray(candidate.questions) || candidate.questions.length !== 0) {
      errors.push("insufficient时questions必须为空数组");
    }
    if (
      !Array.isArray(candidate.missing_information) ||
      candidate.missing_information.length === 0
    ) {
      errors.push("insufficient时missing_information必须具体且非空");
    }
    if (!nonEmptyString(candidate.risk_message)) {
      errors.push("insufficient时risk_message必须具体且非空");
    }
    return {
      structure_decision: errors.length === 0 ? "INSUFFICIENT" : "FAIL",
      structure_errors: errors,
      structure_warnings: warnings,
      candidate_json_passthrough: passthrough,
      cited_evidence: [],
      cited_evidence_json: "[]",
      hard_evidence_count: 0,
      clinical_reasoning_count: 0
    };
  }

  if (candidate.generation_status !== "success") {
    errors.push("generation_status只能为success或insufficient");
  }
  if (candidate.question_count !== 5) {
    errors.push("success时question_count必须为5");
  }
  if (!Array.isArray(candidate.questions) || candidate.questions.length !== 5) {
    errors.push("success时questions必须恰好包含5题");
  }
  if (
    !Array.isArray(candidate.missing_information) ||
    candidate.missing_information.length !== 0
  ) {
    errors.push("success时missing_information必须为空数组");
  }
  if (candidate.risk_message !== "") {
    errors.push("success时risk_message必须为空字符串");
  }

  const questions = Array.isArray(candidate.questions)
    ? candidate.questions
    : [];
  let hardEvidenceCount = 0;
  let clinicalReasoningCount = 0;
  const locatorUsage = new Map();

  for (let index = 0; index < questions.length; index++) {
    const q = questions[index];
    const label = q && nonEmptyString(q.id) ? q.id : `第${index + 1}题`;

    if (!q || typeof q !== "object" || Array.isArray(q)) {
      errors.push(`第${index + 1}题不是对象`);
      continue;
    }

    for (const field of QUESTION_FIELDS) {
      if (!hasOwn(q, field)) {
        errors.push(`${label}缺少字段：${field}`);
      }
    }
    if (q.id !== `Q${index + 1}`) {
      errors.push(`第${index + 1}题id必须为Q${index + 1}`);
    }
    if (!ABILITY_TYPES.has(q.type)) {
      errors.push(`${label}的type不在六项允许值中`);
    }
    for (const field of ["phase", "timepoint", "question", "answer_text", "explain", "keyPoint"]) {
      if (!nonEmptyString(q[field])) {
        errors.push(`${label}的${field}必须为非空字符串`);
      }
    }

    if (!Array.isArray(q.options) || q.options.length !== 4) {
      errors.push(`${label}的options必须恰好4项`);
    } else {
      if (q.options.some((option) => !nonEmptyString(option))) {
        errors.push(`${label}存在空选项或非字符串选项`);
      }
      if (new Set(q.options.map((option) => String(option).trim())).size !== 4) {
        errors.push(`${label}存在重复选项`);
      }
      if (q.options.some((option) => /以上(?:都|全|均)(?:是|正确)|以上(?:都|均)不是/.test(option))) {
        errors.push(`${label}包含以上都是/以上都不是类选项`);
      }
      q.options.forEach((option, optionIndex) => {
        if (String(option ?? "").length > 60) {
          warnings.push(`${label}选项${optionIndex + 1}超过60字`);
        }
      });
    }

    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) {
      errors.push(`${label}的answer必须为0至3整数`);
    } else if (
      !Array.isArray(q.options) ||
      q.answer_text !== q.options[q.answer]
    ) {
      errors.push(`${label}的answer_text与options[answer]不逐字一致`);
    }

    if (forbiddenAnswerLetter(q.explain) || forbiddenAnswerLetter(q.keyPoint)) {
      errors.push(`${label}的解析或keyPoint含答案字母引用`);
    }
    if (String(q.question ?? "").length > 160) {
      warnings.push(`${label}题干超过160字`);
    }
    if (String(q.explain ?? "").length > 160) {
      warnings.push(`${label}解析超过160字`);
    }
    if (String(q.keyPoint ?? "").length > 70) {
      warnings.push(`${label}keyPoint超过70字`);
    }

    const ref = q.guidelineRef;
    if (!ref || typeof ref !== "object" || Array.isArray(ref)) {
      errors.push(`${label}的guidelineRef必须为对象`);
      continue;
    }
    for (const field of REF_FIELDS) {
      if (!hasOwn(ref, field)) {
        errors.push(`${label}的guidelineRef缺少字段：${field}`);
      }
    }
    for (const field of REF_FIELDS.filter((name) => name !== "split_index")) {
      if (hasOwn(ref, field) && typeof ref[field] !== "string") {
        errors.push(`${label}的guidelineRef.${field}必须为字符串`);
      }
    }
    if (!EVIDENCE_TYPES.has(ref.evidence_type)) {
      errors.push(`${label}的evidence_type不在v1.1允许值中`);
    } else if (ref.evidence_type === "病例+临床推理") {
      clinicalReasoningCount++;
    } else {
      hardEvidenceCount++;
    }
    if (!nonEmptyString(ref.doc_id)) {
      errors.push(`${label}的doc_id必须非空`);
    }
    if (!Number.isInteger(ref.split_index) || ref.split_index < 0) {
      errors.push(`${label}的split_index必须为大于等于0的整数`);
    }
    if (!nonEmptyString(ref.source_title)) {
      errors.push(`${label}的source_title必须非空`);
    }
    if (!nonEmptyString(ref.evidence_summary)) {
      errors.push(`${label}的evidence_summary必须非空`);
    }

    const key = locatorKey(ref.doc_id, ref.split_index);
    const locatorQuestions = locatorUsage.get(key) || [];
    locatorQuestions.push({
      label,
      timepoint: q.timepoint,
      answer_text: q.answer_text,
      keyPoint: q.keyPoint
    });
    locatorUsage.set(key, locatorQuestions);
    const matches = records.filter(
      (record) =>
        locatorKey(record.doc_id, record.split_index) === key
    );
    if (matches.length !== 1) {
      errors.push(
        `${label}的定位在证据池中匹配${matches.length}条，必须恰好1条`
      );
      continue;
    }

    const record = matches[0];
    const metadataFields = [
      "type",
      "authority",
      "source_title",
      "source_version",
      "source_section",
      "source_url"
    ];
    for (const field of metadataFields) {
      if (!sameScalar(ref[field], record[field])) {
        errors.push(`${label}的${field}与定位记录不逐字一致`);
      }
    }

    if (!citedKeys.has(key)) {
      citedKeys.add(key);
      citedRecords.push(record);
    }
  }

  for (const [key, uses] of locatorUsage.entries()) {
    if (uses.length > 2) {
      errors.push(`证据定位${key}被使用${uses.length}次，超过最多2题`);
    }
    if (uses.length === 2) {
      const [first, second] = uses;
      for (const field of ["timepoint", "answer_text", "keyPoint"]) {
        if (!nonEmptyString(first[field]) || !nonEmptyString(second[field])) {
          errors.push(
            `证据定位${key}二次使用时${first.label}与${second.label}的${field}必须均为非空字符串`
          );
        } else if (first[field].trim() === second[field].trim()) {
          errors.push(
            `证据定位${key}二次使用时${first.label}与${second.label}的${field}必须不同`
          );
        }
      }
    }
  }
  if (hardEvidenceCount < 2) {
    errors.push("五题中硬证据题少于2道");
  }
  if (clinicalReasoningCount < 2) {
    errors.push("五题中病例+临床推理题少于2道");
  }

  return {
    structure_decision: errors.length === 0 ? "PASS" : "FAIL",
    structure_errors: errors,
    structure_warnings: warnings,
    candidate_json_passthrough: passthrough,
    cited_evidence: citedRecords,
    cited_evidence_json: JSON.stringify(citedRecords),
    hard_evidence_count: hardEvidenceCount,
    clinical_reasoning_count: clinicalReasoningCount
  };
}
