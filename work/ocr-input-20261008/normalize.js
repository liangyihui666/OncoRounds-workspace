function main({ ocr_text }) {
  let input = ocr_text;
  let inputForm = Array.isArray(input) ? 'text_array' : 'plain_text';
  let warning = '';
  if (typeof input === 'string') {
    const source = input.trim();
    const fenced = source.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i);
    const candidate = fenced ? fenced[1].trim() : source;
    if (candidate.startsWith('[')) {
      try {
        const parsed = JSON.parse(candidate);
        if (Array.isArray(parsed)) { input = parsed; inputForm = 'json_text_array'; }
      } catch (_) {
        // Preserve malformed pasted array text rather than guessing clinical characters.
        warning = '输入看似序列化数组但无法解析，已保留原始文字；清洗时保留不确定的字符，不猜测数值或符号。';
        inputForm = 'unparsed_array_text';
      }
    }
  }
  const pages = [];
  function collect(value) {
    if (Array.isArray(value)) { value.forEach(collect); return; }
    if (typeof value !== 'string') throw new Error('OCR_INPUT_TYPE：请传入OCR纯文本或字符串数组，不是文件、对象或图片链接。');
    if (value.trim()) pages.push(value.trim());
  }
  collect(input);
  if (!pages.length) throw new Error('OCR_INPUT_EMPTY：未收到有效OCR文字，请把上游OCR文字作为用户问题传入。');
  const body = pages.join('\n\n');
  if (/^https?:\/\/\S+$/i.test(body)) throw new Error('OCR_INPUT_URL_ONLY：这里只接收已识别文字，不能用文件或图片URL代替OCR结果。');
  return { text: '【输入来源】上游OCR识别文字，可能含页眉、水印、断行、表格串列及字符误识别。\n' +
    (warning ? '【输入提示】' + warning + '\n' : '') + '\n' + body };
}
