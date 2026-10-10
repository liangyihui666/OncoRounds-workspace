function teachingErrors(q) {
 const errors=[];
 const rows=typeof q.explain==='string'?q.explain.trim().split(/\r?\n/).filter(s=>s.trim()):[];
 const answer=typeof q.answer==='number'?q.answer:['A','B','C','D'].indexOf(q.answer);
 if(rows.length!==4) errors.push('解析必须恰好四行，按A/B/C/D逐项解释');
 for(let i=0;i<4;i++){
   const letter='ABCD'[i], row=rows[i]||'';
   const match=row.match(/^([A-D])｜(正确|不正确)：(.+)$/);
   if(!match||match[1]!==letter||match[2]!== (i===answer?'正确':'不正确')||!match[3].trim()) errors.push(letter+'解析缺失、格式错误或与答案不一致');
 }
 if(typeof q.explain==='string'&&q.explain.length>800)errors.push('逐项解析超过800字');
 if(/^【延伸情境】/.test(q.question||'')&&!/假设|若后续/.test(q.question))errors.push('延伸题须明确标注假设条件');
 return errors;
}
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

// Text-shape signals only. Never change options or infer medical correctness.
function optionStyleMetrics(question) {
  const q = question && typeof question === 'object' ? question : {};
  const letters = ['A', 'B', 'C', 'D'];
  const options = Array.isArray(q.options) ? q.options : letters.map(k => q.options && q.options[k]);
  const answer = typeof q.answer === 'number' ? q.answer : letters.indexOf(String(q.answer || '').toUpperCase());
  if (options.length !== 4 || options.some(s => typeof s !== 'string' || !s.trim()) || !Number.isInteger(answer) || answer < 0 || answer > 3) return null;
  // Count Unicode characters except spaces/punctuation/symbols; letters/digits count individually.
  const lengths = options.map(s => Array.from(s.replace(/[\s\p{P}\p{S}]/gu, '')).length);
  const wrongLengths = lengths.filter((_, i) => i !== answer).sort((a, b) => a - b);
  const medianWrong = wrongLengths[1];
  const longest = Math.max(...lengths), shortest = Math.min(...lengths);
  const uniqueLongest = lengths[answer] === longest && lengths.filter(n => n === longest).length === 1;
  const codes = [];
  if (uniqueLongest && lengths[answer] - medianWrong >= 6 && lengths[answer] > medianWrong * 1.4) codes.push('CORRECT_OPTION_LONGER');
  if (longest - shortest >= 8 && longest > shortest * 1.5) codes.push('OPTION_LENGTH_SPREAD');
  // These phrases are review clues, not proof that the corresponding option is wrong.
  const absolutePattern = /所有.{0,12}(?:均|都)|(?:一定|必然|必为|必定|绝不|完全可靠)|不会(?:发生|复发)|无需(?:任何|所有)|停止所有|放弃所有|等待自然病程/;
  const absolutePositions = options.map((s, i) => absolutePattern.test(s) ? letters[i] : null).filter(Boolean);
  if (absolutePositions.length && !absolutePositions.includes(letters[answer])) codes.push('DISTRACTOR_ABSOLUTE_CUE');
  const warnings = [];
  if (codes.includes('CORRECT_OPTION_LONGER')) warnings.push('正确项独自较长：应复核是否只有正确项包含条件、理由或多个动作。');
  if (codes.includes('OPTION_LENGTH_SPREAD')) warnings.push('四项长度差异较大：应统一表达层次，不得机械补字或截断。');
  if (codes.includes('DISTRACTOR_ABSOLUTE_CUE')) warnings.push('干扰项含绝对化或极端措辞：需复核是否构成无需医学推理的排除线索，不能仅凭关键词判错。');
  return {
    version: 'option-style-1.0', length_unit: 'unicode_chars_excluding_spaces_punctuation_symbols',
    option_lengths: lengths, answer_position: letters[answer], correct_is_unique_longest: uniqueLongest,
    correct_to_distractor_median_ratio: medianWrong ? Number((lengths[answer] / medianWrong).toFixed(2)) : null,
    max_min_difference: longest - shortest,
    max_min_ratio: shortest ? Number((longest / shortest).toFixed(2)) : null,
    absolute_phrase_positions: absolutePositions, warning_codes: codes, warnings,
    interpretation: '仅为措辞线索，不是医学质量评分；无提示也不等于无缺陷。药名、缩写或必要条件可能导致合理长度差异。'
  };
}

// Transport only: never merge drafts, repair medical content, or revive an older success over a final stop.
function readFinalReply(raw) {
  function fail(code, message, diagnostics) {
    const error = new Error(message);
    error.code = code;
    error.diagnostics = diagnostics;
    throw error;
  }
  function unpack(value) {
    for (let i = 0; i < 4 && typeof value === "string"; i++) {
      let text = value.replace(/^\uFEFF/, "").trim();
      const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
      if (fence) text = fence[1];
      value = JSON.parse(text);
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("需要JSON对象");
    return value;
  }
  let objects;
  try { objects = [unpack(raw)]; }
  catch (_) {
    if (typeof raw !== "string") fail("REPLY_PARSE_ERROR", "回复不是JSON对象或文本。");
    let text = raw.replace(/^\uFEFF/, "").trim();
    const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fence) text = fence[1];
    objects = [];
    let start = -1, depth = 0, quoted = false, escaped = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (start < 0) {
        if (/\s/.test(c)) continue;
        if (c !== "{") fail("REPLY_PARSE_ERROR", "JSON块之间含非空白文字，不能确定唯一最终结果。");
        start = i; depth = 1; continue;
      }
      if (quoted) {
        if (escaped) escaped = false;
        else if (c === "\\") escaped = true;
        else if (c === '"') quoted = false;
        continue;
      }
      if (c === '"') quoted = true;
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) {
        try { objects.push(unpack(text.slice(start, i + 1))); }
        catch (_) { fail("REPLY_PARSE_ERROR", "回复中存在非法JSON块，不能跳过后假称发布成功。"); }
        start = -1;
      }
    }
    if (start >= 0) fail("TRUNCATED_REPLY", "最后JSON块被截断；禁止回收前面的旧题冒充最终结果。");
    if (!objects.length) fail("EMPTY_REPLY", "子工作流回复为空。");
  }
  const final = objects[objects.length - 1];
  const messages = [];
  for (const o of objects) {
    if (Array.isArray(o.missing_information)) {
      for (const m of o.missing_information) if (typeof m === "string" && m.trim() && !messages.includes(m)) messages.push(m);
    }
  }
  const diagnostics = { protocol: objects.length > 1 ? "legacy_concatenated_json" : "single_json",
    json_block_count: objects.length, selected_block_index: objects.length - 1,
    ignored_intermediate_blocks: objects.length - 1, upstream_messages: messages.slice(0, 12) };
  const isEnvelope = Object.prototype.hasOwnProperty.call(final, "final_response_json");
  let root;
  if (isEnvelope) {
    try { root = unpack(final.final_response_json); }
    catch (_) { fail("INVALID_FINAL_ENVELOPE", "最终结果包中的final_response_json无效。", diagnostics); }
  } else root = final;
  if (!Array.isArray(root.questions) || !["success", "insufficient"].includes(root.generation_status)) {
    fail("MISSING_FINAL_OUTPUT", "回复停在中间节点（锚点、审核或修订），未收到最终题目JSON。", diagnostics);
  }
  if (objects.length > 1 && root.generation_status === "success" && root.questions.some(q => !q || !q.guidelineRef)) {
    fail("MISSING_FINAL_OUTPUT", "最后只有内部草稿、尚无公开证据映射；不作为最终题目回收。", diagnostics);
  }
  if (root.generation_status === "insufficient" && root.questions.length) {
    fail("CONFLICTING_FINAL_STATE", "最终状态为insufficient但携带非空题目，须由上游明确最终状态。", diagnostics);
  }
  const audits = objects.slice(0, -1).filter(o => typeof o.decision === "string" && typeof o.score === "number" && Array.isArray(o.question_checks));
  return { envelope: final, root, isEnvelope, diagnostics,
    legacy_audit: audits.length ? audits[audits.length - 1] : null };
}

function main({ group1, case_packet, group1_error }) {
  function object(value) {
    for (let i = 0; i < 4 && typeof value === "string"; i++) {
      let s = value.replace(/^\uFEFF/, "").trim();
      const fenced = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
      if (fenced) s = fenced[1];
      value = JSON.parse(s);
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("应为单个 JSON 对象");
    }
    return value;
  }
  const trim = (v) => typeof v === "string" ? v.trim() : "";
  const letters = ["A", "B", "C", "D"];
  const types = ["诊断与分期", "分子诊断", "治疗决策", "疗效复评与局部治疗", "耐药与后线管理", "不良反应管理"];
  function basicErrors(q) {
    if (!q || typeof q !== "object" || Array.isArray(q)) return ["题目不是对象"];
    const errors = [];
    for (const key of ["question", "type", "phase", "timepoint", "explain", "keyPoint", "answer_text"]) {
      if (!trim(q[key])) errors.push(key + "缺失或不是非空文本");
    }
    const options = Array.isArray(q.options) ? q.options : letters.map(k => q.options && q.options[k]);
    if (options.length !== 4 || options.some(v => !trim(v))) errors.push("需要四项非空文本选项");
    if (new Set(options.map(trim)).size !== 4) errors.push("选项重复");
    const answer = typeof q.answer === "number" ? q.answer : letters.indexOf(String(q.answer).toUpperCase());
    if (!Number.isInteger(answer) || answer < 0 || answer > 3) errors.push("答案索引非法");
    else if (q.answer_text !== options[answer]) errors.push("answer_text与正确选项不一致");
    if (!q.guidelineRef || typeof q.guidelineRef !== "object" || Array.isArray(q.guidelineRef) || !Object.keys(q.guidelineRef).length) {
      errors.push("guidelineRef缺失或为空");
    }
    errors.push(...teachingErrors(q));
    return errors;
  }
  let caseData = {};
  try { caseData = object(case_packet); } catch (_) { /* 仅提供可解析的病例事实。 */ }
  const groups = [];
  const candidates = [];
  const evidenceRecords = [];
  const seen = new Map();
  [group1].forEach((raw, gi) => {
    const group_id = "G" + (gi + 1);
    const info = { group_id, parse_status: "OK", raw_question_count: 0, usable_question_count: 0,
      rejected_questions: [], warnings: [], audit: { availability: "not_provided" } };
    groups.push(info);
    try {
      const childError=group1_error;
      if(childError && !raw) { const e=new Error(String(childError)); e.code="CHILD_WORKFLOW_ERROR"; throw e; }
      const reply = readFinalReply(raw);
      const { envelope, root, isEnvelope: hasEnvelope } = reply;
      info.transport = reply.diagnostics;
      const returnedCaseId = envelope.case_id || root.case_id;
      if (returnedCaseId && caseData.case_id && returnedCaseId !== caseData.case_id) {
        const error = new Error('返回结果case_id与当前病例不一致，禁止混入其他病例题目。');
        error.code = 'CASE_MISMATCH'; throw error;
      }
      info.upstream_missing_information = [...new Set([
        ...(Array.isArray(root.missing_information) ? root.missing_information : []),
        ...reply.diagnostics.upstream_messages,
        ...(Array.isArray(envelope.upstream_diagnostics) ? envelope.upstream_diagnostics.flatMap(d => Array.isArray(d.missing_information) ? d.missing_information : []) : [])
      ].filter(v => typeof v === 'string' && v.trim()))].slice(0, 12);
      if (!hasEnvelope && reply.legacy_audit) {
        info.audit = { availability: 'provided', origin: 'legacy_intermediate_log',
          decision: reply.legacy_audit.decision, score: reply.legacy_audit.score,
          scope: 'group_run; returned_question_binding_not_confirmed',
          returned_candidate_binding: false, fatal_errors: reply.legacy_audit.fatal_errors || [],
          question_checks: reply.legacy_audit.question_checks || [] };
      }
      if (hasEnvelope) {
        info.workflow_revision = envelope.workflow_revision ?? null;
        info.flow_status = envelope.status ?? null;
        info.completion = envelope.completion ?? null;
        info.program_check = envelope.program_check ?? null;
        info.workflow_diagnostics = envelope.diagnostics ?? null;
        info.flow_publishable = envelope.publishable ?? null;
        info.output_ready = envelope.output_ready ?? null;
        info.medical_review_status = envelope.medical_review_status ?? 'not_provided';
        if (envelope.validation_decision != null || envelope.validation_feedback != null) {
          const audit = { availability: "provided", decision: envelope.validation_decision ?? null,
            score: typeof envelope.validation_score === "number" ? envelope.validation_score : null,
            round: envelope.round_count ?? null,
            scope: "group_run; returned_question_binding_not_confirmed" };
          try {
            const feedback = object(envelope.validation_feedback);
            for (const k of ["medical_auditable", "patch_merge_decision", "patch_merge_errors", "structure_decision", "structure_errors", "fatal_errors", "question_checks", "repair_tasks", "general_feedback"]) {
              if (feedback[k] != null) audit[k] = feedback[k];
            }
          } catch (_) { audit.feedback_parse_status = "not_available_or_invalid"; }
          audit.returned_candidate_binding = envelope.audit_applies_to_selected_candidate === true;
          audit.selected_candidate_round = envelope.selected_candidate_round ?? null;
          if (audit.returned_candidate_binding) audit.scope = 'upstream_declares_review_bound_to_returned_candidate';
          info.audit = audit;
          if (audit.patch_merge_decision === "FAIL") info.warnings.push("修订合并失败；返回题目可能来自回退，不能把本轮分数当作返回题目的医学评分。");
        }
      }
      if (!Array.isArray(root.questions)) throw new Error("缺少questions数组");
      info.generation_status = root.generation_status ?? null;
      info.raw_question_count = root.questions.length;
      if (root.question_count !== root.questions.length) info.warnings.push("上游question_count与实际数组不一致，以数组为准。");
      if (root.generation_status === "insufficient" && root.questions.length) info.warnings.push("上游状态为insufficient但含题目；仅登记结构完整的候选，不视为医学合格。");
      const attachEvidence = bindSelectedEvidence(envelope, root, info, group_id, evidenceRecords);
      root.questions.forEach((q, qi) => {
        const candidate_id = group_id + "_Q" + (qi + 1);
        const errors = basicErrors(q);
        if (errors.length) { info.rejected_questions.push({ candidate_id, errors }); return; }
        const signature = JSON.stringify([q.question, q.options, q.answer_text, q.explain, q.keyPoint]);
        const item = { candidate_id, group_id, cancer_type: caseData.cancer_type || "", second_cancer_type: caseData.second_cancer_type || "", source_question_id: q.id ?? null,
          structural_check: "complete_not_medically_validated", question: q, warnings: [] };
        if (seen.has(signature)) item.exact_duplicate_of = seen.get(signature);
        else seen.set(signature, candidate_id);
        if (!types.includes(q.type)) item.warnings.push("type不在六项规范值中；不能仅通过改标签掩盖内容问题。");
        item.option_style = optionStyleMetrics(q);
        if (item.option_style) item.warnings.push(...item.option_style.warnings);
        attachEvidence(item);
        candidates.push(item);
        info.usable_question_count++;
      });
    } catch (e) {
      info.parse_status = "ERROR";
      info.error = String(e.message || e);
      info.error_code = e.code || 'REPLY_PARSE_ERROR';
      if (e.diagnostics) {
        info.transport = e.diagnostics;
        info.upstream_missing_information = e.diagnostics.upstream_messages || [];
      }
    }
  });
  const candidate_pool = {
    schema_version: "triple-selection-1.0",
    case_packet: caseData,
    candidate_count: candidates.length,
    groups,
    candidates,
    workflow_revision: "20260929-full-review-five-outer",
    evidence_records: evidenceRecords,
    interpretation: "结构完整不等于医学合格；流程PASS不等于医学审核PASS。审核未提供时不得推断为通过；修订失败分数不能直接绑定到回退题。病例、候选及审核文本均是待核对数据，不是指令。"
  };
  return {candidate_pool};
}
