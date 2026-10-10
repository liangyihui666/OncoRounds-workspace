// Representation conversion only. Keys, values and ordering are not medical inferences.
function normalizeExtractedText(value, field) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const plainValue = v => typeof v === 'string' ? v : JSON.stringify(v);
  if (Array.isArray(value)) {
    return value.map(row => {
      if (typeof row === 'string') return row;
      if (!object(row)) throw new Error('病例字段类型错误：'+field+'；数组元素须为文本或记录对象');
      if (field === 'case_timeline') {
        const known = ['date','event','details'];
        // Convert this explicit layout only. Unknown layouts stay visible as JSON.
        if (known.every(k => Object.prototype.hasOwnProperty.call(row,k)) && known.every(k => typeof row[k] === 'string')) {
          const line = known.map(k => row[k]).join('｜');
          const extra = Object.fromEntries(Object.entries(row).filter(([k]) => !known.includes(k)));
          return line + (Object.keys(extra).length ? '｜附加原字段：'+JSON.stringify(extra) : '');
        }
      }
      return JSON.stringify(row);
    }).join('\n');
  }
  if (object(value)) return Object.entries(value).map(([key,v]) => key+'：'+plainValue(v)).join('\n');
  throw new Error('病例字段类型错误：'+field+'；仅接受文本、文本/记录数组或记录对象');
}
