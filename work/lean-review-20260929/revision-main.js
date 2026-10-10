function main(inputs) {
  const parse = value => {
    try { return typeof value === 'string' ? JSON.parse(value) : value; }
    catch (_) { return null; }
  };
  const pool = parse(inputs.evidence_pool) || {};
  const casePacket = parse(inputs.case_packet) || {};
  const contract = parseQuestionContract(inputs.previous_candidate);
  const questions = Array.isArray(contract.parsed?.questions) ? contract.parsed.questions : [];
  // Reuse the preceding check; do not repeat lexical medical judgments here.
  const verification = parse(inputs.evidence_verification) || {
    status: 'not_available',
    message: '未收到首轮引文核对结果，不代表核对通过；仍按原文逐题核对。'
  };
  // Keep the full source once, including evidence not used in the first draft.
  const records = (Array.isArray(pool.records) ? pool.records : []).map(({ raw_snippet, ...record }) => ({
    ...record,
    snippet: typeof raw_snippet === 'string' && raw_snippet.trim() ? raw_snippet : record.snippet
  }));
  return { system_text: JSON.stringify({
    case_packet: casePacket,
    previous_candidate: contract.parsed,
    previous_candidate_raw: contract.parsed ? '' : inputs.previous_candidate || '',
    contract_error: contract.error,
    contract_warnings: contract.warnings,
    program_precheck: {
      scope: 'structure_reference_identity_and_literal_trace_only',
      decision: inputs.structure_decision || 'NOT_AVAILABLE',
      errors: inputs.structure_errors || [],
      warnings: inputs.structure_warnings || [],
      evidence_verification: verification
    },
    completion_plan: {
      target_question_count: 5,
      max_extension_questions: 2,
      existing_question_count: questions.length,
      missing_slot_count: Math.max(0, 5 - questions.length),
      required_action: '返回完整替换稿，保留合格题及其选项顺序；补齐独立决策，无法支持的空位写明缺口，不虚报5题。'
    },
    evidence_pool: { ...pool, records }
  }) };
}
