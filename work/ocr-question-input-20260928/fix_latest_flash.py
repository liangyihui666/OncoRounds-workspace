import copy,json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
src=Path('C:/Users/admin/.codex/attachments/bbe61af5-2b0e-49e9-9591-a21028394c72/已粘贴的文本.txt')
original=json.loads(src.read_text(encoding='utf-8-sig'));d=copy.deepcopy(original)
n=next(n for n in d['nodes'] if n['nodeId']=='v12CasePacket')
c=next(i for i in n['inputs'] if i['key']=='code')
old=c['value'];offset=old.index('  const fields = ')
head='''function main({ case_json }) {
  const instruction='请将外层“题目生成→用户问题”引用为“代码运行→14字段病例JSON”。';
  function decode(value){
    for(let i=0;i<3&&typeof value==='string';i++){
      const text=value.trim().replace(/^```(?:json)?\\s*/i,'').replace(/\\s*```$/,'');
      if(!text) throw new Error('病例JSON输入为空。'+instruction);
      try{value=JSON.parse(text);}catch(_){throw new Error('病例输入不是有效JSON。'+instruction);}
    }
    return value;
  }
  let source=decode(case_json);
  if(source&&typeof source==='object'&&!Array.isArray(source)&&Object.prototype.hasOwnProperty.call(source,'production_variables')){
    source=decode(source.production_variables);
  }
  if(!source||typeof source!=='object'||Array.isArray(source)){
    const type=Array.isArray(source)?'数组':source===null?'null':typeof source;
    throw new Error('需要单个病例JSON对象，当前收到'+type+'。不接受原始识别文本数组。'+instruction);
  }
'''
c['value']=head+old[offset:]
c['value']=c['value'].replace('请检查 OCR 输出','请检查病例字段输入').replace('OCR 病例字段缺失','病例字段缺失').replace('接收 OCR 病例字段','接收已整理的病例字段')
inp=next(i for i in n['inputs'] if i['key']=='ocr_result')
inp.update(key='case_json',label='14字段病例JSON',canEdit=True)
n['intro']='只接收已经整理的病例JSON，检查字段和类型；不进行文件识别或再次病例提取。'
welcome='本应用接收完整14字段病例JSON。由外层应用通过“用户问题”传入，或直接粘贴JSON测试；不上传文件，不传原始识别文本数组。'
d['chatConfig']['welcomeText']=welcome;d['chatConfig'].setdefault('welcomeConfig',{})['welcomeText']=welcome
d['name']='高年资出题-Flash-病例JSON入口修复版'
out=root/'outputs/Flash病例入口修复-20260928';out.mkdir(parents=True,exist_ok=True)
(out/'高年资出题-Flash-病例JSON入口修复版.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'病例JSON入口.js').write_text(c['value'],encoding='utf-8')
for a,b in zip(original['nodes'],d['nodes']):
 if a['nodeId']!='v12CasePacket':assert a==b
assert original['edges']==d['edges']
models={n['name']:next((i.get('value') for i in n['inputs'] if i['key']=='model'),None) for n in d['nodes'] if n['flowNodeType']=='chatNode'}
(out/'修改说明.md').write_text('''以本轮上传文件为唯一基准。仅修改病例JSON入口代码、输入名和欢迎文案；其余节点（含模型参数、提示词、检索与审核逻辑）及连线逐项保持不变。

支持直接病例对象、标准JSON字符串、JSON代码块、重复JSON序列化及明确的production_variables包装。拒绝原始识别文本数组、空输入和缺少必要字段的数据。保留图片字段须为空数组的原约定，不静默丢弃异常输入。

外层使用之前配套的02-HTML测试外层-配套调用版.json，“题目生成”节点选择导入本文件的测试子应用；用户问题必须引用“代码运行→14字段病例JSON”。修复入口不能替代外层正确映射。

首轮出题、首轮审核、二轮修订、二轮审核保留用户配置的qwen3.8-flash。irAE锚点轻量回退仍保留上传文件中的qwen3.5-plus-nothinking。未在线导入或验证模型效果。
''',encoding='utf-8')
print(json.dumps({'path':str(out),'models':models},ensure_ascii=False))
