import copy,json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
base=root/'outputs/延伸情境与逐项解析-20260928'
child=json.loads((base/'01-出题子应用.json').read_text(encoding='utf-8'))
outer=json.loads((base/'02-HTML测试外层.json').read_text(encoding='utf-8'))
before=copy.deepcopy(child)
ranking='''
【数据库版本选择】
在已召回记录中，先保证病种、人群、阶段、决策与证据质量适用，再优先同一指南/共识的较新可确认版本。年份以记录明确的发布/版本信息为准，不把入库或更新时间当作指南发布年，不猜测缺失年份。不以更新但不适用的记录替代适用证据，也不把较新的探索性研究自动当标准治疗。
历史病例年份不限制只检索当年的方案；本次为依据数据库现有适用证据的教学讨论。只可称“当前检索结果中较新的适用版本”，不得据一次召回声称数据库或全球所有最新证据已穷尽。数据库未返回旧版正文时，不推断旧指南条款。
'''
teaching='''

【历史病例与当前数据库证据】
默认任务：以患者在题目所标历史时间点已知的事实为背景，依据本轮数据库返回的适用证据讨论当前决策。病例实际治疗和结局保留原样，不用新证据重写历史，也不把后来发生的检查、疗效或不良反应提前用于当时决策。
优先选用已返回、适用范围匹配且版本较新的证据。不得把“记录年份较新”当作适用性，不能把单次召回或模型记忆等同于数据库最新全量；来源年份缺失留空，不宣称“最新指南”。面向学员以实际来源名和版本年份说明依据，例如“依据本次检索到的××指南（2024版）”，不输出GB编号。未找到足够适用依据时保留具体局限，不用旧文献冒充最新推荐。
对历史病例题，在question中用简短措辞明确“依据本次检索证据，若在当前诊疗条件下……”或“按当前诊疗视角……”。timepoint继续只记录病例真实时点，phase保持简短阶段，不把整句提示塞入时间栏。不把2024版证据说成2020年当时的治疗依据。
仅切换当前证据视角、没有增加患者事实，不计为延伸情境题；新增未载明检测结果、患者状态或后续事件时，仍须标注【延伸情境】并计入最多2题限额。
explain仍严格保持A/B/C/D四行、上限800字。有明确今昔差异时，在正确项原因中简洁说明“病例当时实际采用什么；本次证据支持什么；差异依据是什么”。比较仅涉及题目时点已知的原实际方案，不能把后来的真实结局引入解释。没有差异或不能确认时不强行比较。
未获得旧版指南正文时，只比较“病例当年实际方案”与“本次证据支持的方案”，不得断言当年指南规定、旧方案错误或当年医生失误。同一题引用仍绑定真实记录，历史实际方案来自病例，不伪造另一条旧版证据；不足以判断变化原因时明确无法确认。
独立审核必须核对：证据版本有无来源、是否把入库年当发布年、适用人群是否匹配、是否用当前观点指责历史行为、是否把旧实际治疗误称旧指南、是否偷用后续事实。缺少这些依据时应修订相关题干/解析/来源说明，不因使用新版记录就自动PASS。
'''
counts={'ranking':0,'prompts':0}
for n in child['nodes']:
 if n['flowNodeType']=='tool':
  for i in n.get('inputs',[]):
   if i['key']=='rerankInstruct' and isinstance(i.get('value'),str):i['value']+=ranking;counts['ranking']+=1
 if n['nodeId'] in ['sR35QbYF2xamDQR3','x5dghEdUbp0QQg4T','v12RevisionGenerator','v12ValidatorR2']:
  next(i for i in n['inputs'] if i['key']=='systemPrompt')['value']+=teaching;counts['prompts']+=1
child['name']='高年资出题-Flash-当前数据库证据与历史对比版'
out=root/'outputs/当前证据与历史对比-20260928';out.mkdir(parents=True,exist_ok=True)
(out/'01-出题子应用-当前证据与历史对比.json').write_text(json.dumps(child,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'02-HTML测试外层-配套版.json').write_text(json.dumps(outer,ensure_ascii=False,indent=2),encoding='utf-8')
assert counts=={'ranking':7,'prompts':4}
assert child['edges']==before['edges']
for a,b in zip(before['nodes'],child['nodes']):
 b=copy.deepcopy(b)
 for i in b.get('inputs',[]):
  if i['key'] in ['rerankInstruct','systemPrompt']:
   orig=next(x for x in a['inputs'] if x['key']==i['key']);i['value']=orig.get('value')
 assert a==b
(out/'离线检查报告.json').write_text(json.dumps({'updated':counts,'models_code_edges_unchanged':True,'outer_unchanged':True,'online_verified':False},ensure_ascii=False,indent=2),encoding='utf-8')
(out/'说明.md').write_text('''# 当前数据库证据与历史病例对比

本次仅更新01出题子应用，02外层与上一版一致，为配套留存。保留Flash配置、14字段入口、五题优先、最多2道延伸题、四选项解析与原选项顺序。

7处检索重排优先同一适用范围内较新的可确认版本；4处生成/审核/修订提示同步当前诊疗视角和历史对比规则。不改变查询、检索服务、过滤器或时间参数，因此不能保证数据库最新记录一定召回。只能据实际返回版本表述，不声称全球最新。

真实时间线不改写；当前视角不允许偷用后续事实。四行解析内必要时比较历史实际方案与本次证据，未返回旧指南不推断其条款。只切换证据视角不计延伸题，新增假设事实仍计入最多2道。

离线校验通过，未进行在线检索或模型效果验证。导入到当前测试子应用并保存后重试；不更新历史已生成题目。
''',encoding='utf-8')
print(out)
