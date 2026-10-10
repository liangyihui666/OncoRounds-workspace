function main({ ocr_result }) {
  let source = ocr_result;
  if (typeof source === 'string') {
    const text = source.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try { source = JSON.parse(text); }
    catch (_) { throw new Error('请粘贴 OCR 输出的完整病例 JSON，不要粘贴原文件或“开始”。'); }
  }
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('OCR 结果应为一个病例 JSON 对象。');
  }
  const fields = ["case_id", "case_title", "disease", "case_context", "learning_points", "case_mode", "case_timeline", "biomarkers", "decision_points", "adverse_events", "evidence_notes", "case_intro_images", "cancer_type", "second_cancer_type"];
  const packet = {};
  for (const key of fields) {
    const value = source[key];
    if (key === 'case_intro_images') {
      if (value != null && (!Array.isArray(value) || value.length !== 0)) {
        throw new Error('case_intro_images 应为 []；本流程只接收已识别的病例字段。');
      }
      packet[key] = [];
    } else {
      if (value != null && typeof value !== 'string') throw new Error(key + ' 应为字符串，请检查 OCR 输出。');
      packet[key] = value == null ? '' : value;
    }
  }
  const missing = ['case_title','disease','case_context','case_mode','decision_points'].filter(k => !packet[k].trim());
  if (packet.case_mode === '全程管理' && !packet.case_timeline.trim()) missing.push('case_timeline');
  if (missing.length) throw new Error('OCR 病例字段缺失：' + missing.join('、') + '。请核对上游结果，不要补造病例信息。');
  if (!['全程管理','单时间点'].includes(packet.case_mode)) throw new Error('case_mode 应为全程管理或单时间点。');
  const result = {
    case_packet: packet,
    case_packet_json: JSON.stringify(packet),
    case_packet_text: fields.filter(k => typeof packet[k] === 'string' && packet[k]).map(k => '【' + k + '】\n' + packet[k]).join('\n\n'),
    dedupe_report: {policy:'接收 OCR 病例字段，保留原文，不去重、不摘要、不补写', removed_duplicate_count:0}
  };
  for (const key of fields) result[key] = packet[key];
  return result;
}
