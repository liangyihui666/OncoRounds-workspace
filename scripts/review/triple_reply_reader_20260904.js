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
