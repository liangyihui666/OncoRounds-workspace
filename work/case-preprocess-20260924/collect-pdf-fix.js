function main({ imgUrls, docText, routeIssues, docUrls, docError, unknownUrls, docRaw }) {
  const issues = [];
  try { issues.push(...JSON.parse(routeIssues || '[]')); } catch (_) { issues.push('文件分流状态无法解析。'); }
  const text = typeof docText === 'string' ? docText : '';
  const inputs = Array.isArray(docUrls) ? docUrls : [];
  const unknown = new Set(Array.isArray(unknownUrls) ? unknownUrls : []);
  const rows = Array.isArray(docRaw) ? docRaw : null;
  const images = Array.isArray(imgUrls) ? [...imgUrls] : [];
  const labels = images.map((_, i) => '上传图片' + (i + 1));
  if (docError) issues.push('文档解析节点报错，请检查运行记录后重试。');
  if (inputs.length) {
    // Require the parser's actual per-file response; never infer image type from empty text alone.
    if (!rows || rows.some(r => !r || typeof r.url !== 'string' || typeof r.text !== 'string')) {
      issues.push('文档解析未返回可按文件链接核对的原始响应，请提供该节点原始响应检查平台版本。');
    } else {
      const rowMap = new Map(rows.map(r => [r.url, r]));
      const missing = inputs.filter(u => !rowMap.has(u));
      const foreign = rows.filter(r => !inputs.includes(r.url));
      if (foreign.length || (missing.length && text.trim() && !rows.length)) {
        issues.push('文档原始响应的链接与上传链接无法对应，已停止自动图片分流。');
      } else {
        for (let i = 0; i < inputs.length; i++) {
          const u = inputs[i], row = rowMap.get(u);
          if (row) {
            if (row.error || !row.text.trim()) issues.push('文件' + (i+1) + '文档解析失败或为空；扫描PDF请检查增强解析服务。');
            continue;
          }
          if (unknown.has(u) && !docError) {
            // FastGPT document parsing excludes registered image uploads. Read omitted short links with OCR.
            if (!images.includes(u)) {images.push(u);labels.push('平台上传图片' + (i+1));}
          } else issues.push('文件' + (i+1) + '未出现在文档解析结果中，请检查完整运行记录。');
        }
        if (rows.some(r => r.text.trim()) && !text.trim()) issues.push('文档正文输出为空，无法继续提取。');
      }
    }
  }
  // Remove executable/non-content blocks before inspecting inline image references.
  // PDF embedded images belong to the PDF parser/enhanced parser, not the HTML OCR queue.
  // Keep all returned document text, but only expand inline images for confirmed HTML documents.
  const htmlTexts = [];
  for (const row of rows || []) {
    if (!row || typeof row.text !== 'string' || row.error) continue;
    let filename = row.filename || row.name || '';
    try { filename = decodeURIComponent(filename); } catch (_) {}
    let routePath = typeof row.url === 'string' ? row.url.split(/[?#]/)[0] : '';
    try { routePath = decodeURIComponent(routePath); } catch (_) {}
    const filenameParam = typeof row.url === 'string' ? row.url.match(/[?&]filename=([^&#]+)/i) : null;
    if (!filename && filenameParam) { try { filename = decodeURIComponent(filenameParam[1]); } catch (_) {} }
    const knownName = filename || routePath;
    if (/\.html?$/i.test(knownName)) htmlTexts.push(row.text);
    else if (!/\.pdf$/i.test(knownName) && /<img\b|!\[[^\]]*\]\(/i.test(row.text)) {
      issues.push('文档包含内嵌图片，但原始响应缺少可确认PDF/HTML的文件名，请检查文档解析原始响应。');
    }
  }
  const combined = htmlTexts.join('\n').replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
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
      .replace(/<!--[\s\S]*?-->/g, '').replace(/<\/?[a-z][^>]*>/gi, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, '[内嵌图片引用，内容以解析文字为准]')
      .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/(?:姓名|患者姓名|住院号|门诊号|身份证号|联系电话|家庭住址)\s*[:：]\s*[^\s，,；;]+/g, '[身份信息已遮蔽]')
      .replace(/https?:\/\/[^\s<>"']+/g, '[来源链接隐藏]')
      .replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, '\n\n').trim();
  }
  const textBlocks = [];
  if (text.trim()) textBlocks.push({source:'文档解析汇总（逐文件及页码以正文实际标记为准）', text:clean(text)});
  return { ocrUrls: images.length <= 24 ? images : [], imageLabels: JSON.stringify(labels), textBlocks: JSON.stringify(textBlocks), issues: JSON.stringify(issues), expectedImages: images.length <= 24 ? images.length : 0 };
}
