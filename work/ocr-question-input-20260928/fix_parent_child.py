import json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
outer=json.loads((root/'outputs/HTML上传出题测试-20260928/HTML上传-正文检查修复版.json').read_text(encoding='utf-8'))
child=json.loads((root/'outputs/高年资医生出题-20260928/题目生成-OCR直连-高年资医生版.json').read_text(encoding='utf-8'))
n=next(n for n in outer['nodes'] if n['nodeId']=='ogy1PAMdD268kXeo')
i=next(i for i in n['inputs'] if i['key']=='code')
assert i['value'].count('function main(')==1
i['value']=i['value'].replace('function main(', 'function buildOriginalCase(' ,1)
adapter='''
function main(args) {
 const result=buildOriginalCase(args);
 const source=result.production_variables;
 if(!source||typeof source!=='object') throw new Error('病例字段整理未返回有效对象。');
 const fields=['case_id','case_title','disease','case_context','learning_points','case_mode','case_timeline','biomarkers','decision_points','adverse_events','evidence_notes','case_intro_images','cancer_type','second_cancer_type'];
 const payload={};
 for(const key of fields){
   if(key==='case_intro_images'){payload[key]=[];continue;}
   if(source[key]!=null&&typeof source[key]!=='string')throw new Error('病例字段类型错误：'+key);
   payload[key]=source[key]??'';
 }
 return {...result,case_payload_json:JSON.stringify(payload)};
}
'''
i['value']+=adapter
n['outputs'].append({'id':'casePayloadJson','key':'case_payload_json','type':'dynamic','valueType':'string','label':'14字段病例JSON','description':'传给题目生成子应用的用户问题，不是OCR数组。'})
app=next(n for n in outer['nodes'] if n['nodeId']=='ddwhzFImUXV1QTsA')
app['inputs']=[i for i in app['inputs'] if i['key'] in ['system_forbid_stream','history','userChatInput']]
q=next(i for i in app['inputs'] if i['key']=='userChatInput')
q.update(value=['ogy1PAMdD268kXeo','casePayloadJson'],selectedType='reference')
if 'reference' not in q['renderTypeList']:q['renderTypeList'].append('reference')
outer['name']='HTML测试-14字段调用修复版'
child['name']='高年资出题-接收14字段JSON'
for n in child['nodes']:
 if n['nodeId']=='v12CasePacket':n['name']='接收14字段病例JSON'
out=root/'outputs/HTML出题接口配套修复-20260928';out.mkdir(parents=True,exist_ok=True)
(out/'01-出题子应用-14字段JSON入口.json').write_text(json.dumps(child,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'02-HTML测试外层-配套调用版.json').write_text(json.dumps(outer,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'字段打包适配.js').write_text(adapter,encoding='utf-8')
(out/'导入说明.md').write_text('''# 两个文件配套使用

1. 将01导入测试用的“题目生成”子应用并保存；它接收14字段JSON，不接收OCR文本数组。
2. 将02导入HTML测试外层应用，确认“题目生成”节点选择上一步的测试子应用。文件保留原绑定ID，并未新建或修改线上应用；如果导入到了新子应用，必须在该节点重新选择。
3. 该节点“用户问题”引用“代码运行 → 14字段病例JSON”，无需逐项传全局变量。
4. 上传原HTML并发送测试。不要把01替换成“接口OCR文本输入”版，两者输入类型不同。

外层提取一次病例字段，子应用直接做检索和高年资出题。保留时间阶段文案规范、两轮独立审核与一次修订。图片字段传空数组。未改模型及检索绑定。仅离线测试，未在线导入或运行。
''',encoding='utf-8')
print(out)
