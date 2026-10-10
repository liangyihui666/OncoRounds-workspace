function main({
  structure_decision, structure_errors, structure_warnings, medical_auditable,
  mechanical_revision_mode,
  mechanical_repair_tasks, candidate_internal_json, candidate_public_json,
  review_text, patch_merge_decision, patch_merge_errors
}) {
  const ROUND = 2;
  const IDS = (() => { try { const p=typeof candidate_internal_json==='string'?JSON.parse(candidate_internal_json):candidate_internal_json;
      const n=Array.isArray(p?.questions)?p.questions.length:0; return Array.from({length:n>0&&n<=5?n:5},(_,i)=>'Q'+(i+1)); } catch (_) { return ['Q1','Q2','Q3','Q4','Q5']; } })();
  const FULL_QUESTION_FIELDS = [
    "type", "phase", "timepoint", "question", "options", "answer",
    "answer_text", "explain", "keyPoint", "evidence_id", "support_mode",
    "evidence_summary"
  ];
  const FULL_FIELD_SET = new Set(FULL_QUESTION_FIELDS);
  const EVIDENCE_BINDING_FIELDS = new Set([
    "guidelineRef", "evidence_type", "doc_id", "split_index", "authority",
    "source_title", "source_version", "source_section", "source_url"
  ]);
  const ROOT_ONLY_FIELDS = new Set([
    "schema_version", "generation_status", "case_summary", "question_count",
    "questions", "difficulty", "missing_information", "risk_message", "evidence_pool"
  ]);
  function asStrings(value) {
    if (Array.isArray(value)) return value.map((item) => String(item));
    if (value === undefined || value === null || value === "") return [];
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [value];
      } catch (_) { return [value]; }
    }
    return [String(value)];
  }
  function asObjects(value) {
    if (Array.isArray(value)) return value.filter((item) => item && typeof item === "object");
    if (value && typeof value === "object") return [value];
    if (typeof value === "string" && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === "object") : [];
      } catch (_) { return []; }
    }
    return [];
  }
  function parseExact(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch (_) { return null; }
  }
  function isExactEmptyArray(value) {
    return Array.isArray(value) && value.length === 0;
  }
  function validMissingInformation(value) {
    return Array.isArray(value) && value.length > 0 &&
      value.every((item) => typeof item === "string" && item.trim().length > 0);
  }
  function validPassQuestionChecks(value) {
    if (!Array.isArray(value) || value.length !== IDS.length) return false;
    const ids = value.map((item) =>
      item && typeof item === "object" && typeof item.id === "string" ? item.id : ""
    );
    if (new Set(ids).size !== IDS.length || IDS.some((id) => !ids.includes(id))) return false;
    return value.every(
      (item) => item && typeof item === "object" &&
        typeof item.id === "string" && IDS.includes(item.id) &&
        item.passed === true &&
        Array.isArray(item?.problems) && item.problems.length === 0 &&
        typeof item.revision === "string" && item.revision === ""
    );
  }
  function normalizeCode(value, origin) {
    const fallback = origin === "mechanical" ? "STRUCTURE_ERROR" : "MEDICAL_ERROR";
    if (typeof value !== "string") return fallback;
    const normalized = value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return /^[A-Z][A-Z0-9_]*$/.test(normalized) ? normalized : fallback;
  }
  function normalizeTask(task, origin) {
    const targetIds = Array.isArray(task?.target_ids)
      ? task.target_ids.map(String).filter((id) => IDS.includes(id))
      : (IDS.includes(String(task?.id || "")) ? [String(task.id)] : []);
    const rawFields = Array.isArray(task?.fields) ? task.fields.map(String).filter(Boolean) : [];
    const rootOnly = rawFields.length > 0 && rawFields.every((field) => ROOT_ONLY_FIELDS.has(field));
    const mappedFields = rootOnly
      ? rawFields
      : rawFields.flatMap((field) => {
          if (FULL_FIELD_SET.has(field)) return [field];
          if (EVIDENCE_BINDING_FIELDS.has(field)) return [field];
          if (field === "all") return [...FULL_QUESTION_FIELDS];
          return [];
        });
    const fields = Array.from(new Set(mappedFields));
    if (fields.length === 0) fields.push(...FULL_QUESTION_FIELDS);
    const rawCodes = Array.isArray(task?.codes) && task.codes.length
      ? task.codes
      : [task?.code];
    const codes = Array.from(new Set(rawCodes.map((code) => normalizeCode(code, origin))));
    return codes.map((code) => {
      const candidateMessage = [task?.message, task?.instruction, task?.revision]
        .find((value) => typeof value === "string" && value.trim().length > 0);
      return {
        target_ids: targetIds,
        code,
        fields,
        message: candidateMessage || code,
        origin
      };
    });
  }

  const structure = String(structure_decision || "FAIL");
  const mechanicalMode = ["PATCH", "FULL"].includes(String(mechanical_revision_mode))
    ? String(mechanical_revision_mode)
    : "";
  const structureErrors = asStrings(structure_errors);
  const structureWarnings = asStrings(structure_warnings);
  const mechanical = asObjects(mechanical_repair_tasks).flatMap((task) => normalizeTask(task, "mechanical"));
  const auditable = medical_auditable === true || String(medical_auditable) === "true";
  const review = auditable ? parseExact(review_text) : null;
  const allowed = new Set(["PASS", "REVISE", "STOP_INSUFFICIENT"]);
  const decisionIsExact =
    review && typeof review.decision === "string" && allowed.has(review.decision);
  let validatorDecision = decisionIsExact ? review.decision : "REVISE";
  const rawScore = review?.score;
  const scoreIsValidInteger =
    typeof rawScore === "number" && Number.isInteger(rawScore) && rawScore >= 0 && rawScore <= 100;
  let score = scoreIsValidInteger ? rawScore : 0;
  const medical = review
    ? asObjects(review.repair_tasks).flatMap((task) => normalizeTask(task, "medical"))
    : [];
  const allTasks = [...mechanical, ...medical];
  const advisoryChecks = allTasks.filter(t => ["QUOTA_CHECK", "QUOTA_RECALCULATION_RISK"].includes(t.code));
  if (allTasks.some(t => !["QUOTA_CHECK", "QUOTA_RECALCULATION_RISK"].includes(t.code))) {
    for (let i = allTasks.length - 1; i >= 0; i--) if (["QUOTA_CHECK", "QUOTA_RECALCULATION_RISK"].includes(allTasks[i].code)) allTasks.splice(i, 1);
  }
  const declaredValidatorDecision = validatorDecision;
  if (review && !scoreIsValidInteger) {
    validatorDecision = "REVISE";
    score = 0;
    allTasks.push({
      target_ids: [], code: "VALIDATOR_SCORE_INVALID", fields: [...FULL_QUESTION_FIELDS],
      message: "校验器score必须是0至100的JSON整数；非整数或越界分数不得发布。", origin: "medical"
    });
  }
  if (
    review && validatorDecision === "PASS" &&
    (
      !isExactEmptyArray(review.fatal_errors) ||
      !isExactEmptyArray(review.repair_tasks) ||
      !isExactEmptyArray(review.missing_information) ||
      typeof review.recommended_revision_mode !== "string" ||
      review.recommended_revision_mode !== "" ||
      typeof review.revision_instruction !== "string" ||
      review.revision_instruction !== "" ||
      !scoreIsValidInteger || !validPassQuestionChecks(review.question_checks)
    )
  ) {
    validatorDecision = "REVISE";
    allTasks.push({
      target_ids: [], code: "VALIDATOR_PASS_INCONSISTENT", fields: [...FULL_QUESTION_FIELDS],
      message: "校验器声称PASS但错误、修订任务、缺失信息、修订模式或逐题检查不一致。", origin: "medical"
    });
  }
  if (
    review && validatorDecision === "STOP_INSUFFICIENT" &&
    (
      !isExactEmptyArray(review.repair_tasks) ||
      !isExactEmptyArray(review.question_checks) ||
      !validMissingInformation(review.missing_information) ||
      !Array.isArray(review.fatal_errors) ||
      typeof review.recommended_revision_mode !== "string" ||
      review.recommended_revision_mode !== "" ||
      typeof review.revision_instruction !== "string" ||
      review.revision_instruction !== ""
    )
  ) {
    validatorDecision = "REVISE";
    allTasks.push({
      target_ids: [], code: "VALIDATOR_STOP_INCONSISTENT", fields: [...FULL_QUESTION_FIELDS],
      message: "校验器的STOP_INSUFFICIENT缺少完整证据缺口或夹带了题目修订内容。", origin: "medical"
    });
  }
  if (!auditable) {
    validatorDecision = "REVISE";
    score = 0;
    if (allTasks.length === 0) {
      allTasks.push({
        target_ids: [], code: "NO_AUDITABLE_DRAFT", fields: [...FULL_QUESTION_FIELDS],
        message: "候选无法解析或完全没有可审核题目，第二轮必须FULL重建。", origin: "mechanical"
      });
    }
  } else if (!review) {
    validatorDecision = "REVISE";
    score = 0;
    allTasks.push({
      target_ids: [], code: "VALIDATOR_JSON_INVALID", fields: [...FULL_QUESTION_FIELDS],
      message: "独立医学校验未返回可直接解析的JSON。", origin: "medical"
    });
  }

  const patchDecision = String(patch_merge_decision || "");
  const patchErrors = asStrings(patch_merge_errors);
  const patchPass = patchDecision === "PASS" && patchErrors.length === 0;
  const patchInsufficient = patchDecision === "INSUFFICIENT" && patchErrors.length === 0;
  const patchTransportOk = patchPass || patchInsufficient;

  for (const message of patchErrors) {
    allTasks.push({
      target_ids: [], code: "PATCH_MERGE_FAILED", fields: [...FULL_QUESTION_FIELDS], message, origin: "mechanical"
    });
  }

  let decision = validatorDecision;
  const parsedCandidate = parseExact(candidate_internal_json);
  const candidateInsufficient = parsedCandidate?.generation_status === "insufficient";
  if (decision === "PASS" && (structure !== "PASS" || !patchPass)) {
    decision = "REVISE";
  }
  if (decision === "STOP_INSUFFICIENT") {
    const structureAllowsStop = structure === "INSUFFICIENT";
    const patchAllowsStop = ROUND === 1 || patchInsufficient;
    if (!candidateInsufficient || !structureAllowsStop || !patchAllowsStop) decision = "REVISE";
  }
  if (!auditable || !review || !patchTransportOk) decision = "REVISE";

  if (decision === "REVISE" && allTasks.length === 0) {
    allTasks.push({
      target_ids: [], code: "REVIEW_REVISE", fields: [...FULL_QUESTION_FIELDS],
      message: String(review?.revision_instruction || "按独立审核意见完整修订候选题。"), origin: "medical"
    });
  }
  const rootOrSetTask = allTasks.some((task) => task.target_ids.length === 0);
  const requestedMode = typeof review?.recommended_revision_mode === "string"
    ? review.recommended_revision_mode
    : "INVALID";
  const targets = Array.from(new Set(allTasks.flatMap((task) => task.target_ids))).filter((id) => IDS.includes(id));
  const revisionMode = decision === "REVISE"
    ? (
        rootOrSetTask || mechanicalMode === "FULL" || requestedMode === "FULL" || targets.length === 0
          ? "FULL"
          : "PATCH"
      )
    : "";
  const rootOnlyTask = (task) =>
    Array.isArray(task.fields) && task.fields.length > 0 &&
    task.fields.every((field) => ROOT_ONLY_FIELDS.has(field));
  const cleanTasks = allTasks.map(({ target_ids, code, fields, message }) => {
    const isRootOnly = rootOnlyTask({ fields });
    return {
      target_ids:
        revisionMode === "FULL" && target_ids.length === 0 && !isRootOnly
          ? [...IDS]
          : target_ids,
      code,
      fields,
      message
    };
  });
  const effectiveTargets = Array.from(new Set(
    cleanTasks.filter((task) => !rootOnlyTask(task)).flatMap((task) => task.target_ids)
  ));
  const existingIds = Array.isArray(parsedCandidate?.questions)
    ? Array.from(new Set(
        parsedCandidate.questions
          .map((question) => String(question?.id || ""))
          .filter((id) => IDS.includes(id))
      ))
    : [];
  const preserveIds = revisionMode
    ? existingIds.filter((id) => !effectiveTargets.includes(id))
    : [];
  const repairPacket = {
    revision_mode: revisionMode,
    repair_tasks: cleanTasks,
    preserve_ids: preserveIds,
    post_checks: advisoryChecks.map(t => ({ code: t.code, message: t.message })),
    output_contract: { revision_mode: revisionMode, required_replacement_ids: effectiveTargets,
      unchanged_ids: preserveIds, full_may_inherit_preserved: true,
      root_summary_authorized: cleanTasks.some(t => t.fields.includes("case_summary")),
      note: "实质修订逐项落实；复核不以强制改变正确标签代替。" }
  };
  const missing = review?.missing_information ?? [];
  const general = !auditable
    ? "候选不可医审；已生成FULL修订任务。"
    : String(review?.general_feedback || (decision === "PASS" ? "独立审核通过。" : "已合并结构与医学审核。"));
  const feedback = {
    round: ROUND,
    raw_medical_decision: review?.decision || "",
    raw_medical_review: review || null,
    decision,
    score,
    declared_validator_decision: declaredValidatorDecision,
    validator_decision: validatorDecision,
    structure_decision: structure,
    structure_errors: structureErrors,
    structure_warnings: structureWarnings,
    mechanical_revision_mode: mechanicalMode,
    medical_auditable: auditable,
    patch_merge_decision: patchDecision,
    patch_merge_errors: patchErrors,
    recommended_revision_mode: revisionMode,
    repair_tasks: cleanTasks,
    preserve_ids: preserveIds,
    fatal_errors: Array.isArray(review?.fatal_errors) ? review.fatal_errors : [],
    question_checks: Array.isArray(review?.question_checks) ? review.question_checks : [],
    revision_instruction: String(review?.revision_instruction || ""),
    missing_information: missing,
    general_feedback: general
  };
  return {
    decision,
    score,
    revision_mode: revisionMode,
    repair_tasks: cleanTasks,
    preserve_ids: preserveIds,
    repair_packet_json: JSON.stringify(repairPacket),
    feedback_json: JSON.stringify(feedback),
    missing_information: typeof missing === "string" ? missing : JSON.stringify(missing),
    general_feedback: general,
    publishable: decision === "PASS" && structure === "PASS" && patchPass
  };
}