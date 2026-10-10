import copy
import json
from pathlib import Path

root=Path(__file__).resolve().parents[2]
source=root/'outputs/病例资料预处理-20260924/大查房-病例预处理-Qwen3.8Flash-修订版.json'
d=json.loads(source.read_text(encoding='utf-8-sig'))
nodes={n['nodeId']:n for n in d['nodes']}
start=nodes['caseStart']
start['outputs']=[o for o in start['outputs'] if o['key']=='userChatInput']
start['inputs']=[i for i in start['inputs'] if i['key']=='userChatInput']
a=nodes['aggregate']
a['name']='接收接口识别文本'
a['intro']='接收外部OCR接口返回的字符串数组；不识别文件、不猜测页码、不截断正文。'
a['inputs']=[i for i in a['inputs'] if i['key'] in ['system_addInputParam','codeType','code']]
code='''function main({ocr_texts}) {
  let texts=ocr_texts;
  if(typeof texts==='string') {
    try {texts=JSON.parse(texts.trim().replace(/^```(?:json)?\\s*/i,'').replace(/\\s*```$/,''));}
    catch(_){throw new Error('请传入OCR接口返回的标准JSON字符串数组，例如 ["识别正文"]。');}
  }
  if(!Array.isArray(texts)||!texts.length||texts.some(t=>typeof t!=='string'||!t.trim()))
    throw new Error('OCR结果必须是非空字符串数组；含空项或错误项时请检查接口结果，不要静默丢弃。');
  if(texts.reduce((n,t)=>n+t.length,0)>65000)
    throw new Error('识别正文超过当前65000字符处理上限；请调整容量或拆分处理，未截断资料。');
  const materials=texts.map((text,i)=>({source:'OCR文本块'+(i+1),text}));
  return {sourceText:JSON.stringify({materials}),issues:'[]',ready:'true'};
}'''
next(i for i in a['inputs'] if i['key']=='code')['value']=code
a['inputs'].append({'key':'ocr_texts','label':'接口识别文本数组','valueType':'string','required':True,'selectedType':'reference','renderTypeList':['reference'],'value':['caseStart','userChatInput']})
a['catchError']=False
note='''
【外部OCR文本输入边界】
本轮只收到外部OCR返回的文本块，未看到原图。文本块编号不是页码；不得声称核对过原图，也不得把块内文件页眉当作可靠页码。
只根据可辨认正文提取。页眉页脚、医院口号和重复版式文字不写入病例；删除身份与联系信息。参考文献、组内意见、拟讨论问题和患者实际诊疗经历分别识别，不把参考研究的用药和结局写成该患者经历，不把“优先考虑”写成已实施治疗。
表格列错位、缺失小数点、断裂数值、基因名称或分期字符不清时，不凭常识还原；只保留可确认内容，将影响实际决策的不确定项集中记入data_quality_notes/evidence_notes。原文多处不同的日期和分期并列保留，不自行裁定。
PS等缩写依上下文处理：明确“PS=0~1分”才是所记载体能评分；缩写后为病理描述时保留病理内容，不据此产生评分或认定原作者误标。
缺少ECOG、切缘、器官功能数值、检测方法、完整疗程或随访，不自动等于病例无法提取。仅当与当前真实决策有关时简洁注明缺失，不生成泛化的全套病历缺项清单；不得要求尚未发生的复发或结局。
原文缺失或辨识疑点如已忠实标记，且仍存在可辨认的病例事实，可以输出病例草稿；不能把提取忠实与可出足五道高难度题混为一谈。不能确认的内容不进入确定性事实。
'''
for nid in ['extractCase','reviewCase']:
    n=nodes[nid]
    n['inputs']=[i for i in n['inputs'] if i['key']!='fileUrlList']
    p=next(i for i in n['inputs'] if i['key']=='systemPrompt')
    p['value']+=note
    if nid=='reviewCase':
        p['value']+='\n核对输出仍严格限定为decision与issues；上述data_quality_notes属于candidate，不向核对JSON新增字段。检查提取是否忠实于OCR文本，不对无法访问的原图作真伪结论。已标记的原始文本缺失不构成REVISE理由。\n'
f=nodes['finalize']
ci=next(i for i in f['inputs'] if i['key']=='code')
anchor="  result.review=validReview?{decision:r.decision,issues:r.issues}:{decision:'REVISE',issues:['独立核对未成功或输出格式不完整。']};"
assert anchor in ci['value']
ci['value']=ci['value'].replace(anchor,"""  if (!validReview) {
    result.data_quality_notes=[];
    result.extraction_status='needs_review';
    result.message=reviewError ? '独立核对节点调用失败，请查看该节点错误信息；不能据此判定病例资料不足。' : '独立核对未返回有效JSON（decision与issues），请检查该节点完整输出；不能据此判定病例资料不足。';
    return {output:JSON.stringify(result)};
  }
  result.review={decision:r.decision,issues:r.issues};""")
keep=['caseStart','aggregate','extractCase','reviewCase','finalize','caseOutput']
d['nodes']=[nodes[k] for k in keep]
d['edges']=[{'source':s,'target':t,'sourceHandle':s+'-source-right','targetHandle':t+'-target-left'} for s,t in zip(keep,keep[1:])]
d['chatConfig']['variables']=[]
welcome='请传入你们OCR接口返回的完整文本数组，例如 ["识别正文"]。本流程只整理病例字段，不再识别图片/PDF。输出经文本核对的14字段病例草稿，核对后用于出题。'
d['chatConfig']['welcomeText']=welcome
d['chatConfig'].setdefault('welcomeConfig',{})['welcomeText']=welcome
d['name']='外部OCR文本-病例字段整理'
d['intro']='接收现有OCR接口文本数组，提取出题所需14字段。外部OCR接口调用由上游完成。'
out=root/'outputs/外部OCR文本衔接-20260928'
out.mkdir(parents=True,exist_ok=True)
(out/'外部OCR文本-病例字段整理-测试版.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'文本数组接收.js').write_text(code,encoding='utf-8')
(out/'接入说明.md').write_text('''# 接入方式

已有上传入口 → 你们的OCR接口 → 标准JSON字符串数组 → 本工作流 → 14字段病例草稿 → 核对 → 高年资医生出题工作流。

将接口返回数组JSON序列化后放入本工作流用户问题（userChatInput）。预览时可直接粘贴数组。不要手动把真实换行写进JSON字符串；使用JSON序列化。若接口实际响应为对象，调用方先取对应文本数组。本文件不猜测接口地址、鉴权或响应包装。

无图片/PDF解析、OCR调用、文件类型分流或draftData。两个模型节点沿用qwen3.8-flash，职责为文本字段提取与独立文本核对，不做图片识别。

原文未提供的非必需信息不应拦截整个病例。可疑字符、表格错位保留待核实，不能凭常识补回小数点、日期或分期。附录文献不混入患者治疗经历。来源标记是OCR文本块编号，不声称真实页码。

字段、身份信息检查及独立核对仍保留。独立核对技术失败现在单独报错，不再把所有病例缺项拼成失败原因。只收到文字无法确认是否漏页、是否忠实原图，仍需检查上游识别质量。

当前为本地可导入工作流，未接通私有接口、未自动串联两个应用、未线上试跑。
''',encoding='utf-8')
print(out)
