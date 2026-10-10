// Bind only records from this exact returned round and exact doc_id/split_index.
// This is provenance checking, NOT semantic/medical validation.
function bindSelectedEvidence(envelope, root, info, groupId, outputRecords) {
  const sourceRound = envelope.selected_candidate_round;
  const context = envelope.selected_evidence_context;
  const validContext = context && context.round === sourceRound && [1, 2].includes(sourceRound) &&
    Array.isArray(context.records) && context.returned_candidate_binding === true;
  const locator = value => {
    if (!value || typeof value.doc_id !== 'string' || !value.doc_id.trim() ||
        !['string', 'number'].includes(typeof value.split_index) || String(value.split_index).trim() === '') return '';
    return JSON.stringify([value.doc_id.trim(), String(value.split_index).trim()]);
  };
  const records = new Map();
  if (validContext) for (const record of context.records) {
    const key = locator(record);
    if (!key || typeof record.snippet !== 'string' || !record.snippet.trim()) continue;
    const list = records.get(key) || [];
    const identityFields = ['snippet', 'source_title', 'source_version', 'source_section', 'source_url', 'type', 'authority'];
    if (!list.some(r => identityFields.every(k => r[k] === record[k]))) list.push(record);
    records.set(key, list);
  }
  info.evidence_context_status = validContext ? 'provided' : 'not_provided';
  info.workflow_revision = envelope.workflow_revision || null;
  const selectedAudit = envelope.selected_candidate_audit;
  if (selectedAudit && selectedAudit.round === sourceRound && [1, 2].includes(sourceRound) &&
      selectedAudit.returned_candidate_binding === true && selectedAudit.medical_auditable === true &&
      selectedAudit.patch_merge_decision !== 'FAIL') {
    info.run_audit = info.audit;
    info.audit = { ...selectedAudit, availability: 'provided', scope: 'selected_candidate_round' };
  }
  const registered = new Map();
  return function attach(item) {
    const matching = records.get(locator(item.question.guidelineRef)) || [];
    item.evidence_status = !validContext ? 'not_provided' : matching.length === 0 ? 'not_found' : matching.length > 1 ? 'ambiguous' : 'located';
    item.evidence_key = null;
    if (matching.length === 1) {
      const record = matching[0], key = locator(record);
      if (!registered.has(key)) {
        const evidenceKey = groupId + '_E' + (registered.size + 1);
        registered.set(key, evidenceKey);
        outputRecords.push({ ...record, evidence_key: evidenceKey, group_id: groupId, source_round: sourceRound });
      }
      item.evidence_key = registered.get(key);
    } else item.warnings.push('原始证据片段未能唯一定位（' + item.evidence_status + '），不能以证据摘要代替原文审核。');
    const checks = info.audit?.returned_candidate_binding === true && Array.isArray(info.audit.question_checks)
      ? info.audit.question_checks.filter(c => c.id === item.source_question_id) : [];
    item.source_question_audit = checks.length === 1 ? checks[0] : null;
  };
}
