import copy
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
folder = root / 'outputs/OCR衔接出题-20260928'
source = json.loads((folder / '题目生成-OCR结果直连-测试版.json').read_text(encoding='utf-8'))
result = copy.deepcopy(source)
rule = '''

【学员可见的时间与诊疗阶段】
timepoint与phase用于题干下方的简短定位提示，前端按“timepoint · phase”显示。
timepoint只写病例原文支持的日期或相对时间，例如“2022年12月”“初诊时”“两周期治疗后”。原文日期不详时使用有依据的相对时间，不推算具体年月日，不把整段治疗经过放入此字段。
phase只写当前决策所处的诊疗阶段，例如“复发后新方案启动前”“辅助治疗决策”“疗效复评”。建议6至14字，必要时可略长以保持准确；不重复timepoint，不罗列药物方案，不复述题干，不提前透露答案。
两个字段均不得出现“当前教学复盘”“本题考查”“根据摘要”等内部表述。两者组合应简洁自然，不能重复同一日期、阶段或事件。
示例仅表示写法，不是病例事实：timepoint="2022年12月"，phase="复发后新方案启动前"。仅当当前病例支持这些信息时才可使用。
'''
targets = {'sR35QbYF2xamDQR3', 'x5dghEdUbp0QQg4T', 'v12RevisionGenerator', 'v12ValidatorR2'}
for node in result['nodes']:
    if node['nodeId'] not in targets:
        continue
    prompt = next(i for i in node['inputs'] if i['key'] == 'systemPrompt')
    prompt['value'] += rule
    if node['nodeId'] in {'x5dghEdUbp0QQg4T','v12ValidatorR2'}:
        prompt['value'] += '审核时核对timepoint和phase的原文依据、重复内容及答案泄露；若不合格，在该题repair_tasks中明确要求修正这两个字段。仅文案问题不得描述成临床事实错误。\n'
    if node['nodeId'] == 'v12RevisionGenerator':
        prompt['value'] += '时间和阶段的修改仍须遵守repair_tasks授权及preserve_ids规则；不要为了统一文风改动未授权的题目。\n'
result['name'] = '题目生成-OCR直连-时间阶段文案修订版'
result['intro'] = '在OCR直连版上统一timepoint与phase展示规则；模型、检索与发布规则保持不变。'
out = folder / '题目生成-OCR直连-时间阶段文案修订版.json'
out.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
assert result['edges'] == source['edges']
assert result['chatConfig'] == source['chatConfig']
changed = []
for old,new in zip(source['nodes'],result['nodes']):
    if old == new:
        continue
    assert new['nodeId'] in targets
    restored = copy.deepcopy(new)
    next(i for i in restored['inputs'] if i['key']=='systemPrompt')['value'] = next(i for i in old['inputs'] if i['key']=='systemPrompt')['value']
    assert restored == old
    changed.append(new['name'])
assert len(changed) == 4
(folder/'时间阶段文案-修改说明.md').write_text('统一timepoint为原文日期或相对时间，phase为简短决策阶段。禁止重复日期、方案和内部提示语。同步首轮生成、首轮审核、二轮修订及二轮审核四处提示词。\n\n已校验JSON、四处修改范围、模型配置及连线不变；未在线运行。此版本不会追溯修改旧题，也未修改线上前端或外层工作流。如果下游重新改写这两个字段，仍需检查下游。\n',encoding='utf-8')
print(json.dumps({'output':str(out),'changed_nodes':changed,'validation':'仅四个节点systemPrompt及工作流名称说明改变；模型、连线及其他配置不变','online_verified':False},ensure_ascii=False))
