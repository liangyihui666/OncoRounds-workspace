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
  const envelope = { record_type: "oncorounds_final", transport_version: "1.0", workflow_revision: "20260904-transport-disease",
    case_id: String(inputs.case_id || ""), case_title: String(inputs.case_title || ""), disease: String(inputs.disease || ""),
    ...result, selected_candidate_round: sourceRound,
    audit_applies_to_selected_candidate: sourceRound !== null && sourceRound === result.round_count &&
      feedback?.medical_auditable === true && feedback?.patch_merge_decision !== "FAIL",
    upstream_diagnostics: diagnostics };
  return { ...result, publication_payload_json: JSON.stringify(envelope) };
}
