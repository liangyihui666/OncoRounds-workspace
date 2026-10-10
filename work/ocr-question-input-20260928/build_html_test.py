import copy,json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
src=Path('C:/Users/admin/.codex/attachments/1ace0ef0-678e-4296-a748-8dcee8ea1cf7/已粘贴的文本.txt')
original=json.loads(src.read_text(encoding='utf-8-sig'));d=copy.deepcopy(original)
nodes={n['nodeId']:n for n in d['nodes']}
start=nodes['448745'];doc=nodes['vyzKQjoc7z0gMCFM'];clean=nodes['glGeIMqOVaSRs5jF']
start['outputs'].append({'id':'userFiles','key':'userFiles','type':'static','valueType':'arrayString','label':'app:workflow.user_file_input','description':'app:workflow.user_file_input_desc'})
next(i for i in doc['inputs'] if i['key']=='fileUrlList')['value']=['448745','userFiles']
doc['catchError']=False
for i in clean['inputs']:
    if i['key']=='userChatInput':i['value']=['htmlTextCheck','text']
    if i['key'] in ['aiChatVision','aiChatExtractFiles']:i['value']=False
template=json.loads((root/'outputs/外部OCR文本衔接-20260928/外部OCR文本-病例字段整理-测试版.json').read_text(encoding='utf-8'))
guard=copy.deepcopy(next(n for n in template['nodes'] if n['nodeId']=='aggregate'))
guard.update(nodeId='htmlTextCheck',name='HTML正文检查',intro='仅验证上传文件数量和解析结果，不补写病例。',position={'x':3870,'y':-510})
guard['inputs']=[i for i in guard['inputs'] if i['key'] in ['system_addInputParam','codeType','code']]
next(i for i in guard['inputs'] if i['key']=='code')['value']='''function main({files,text,rows}) {
 if(!Array.isArray(files)||files.length!==1) throw new Error('请上传一份HTML病例文件后发送。');
 if(typeof text!=='string'||!text.trim()) throw new Error('文档解析没有返回正文，请检查HTML是否包含可提取的病例文字。');
 if(Array.isArray(rows)&&rows.some(r=>r&&r.error)) throw new Error('文档解析返回错误，请检查文档解析节点。');
 return {text:'【输入来源】HTML文件解析文本。仅依据可见正文；内嵌图片未经过OCR，不能推断图内数据。\\n\\n'+text};
}'''
for key,typ,val in [('files','arrayString',['448745','userFiles']),('text','string',[doc['nodeId'],'system_text']),('rows','arrayObject',[doc['nodeId'],'system_rawResponse'])]:
 guard['inputs'].append({'key':key,'label':key,'valueType':typ,'required':key!='rows','selectedType':'reference','renderTypeList':['reference'],'value':val})
guard['outputs']=[o for o in guard['outputs'] if o['key'] in ['system_rawResponse','error','system_addOutputParam']]
guard['outputs'].append({'id':'text','key':'text','type':'dynamic','valueType':'string','label':'HTML正文','description':''})
d['nodes'].append(guard)
d['edges']=[e for e in d['edges'] if not(e['source']=='448745' and e['target']==clean['nodeId'])]
chain=['448745',doc['nodeId'],'htmlTextCheck',clean['nodeId']]
d['edges'] += [{'source':s,'target':t,'sourceHandle':s+'-source-right','targetHandle':t+'-target-left'} for s,t in zip(chain,chain[1:])]
d['chatConfig']['variables']=[]
d['chatConfig']['fileSelectConfig']={'maxFiles':1,'canSelectFile':True,'canSelectImg':False,'customPdfParse':True}
welcome='上传一份含病例正文的HTML文件，输入“开始”并发送即可测试出题。无需填写draftData。HTML内嵌图片不在本测试版识别范围内。'
d['chatConfig']['welcomeText']=welcome;d['chatConfig'].setdefault('welcomeConfig',{})['welcomeText']=welcome
d['name']='HTML上传-出题效果测试版'
d['intro']='基于用户最新外层流程，接通HTML上传与文档解析；保留原题目生成子应用及终稿输出。'
out=root/'outputs/HTML上传出题测试-20260928';out.mkdir(parents=True,exist_ok=True)
(out/'HTML上传-出题效果测试版.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'HTML正文检查.js').write_text(next(i['value'] for i in guard['inputs'] if i['key']=='code'),encoding='utf-8')
(out/'使用说明.md').write_text('''# HTML上传测试

导入HTML上传-出题效果测试版.json到测试应用。上传一份包含病例文字的HTML文件，输入“开始”发送。无需填写draftData。若上传按钮未显示，请检查应用文件上传设置。

流程：上传 → 文档解析 → 正文检查 → 原有正文清洗 → 病例结构化提取 → 字段代码 → 题目生成子应用 → 终稿整理 → 原有JSON输出。

保留题目生成节点原应用绑定6a96a10d67bd869e3352af48（最新版本），没有将其自动替换为之前生成的高年资工作流。测试高年资版前，请确认该节点绑定的是采用高年资提示词、接受病例字段的子应用。不要直接绑定“接口OCR文本输入”版，否则入口不兼容；该版要求原始文本数组，而本外层已经提取病例字段。

本轮仅修复测试入口，不修改子应用、出题模型、病例结构化提示词、最终展示接口。HTML必须含可提取文字；内嵌照片或截图未OCR，不能用此版声称完整识别。字段缺失和患者信息规则仍沿用原流程。

已完成离线连接、输入和差异检查；尚未平台导入或运行模型。原上传文件未覆盖。
''',encoding='utf-8')
assert nodes['ddwhzFImUXV1QTsA']==next(n for n in original['nodes'] if n['nodeId']=='ddwhzFImUXV1QTsA')
assert 'hIxsHt3a' not in json.dumps(d)
print(out)
