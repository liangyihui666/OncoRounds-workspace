function main({ urls, draftData }) {
  const imgUrls = [], docUrls = [], issues = [], manifest = [];
  const seen = new Set();
  for (const raw of Array.isArray(urls) ? urls : []) {
    if (typeof raw !== 'string' || !/^https?:\/\//i.test(raw)) {
      issues.push('存在无效文件链接，请通过文件上传入口重新上传。'); continue;
    }
    if (seen.has(raw)) continue;
    seen.add(raw);
    let path = raw.split(/[?#]/)[0];
    try { path = decodeURIComponent(path); } catch (_) {}
    const ext = (path.match(/\.([a-z0-9]+)$/i) || [,''])[1].toLowerCase();
    const source = 'F' + (manifest.length + 1);
    if (['jpg','jpeg','png','webp','bmp','tif','tiff'].includes(ext)) {
      imgUrls.push(raw); manifest.push({ source, type: 'image', index: imgUrls.length });
    } else if (['pdf','html','htm'].includes(ext)) {
      docUrls.push(raw); manifest.push({ source, type: ext === 'pdf' ? 'pdf' : 'html', index: docUrls.length });
    } else {
      manifest.push({ source, type: 'unsupported', index: 0 });
      issues.push(source + '无法根据链接确认是图片、PDF或HTML；请重新上传带正确扩展名的文件。');
    }
  }
  if (seen.size > 8) issues.push('本次文件超过8个，请减少数量后重试，不会截断处理。');
  const rawHtml = typeof draftData === 'string' ? draftData.trim() : '';
  if (!seen.size && !rawHtml) issues.push('请上传同一病例的图片、PDF或HTML，或填写draftData正文。');
  return { imgUrls, docUrls, rawHtml, manifest: JSON.stringify(manifest), routeIssues: JSON.stringify(issues) };
}
