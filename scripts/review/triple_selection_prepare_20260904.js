function prepareSelection({ agent_reply, candidate_pool, case_id, disease, difficulty }) {
  function object(value) {
    for (let i = 0; i < 4 && typeof value === "string"; i++) {
      let s = value.replace(/^\uFEFF/, "").trim();
      const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
      if (fence) s = fence[1];
      value = JSON.parse(s);
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("不是JSON对象");
    return value;
  }
  let pool;
  try { pool = object(candidate_pool); } catch (_) { throw new Error("候选池不可解析，请检查candidate_pool变量引用。"); }
  if (!Array.isArray(pool.candidates) || !Array.isArray(pool.groups) || pool.candidate_count !== pool.candidates.length) {
    throw new Error("候选池结构或数量不一致。");
  }
  const report = { schema_version: "triple-selection-1.0", selection_status: "pending",
    candidate_count: pool.candidates.length, medical_approval_confirmed: false,
    source_groups: pool.groups, selected: [], warnings: [],
    notice: "本次只完成候选终选与结构检查，不代表独立医学审核通过；用于医学教学前请人工复核。" };
  if (pool.candidates.length < 5) {
    report.selection_status = "insufficient";
    report.warnings.push("实际结构完整候选仅" + pool.candidates.length + "道，不足5道。");
    const final_data = { schema_version: "1.0", case_id: String(case_id || ""), cancer_type: String(disease || ""),
      generation_status: "insufficient", difficulty: String(difficulty || "进阶"), question_count: 0, questions: [],
      missing_information: report.warnings.slice() };
    return { stop: { final_data, final_json: JSON.stringify(final_data, null, 2), case_page_data: {}, case_page_json: "{}",
      selection_report: report, selection_report_json: JSON.stringify(report, null, 2), quality_notice: report.warnings.join("\n") } };
  }
  let selection;
  try { selection = object(agent_reply); } catch (_) { throw new Error("终选回复不是合法JSON；这是终选格式错误，不是医学证据不足。"); }
  if (selection.selection_status !== "success" || !Array.isArray(selection.selected_ids) || selection.selected_ids.length !== 5 || new Set(selection.selected_ids).size !== 5) {
    throw new Error("终选必须返回success和5个不同selected_ids；不得用不足状态或重复ID替代选题。");
  }
  const byId = new Map(pool.candidates.map(c => [c.candidate_id, c]));
  if (byId.size !== pool.candidates.length) throw new Error("候选池存在重复candidate_id。");
  const selected = selection.selected_ids.map(id => {
    if (typeof id !== "string" || !byId.has(id)) throw new Error("终选引用不存在的candidate_id：" + String(id));
    return byId.get(id);
  });
  report.selection_status = "success";
  report.selection_notes = Array.isArray(selection.selection_notes) ? selection.selection_notes.filter(v => typeof v === "string") : [];
  report.model_risk_message = typeof selection.risk_message === "string" ? selection.risk_message : "";
  report.selected = selected.map((c, i) => ({ final_id: "Q" + (i + 1), candidate_id: c.candidate_id,
    group_id: c.group_id, source_question_id: c.source_question_id, exact_duplicate_of: c.exact_duplicate_of || null }));
  const selectedGroups = new Set(selected.map(c => c.group_id));
  for (const g of pool.groups.filter(g => selectedGroups.has(g.group_id))) {
    if (!g.audit || g.audit.availability !== "provided") report.warnings.push(g.group_id + "未提供独立审核信息，不能推断为医学PASS。");
    else {
      report.warnings.push(g.group_id + "报告审核" + (g.audit.decision || "未知") + "，分数" + (g.audit.score == null ? "未提供" : g.audit.score) + "；该审核尚未与返回题逐题绑定。");
      if (g.audit.patch_merge_decision === "FAIL") report.warnings.push(g.group_id + "修订合并失败，需核对是否回退旧题；不能把本轮0分解释为入选题医学评分。");
    }
  }
  for (const c of selected) if (c.exact_duplicate_of) report.warnings.push(c.candidate_id + "与" + c.exact_duplicate_of + "完全重复，已保留原题并提示复核。");
  // 以病例与入选ID播种，同一输入可复现；不同病例不固定为ABCDA。
  const seedText = String(case_id || "") + "|" + selected.map(c => c.candidate_id + ":" + c.question.question).join("|");
  let seed = 2166136261;
  for (let i = 0; i < seedText.length; i++) seed = Math.imul(seed ^ seedText.charCodeAt(i), 16777619) >>> 0;
  const targets = [0, 1, 2, 3, seed % 4];
  for (let i = targets.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [targets[i], targets[j]] = [targets[j], targets[i]];
  }
  return { source: { generation_status: "success", questions: selected.map((c, i) => ({ ...c.question, id: "Q" + (i + 1) })), missing_information: [] },
    report, targets };
}
