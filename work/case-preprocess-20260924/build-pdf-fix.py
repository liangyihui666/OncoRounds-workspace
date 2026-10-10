import json
from pathlib import Path

HERE=Path(__file__).resolve().parent
OUT=HERE.parents[1]/'outputs/病例资料预处理-20260924'
w=json.loads((OUT/'大查房-病例预处理-仅上传文件-短链接修复版.json').read_text(encoding='utf-8'))
n=next(n for n in w['nodes'] if n['nodeId']=='collectFiles')
i=next(i for i in n['inputs'] if i['key']=='code')
old="  const combined = text.replace(/<(script|style|noscript)\\b[^>]*>[\\s\\S]*?<\\/\\1>/gi, '');"
new=r'''  // PDF embedded images belong to the PDF parser/enhanced parser, not the HTML OCR queue.
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
  const combined = htmlTexts.join('\n').replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, '');'''
assert old in i['value']
i['value']=i['value'].replace(old,new)
i['value']=i['value'].replace("'[图片另行OCR]'", "'[内嵌图片引用，内容以解析文字为准]'")
i['value']=i['value'].replace('expectedImages: images.length','expectedImages: images.length <= 24 ? images.length : 0')
(HERE/'collect-pdf-fix.js').write_text(i['value'],encoding='utf-8')
n=next(n for n in w['nodes'] if n['nodeId']=='finalize')
i=next(i for i in n['inputs'] if i['key']=='code')
old="throw new Error(internal.message || '病例资料提取未通过核对，请查看节点运行记录。');"
new="""const details = (internal.data_quality_notes || []).concat((internal.review || {}).issues || []);
    throw new Error([internal.message || '病例资料提取未通过核对。', ...details].filter(Boolean).join('；'));"""
assert old in i['value']
i['value']=i['value'].replace(old,new)
n=next(n for n in w['nodes'] if n['nodeId']=='extractCase')
i=next(i for i in n['inputs'] if i['key']=='systemPrompt')
i['value']+='\nPDF内嵌图片未单独再次OCR，仅使用平台文档解析实际返回的文字。图片引用占位不能当作已读到报告内容；若关键病理/检测仅提到见图而正文未给结果，应在data_quality_notes说明缺失，不补造。'
w['name']='大查房-病例预处理-仅上传文件-PDF图片修复版'
(OUT/'大查房-病例预处理-仅上传文件-PDF图片修复版.json').write_text(json.dumps(w,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
