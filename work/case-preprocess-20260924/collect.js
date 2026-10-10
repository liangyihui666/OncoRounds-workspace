function main({ imgUrls, docText, rawHtml, routeIssues, docUrls, docError }) {
  const issues = [];
  try { issues.push(...JSON.parse(routeIssues || '[]')); } catch (_) { issues.push('文件分流状态无法解析。'); }
  const text = typeof docText === 'string' ? docText : '';
  const html = typeof rawHtml === 'string' ? rawHtml : '';
  if (Array.isArray(docUrls) && docUrls.length && !text.trim()) issues.push('文档未提取出文字；扫描PDF请检查PDF增强解析服务，或将页面作为图片上传。');
  if (docError) issues.push('文档解析节点报错，请检查运行记录后重试。');
  const images = Array.isArray(imgUrls) ? [...imgUrls] : [];
  const labels = images.map((_, i) => '上传图片' + (i + 1));
  // Remove executable/non-content blocks before inspecting inline image references.
  const combined = (text + '\n' + html).replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  let unresolved = 0;
  const candidates = [];
  for (const m of combined.matchAll(/<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)) candidates.push(m[1]);
  for (const m of combined.matchAll(/!\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^)]*)?\s*\)/g)) candidates.push(m[1] || m[2]);
  for (let u of candidates) {
    u = u.replace(/&amp;/g, '&');
    if (!/^https?:\/\//i.test(u)) { unresolved++; continue; }
    if (!images.includes(u)) { images.push(u); labels.push('文档内嵌图片' + (labels.filter(x => x.startsWith('文档')).length + 1)); }
  }
  if (unresolved) issues.push('有' + unresolved + '个内嵌图片引用不是绝对HTTP链接，未识别；请将相关报告图片单独上传。');
  if (images.length > 24) issues.push('图片总数超过24，已停止OCR以免部分识别；请拆分无关资料或删除装饰图片后重试。');
  // Conservative identity-label masking. Full de-identification remains model + human review.
  function clean(s) {
    return s.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<\/?(?:p|div|br|tr|li|h[1-6])\b[^>]*>/gi, '\n')
      .replace(/<!--[\s\S]*?-->/g, '').replace(/<\/?[a-z][^>]*>/gi, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, '[图片另行OCR]')
      .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/(?:姓名|患者姓名|住院号|门诊号|身份证号|联系电话|家庭住址)\s*[:：]\s*[^\s，,；;]+/g, '[身份信息已遮蔽]')
      .replace(/https?:\/\/[^\s<>"']+/g, '[来源链接隐藏]')
      .replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, '\n\n').trim();
  }
  const textBlocks = [];
  if (text.trim()) textBlocks.push({source:'文档解析汇总（逐文件及页码以正文实际标记为准）', text:clean(text)});
  if (html.trim()) textBlocks.push({source:'draftData正文', text:clean(html)});
  return { ocrUrls: images.length <= 24 ? images : [], imageLabels: JSON.stringify(labels), textBlocks: JSON.stringify(textBlocks), issues: JSON.stringify(issues), expectedImages: images.length };
}
