import copy
import json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
d=json.loads((root/'outputs/高年资医生出题-20260928/题目生成-OCR直连-高年资医生版.json').read_text(encoding='utf-8'))
prep=json.loads((root/'outputs/外部OCR文本衔接-20260928/外部OCR文本-病例字段整理-测试版.json').read_text(encoding='utf-8'))
mapping={'aggregate':'inputOcrTexts','extractCase':'inputCaseExtract','reviewCase':'inputCaseReview','finalize':'inputCaseFields','caseStart':'448745'}
def replace(x):
    if isinstance(x,dict):return {k:replace(v) for k,v in x.items()}
    if isinstance(x,list):return [replace(v) for v in x]
    if isinstance(x,str):
        if x in mapping:return mapping[x]
        for old,new in mapping.items():x=x.replace('{{$'+old+'.','{{$'+new+'.')
    return x
new=[replace(copy.deepcopy(n)) for n in prep['nodes'] if n['nodeId'] in ['aggregate','extractCase','reviewCase','finalize']]
for index,n in enumerate(new):n['position']={'x':-10700+index*550,'y':-2000}
d['nodes'].extend(new)
packet=next(n for n in d['nodes'] if n['nodeId']=='v12CasePacket')
packet['name']='病例字段直传'
next(i for i in packet['inputs'] if i['key']=='ocr_result')['value']=['inputCaseFields','output']
d['edges']=[e for e in d['edges'] if not(e['source']=='448745' and e['target']=='v12CasePacket')]
chain=['448745','inputOcrTexts','inputCaseExtract','inputCaseReview','inputCaseFields','v12CasePacket']
d['edges'] += [{'source':s,'target':t,'sourceHandle':s+'-source-right','targetHandle':t+'-target-left'} for s,t in zip(chain,chain[1:])]
welcome='请传入技术侧OCR接口返回的完整JSON文本数组，如 ["识别正文"]。本流程不执行OCR：整理已有文字后，依据病例和检索证据生成面向高年资肿瘤专科医生的题目。'
d['chatConfig']['welcomeText']=welcome
d['chatConfig'].setdefault('welcomeConfig',{})['welcomeText']=welcome
d['name']='题目生成-接口OCR文本输入-高年资医生版'
d['intro']='技术侧负责文件上传与OCR；本工作流接收文本数组，提取病例事实并检索、出题、审核与修订。'
out=root/'outputs/接口文本出题-20260928'
out.mkdir(parents=True,exist_ok=True)
(out/'题目生成-接口OCR文本输入-高年资医生版.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'技术接入说明.md').write_text('''# 本轮唯一交付：题目生成工作流

技术侧完成文件上传及OCR接口调用，将响应文本数组序列化为标准JSON，作为本应用用户问题userChatInput传入。例如 ["第一段识别文字","第二段识别文字"]。不要传原始图片/PDF，也不要求上游准备14字段。

内部流程：接收文本数组 → 提取病例字段 → 独立核对提取是否忠实 → 字段直传 → 原有证据检索 → 高年资出题 → 独立医学与难度审核 → 最多一次修订 → 返回候选和真实审核状态。

内部文字提取与核对使用qwen3.8-flash；原出题模型配置保持不变。本轮新增两次文字模型调用，可能增加耗时。没有调用OCR、没有HTTP接口地址/密钥配置。无需导入独立OCR或独立字段整理应用。

保留原文缺项、冲突和表格错位，不补造小数点、分期或病程；研究附录不当作患者治疗经历。无法核对原图或保证上游没有漏页。提取层核对技术失败独立报错，不将病例缺项拼成技术失败原因。

最终输出接口不变：output_ready不等于publishable。正式展示使用publishable=true的结果；未通过候选仅用于内部排查。尚未在线调用接口或模型，仅做离线验证。
''',encoding='utf-8')
print(out)
