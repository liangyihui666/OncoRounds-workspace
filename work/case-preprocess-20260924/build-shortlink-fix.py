import json
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
OUT=ROOT/'outputs/病例资料预处理-20260924'
w=json.loads((OUT/'大查房-病例预处理-仅上传文件-测试版.json').read_text(encoding='utf-8'))
n=next(n for n in w['nodes'] if n['nodeId']=='routeFiles')
next(i for i in n['inputs'] if i['key']=='code')['value']=(HERE/'route-shortlinks.js').read_text(encoding='utf-8')
n['outputs'].append({'id':'unknownUrls','key':'unknownUrls','type':'dynamic','valueType':'arrayString','label':'平台短链接'})
n=next(n for n in w['nodes'] if n['nodeId']=='collectFiles')
for key,typ,ref in [('unknownUrls','arrayString',['routeFiles','unknownUrls']),('docRaw','arrayObject',['parseDocs','system_rawResponse'])]:
    sample=dict(next(i for i in n['inputs'] if i['key']=='docUrls'))
    sample.update(key=key,label=key,valueType=typ,value=ref,required=False)
    n['inputs'].append(sample)
inp=next(i for i in n['inputs'] if i['key']=='code')
code=inp['value'].replace('routeIssues, docUrls, docError','routeIssues, docUrls, docError, unknownUrls, docRaw')
old="""  if (Array.isArray(docUrls) && docUrls.length && !text.trim()) issues.push('文档未提取出文字；扫描PDF请检查PDF增强解析服务，或将页面作为图片上传。');
  if (docError) issues.push('文档解析节点报错，请检查运行记录后重试。');
  const images = Array.isArray(imgUrls) ? [...imgUrls] : [];
  const labels = images.map((_, i) => '上传图片' + (i + 1));"""
new="""  const inputs = Array.isArray(docUrls) ? docUrls : [];
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
  }"""
assert old in code
code=code.replace(old,new)
inp['value']=code
(HERE/'collect-shortlinks.js').write_text(code,encoding='utf-8')
w['name']='大查房-病例预处理-仅上传文件-短链接修复版'
w['intro']='兼容平台上传短链接：先由平台解析文档，图片经OCR处理；无需draftData，输出出题所需字段。'
(OUT/'大查房-病例预处理-仅上传文件-短链接修复版.json').write_text(json.dumps(w,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
