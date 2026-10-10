function main({ texts, imageLabels, textBlocks, issues, expectedImages, ocrError }) {
  const parse = (v, fallback) => { try { return JSON.parse(v); } catch (_) { return fallback; } };
  const problems = parse(issues || '[]', ['预处理状态损坏。']);
  const blocks = parse(textBlocks || '[]', []);
  const labels = parse(imageLabels || '[]', []);
  const arr = Array.isArray(texts) ? texts : [];
  if (ocrError) problems.push('图片OCR节点报错，请检查运行记录后重试。');
  if (expectedImages > 0 && arr.length !== expectedImages) problems.push('OCR返回条数与图片数不一致，不能确认资料完整。');
  arr.forEach((t, i) => {
    if (typeof t !== 'string' || !t.trim()) { problems.push('图片' + (i+1) + '未识别出文字。'); return; }
    const masked = t.replace(/(?:姓名|患者姓名|住院号|门诊号|身份证号|联系电话|家庭住址)\s*[:：]\s*[^\s，,；;]+/g, '[身份信息已遮蔽]')
      .replace(/https?:\/\/[^\s<>"']+/g, '[来源链接隐藏]');
    blocks.push({source:labels[i] || 'OCR图片' + (i+1),text:masked});
  });
  const sourceText = JSON.stringify({materials:blocks});
  if (!blocks.some(b => b.text && b.text.trim())) problems.push('没有可用病例正文。');
  if (sourceText.length > 65000) problems.push('正文超过65000字符，未截断；请减少无关内容后重新提交。');
  return { sourceText, issues:JSON.stringify([...new Set(problems)]), ready: problems.length === 0 ? 'true' : 'false' };
}
