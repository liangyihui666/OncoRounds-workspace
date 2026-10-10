import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'outputs/病例资料预处理-20260924'
w=json.loads((OUT/'大查房-病例预处理-仅出题字段-测试版.json').read_text(encoding='utf-8'))
w['chatConfig']['variables']=[]
welcome='上传同一病例的图片、PDF或HTML后点击发送，无需填写病例正文。最终只输出出题所需的病例字段JSON。'
w['chatConfig']['welcomeText']=welcome
w['chatConfig']['welcomeConfig']={'welcomeText':welcome}
w['name']='大查房-病例预处理-仅上传文件-测试版'
w['intro']='只接收上传文件，无前置变量表单；图片OCR、PDF及HTML解析，最终输出扁平病例字段JSON。'
for n in w['nodes']:
    if n['nodeId']=='caseStart':
        for i in n['inputs']:
            if i['key']=='userChatInput':i['required']=False
    if n['nodeId']=='routeFiles':
        n['inputs']=[i for i in n['inputs'] if i['key']!='draftData']
        n['outputs']=[o for o in n['outputs'] if o['key']!='rawHtml']
        i=next(i for i in n['inputs'] if i['key']=='code')
        i['value']=i['value'].replace('function main({ urls, draftData })','function main({ urls })')
        i['value']=i['value'].replace("  const rawHtml = typeof draftData === 'string' ? draftData.trim() : '';\n",'')
        i['value']=i['value'].replace("if (!seen.size && !rawHtml) issues.push('请上传同一病例的图片、PDF或HTML，或填写draftData正文。');", "if (!seen.size) issues.push('请上传同一病例的图片、PDF或HTML。');")
        i['value']=i['value'].replace('imgUrls, docUrls, rawHtml, manifest:', 'imgUrls, docUrls, manifest:')
    if n['nodeId']=='collectFiles':
        n['inputs']=[i for i in n['inputs'] if i['key']!='rawHtml']
        i=next(i for i in n['inputs'] if i['key']=='code')
        i['value']=i['value'].replace('imgUrls, docText, rawHtml, routeIssues', 'imgUrls, docText, routeIssues')
        i['value']=i['value'].replace("  const html = typeof rawHtml === 'string' ? rawHtml : '';\n",'')
        i['value']=i['value'].replace("(text + '\\n' + html).replace",'text.replace')
        i['value']=i['value'].replace("  if (html.trim()) textBlocks.push({source:'draftData正文', text:clean(html)});\n",'')
serialized=json.dumps(w,ensure_ascii=False,indent=2)+'\n'
assert 'draftData' not in serialized
assert 'rawHtml' not in serialized
(OUT/'大查房-病例预处理-仅上传文件-测试版.json').write_text(serialized,encoding='utf-8')
