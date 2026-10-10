// Shape and literal-presence checks only; medical comparison still needs review.
function afterAnswerErrors(q, packet) {
  const errors = [];
  const object = v => v && typeof v === 'object' && !Array.isArray(v);
  const exact = (v, keys) => object(v) && Object.keys(v).length === keys.length && keys.every(k => Object.prototype.hasOwnProperty.call(v, k));
  const nonempty = v => typeof v === 'string' && v.trim().length > 0;
  const fields = ['case_source_text', 'case_timeline', 'case_context'];
  const a = q && q.after_answer;
  if (!exact(a, ['schema_version', 'actual_management', 'actual_outcome', 'comparison', 'difference_reason']) || a.schema_version !== '1.0') return ['AFTER_ANSWER_SHAPE：缺少完整答后病例对照对象'];
  function fact(v, label) {
    if (!exact(v, ['status', 'field', 'quote']) || !['documented', 'not_reported'].includes(v.status)) {
      errors.push(label + '格式错误'); return;
    }
    if (v.status === 'not_reported') {
      if (v.field !== '' || v.quote !== '') errors.push(label + '未记载时field与quote必须为空');
      return;
    }
    if (!fields.includes(v.field) || !nonempty(v.quote) || v.quote.length > 600) errors.push(label + '须引用病例事实字段的1至600字连续原句');
    if (packet) {
      const body = packet[v.field];
      const normalize = s => String(s || '').replace(/\s+/g, ' ').trim();
      if (!nonempty(body) || !normalize(body).includes(normalize(v.quote))) errors.push(label + '原句未在病例输入中找到');
      // Raw source is authoritative when available; structured summaries cannot override it.
      if (nonempty(packet.case_source_text) && !normalize(packet.case_source_text).includes(normalize(v.quote))) errors.push(label + '原句未在case_source_text中找到，不能用摘要补成病例事实');
    }
  }
  fact(a.actual_management, '原病例实际处理');
  fact(a.actual_outcome, '原病例实际结局');
  const c = a.comparison;
  if (!exact(c, ['status', 'explanation']) || !['consistent', 'different', 'not_comparable', 'unknown'].includes(c.status) || !nonempty(c.explanation) || c.explanation.length > 300) errors.push('答后比较状态或说明无效');
  if (['consistent', 'different'].includes(c && c.status) && (!object(a.actual_management) || a.actual_management.status !== 'documented')) errors.push('没有实际处理记录，不能判断一致或不同');
  if (/^【延伸情境】/.test(q.question || '') && (!object(c) || c.status !== 'not_comparable')) errors.push('假设延伸题不能冒充原病例已发生的处理，comparison须为not_comparable');
  const reason = a.difference_reason;
  fact(reason, '差异原因');
  if (object(c) && object(reason)) {
    if (c.status !== 'different' && reason.status !== 'not_reported') errors.push('非不同状态不能附加实际差异原因');
    if (c.status === 'different' && reason.status === 'not_reported' && !/原文未说明差异原因/.test(c.explanation || '')) errors.push('原文未记载差异原因时，比较说明须明确“原文未说明差异原因”');
  }
  return errors;
}
