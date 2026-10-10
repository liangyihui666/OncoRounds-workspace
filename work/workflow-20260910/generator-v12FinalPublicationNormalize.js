function normalizePublication({
  r1_decision, r1_score, r1_publishable, r1_candidate, r1_feedback, r1_missing,
  r2_decision, r2_score, r2_publishable, r2_candidate, r2_feedback, r2_missing
}) {
  function validDecision(value) {
    return typeof value === "string" && ["PASS", "REVISE", "STOP_INSUFFICIENT"].includes(value);
  }
  function score(value) {
    return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100
      ? value
      : 0;
  }
  function arrayValue(value) {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === "string" && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(String) : [value];
      } catch (_) { return [value]; }
    }
    return [];
  }
  function validPublicCandidate(value) {
    if (typeof value !== "string" || !value.trim()) return false;
    try {
      const parsed = JSON.parse(value);
      return parsed?.schema_version === "1.1" &&
        parsed?.generation_status === "success" &&
        parsed?.difficulty === "进阶" &&
        parsed?.question_count === 5 &&
        Array.isArray(parsed?.questions) && parsed.questions.length === 5;
    } catch (_) { return false; }
  }
  function candidateSummary(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    try {
      const parsed = JSON.parse(value);
      const summary = typeof parsed?.case_summary === "string" ? parsed.case_summary : "";
      return summary && summary.length <= 400 ? summary : "";
    } catch (_) { return ""; }
  }

  const hasRound2 = r2_decision !== undefined && r2_decision !== null && r2_decision !== "";
  const round1Candidate = String(r1_candidate || "");
  const round2Candidate = String(r2_candidate || "");
  const round1Valid = validPublicCandidate(round1Candidate);
  const round2Valid = validPublicCandidate(round2Candidate);
  const candidate = hasRound2 && round2Valid
    ? round2Candidate
    : (round1Valid ? round1Candidate : round2Candidate);
  const selectedDecision = hasRound2 ? r2_decision : r1_decision;
  const rawDecision = validDecision(selectedDecision) ? selectedDecision : "REVISE";
  const finalScore = score(hasRound2 ? r2_score : r1_score);
  const feedback = String(hasRound2 ? (r2_feedback || "") : (r1_feedback || ""));
  const missing = arrayValue(hasRound2 ? r2_missing : r1_missing);
  const preservedCaseSummary = candidateSummary(candidate) || candidateSummary(round1Candidate);

  let status;
  if (hasRound2) {
    status = round2Valid || round1Valid
      ? "PASS"
      : (rawDecision === "STOP_INSUFFICIENT" ? "STOP_INSUFFICIENT" : "REVISE_EXHAUSTED");
  } else if (
    rawDecision === "PASS" &&
    finalScore >= 75 &&
    r1_publishable === true &&
    round1Valid
  ) {
    status = "PASS";
  } else if (rawDecision === "STOP_INSUFFICIENT") {
    status = "STOP_INSUFFICIENT";
  } else {
    status = "REVISE_EXHAUSTED";
  }

  const normalizedMissing = status === "PASS"
    ? []
    : (
        missing.length
          ? missing
          : [
              status === "STOP_INSUFFICIENT"
                ? "当前完整证据池不足以安全形成固定五题。"
                : "两轮均未形成可解析的完整五题JSON。"
            ]
      );
  const failure = {
    schema_version: "1.1",
    generation_status: "insufficient",
    case_summary: preservedCaseSummary,
    question_count: 0,
    difficulty: "进阶",
    questions: [],
    missing_information: normalizedMissing,
    risk_message: status === "STOP_INSUFFICIENT"
      ? "STOP_INSUFFICIENT：发布0题。"
      : "第二轮未形成可解析的完整五题JSON，发布0题。"
  };

  return {
    status,
    publishable: status === "PASS",
    final_response_json: status === "PASS" ? candidate : JSON.stringify(failure),
    final_questions_json: status === "PASS" ? candidate : "",
    validation_decision: rawDecision,
    validation_score: finalScore,
    validation_feedback: feedback,
    missing_information: JSON.stringify(normalizedMissing),
    round_count: hasRound2 ? 2 : 1
  };
}
function main(inputs) {
  const result = normalizePublication(inputs);
  function parsed(v) { try { return typeof v === "string" && v.trim() ? JSON.parse(v) : null; } catch (_) { return null; } }
  function missing(v) {
    if (Array.isArray(v)) return v.filter(x => typeof x === "string" && x.trim());
    const p = parsed(v);
    return Array.isArray(p) ? missing(p) : [];
  }
  const first = parsed(inputs.r1_candidate);
  const second = parsed(inputs.r2_candidate);
  const feedback = parsed(result.validation_feedback);
  const sourceRound = result.publishable && result.round_count === 2 && result.final_response_json === inputs.r2_candidate ? 2
    : result.publishable && result.final_response_json === inputs.r1_candidate ? 1 : null;
  const diagnostics = [
    { round: 1, candidate_status: first?.generation_status || "not_available", missing_information: [...missing(first?.missing_information), ...missing(inputs.r1_missing)] },
    { round: 2, candidate_status: second?.generation_status || "not_available", missing_information: [...missing(second?.missing_information), ...missing(inputs.r2_missing)] }
  ];
  // Improve failure attribution without changing 75-point/R2-release routing or inventing questions.
  if (!result.publishable) {
    const final = parsed(result.final_response_json);
    const reasons = [...new Set(diagnostics.flatMap(d => d.missing_information))];
    if (final && reasons.length) {
      final.missing_information = reasons;
      final.risk_message = "上游尚未形成可输出的完整五题；具体缺口见missing_information，未补造题目。";
      result.final_response_json = JSON.stringify(final);
      result.missing_information = JSON.stringify(reasons);
    }
  }
  const selectedFeedback = sourceRound === 1 ? parsed(inputs.r1_feedback) : sourceRound === 2 ? parsed(inputs.r2_feedback) : null;
  const selectedAudit = selectedFeedback && selectedFeedback.round === sourceRound ? {
    ...selectedFeedback,
    returned_candidate_binding: selectedFeedback.medical_auditable === true && selectedFeedback.patch_merge_decision !== "FAIL",
    scope: "selected_candidate_round"
  } : null;
  const selectedRecords = sourceRound === 1 ? parsed(inputs.r1_cited_evidence) : sourceRound === 2 ? parsed(inputs.r2_cited_evidence) : null;
  const selectedEvidence = { round: sourceRound, returned_candidate_binding: sourceRound !== null && Array.isArray(selectedRecords),
    records: Array.isArray(selectedRecords) ? selectedRecords : [] };
  const envelope = { record_type: "oncorounds_final", transport_version: "1.0", workflow_revision: "20260904-followup-v2",
    case_id: String(inputs.case_id || ""), case_title: String(inputs.case_title || ""), disease: String(inputs.disease || ""),
    ...result, selected_candidate_round: sourceRound,
    audit_applies_to_selected_candidate: sourceRound !== null && sourceRound === result.round_count &&
      feedback?.medical_auditable === true && feedback?.patch_merge_decision !== "FAIL",
    selected_candidate_audit: selectedAudit, selected_evidence_context: selectedEvidence,
    upstream_diagnostics: diagnostics };
  return { ...result, publication_payload_json: JSON.stringify(envelope) };
}
