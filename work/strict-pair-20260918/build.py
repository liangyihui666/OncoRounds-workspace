import json,re,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
WORK=Path(__file__).parent
OUT=ROOT/'outputs/双工作流-统一限字V5-20260918'
OUT.mkdir(exist_ok=True)
child_source=Path('C:/Users/admin/Downloads/题目生成 (10).json')
parent_source=ROOT/'outputs/最终出题-全页精简V4-20260918/最终出题-全页精简V4-测试版.json'
child=json.loads(child_source.read_text(encoding='utf-8-sig'))
parent=json.loads(parent_source.read_text(encoding='utf-8-sig'))
for name,d in [('child-source',child),('parent-source',parent)]:
 (WORK/(name+'.json')).write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
def inp(d,n,k):return next(i for node in d['nodes'] if node['nodeId']==n for i in node['inputs'] if i['key']==k)
shared=(WORK/'limits.js').read_text(encoding='utf-8')
rule='''

【统一展示长度合同V5】按Unicode字符计数，汉字、字母、数字、标点和空格各计1字。所有实际返回题目：question≤100字（目标50～80）、每个选项≤40字、answer_text与正确选项逐字一致且≤40字、explain≤100字（目标50～80）、keyPoint≤35字、phase≤16字、timepoint≤40字、evidence_summary≤80字；case_summary≤180字，risk_message及每项missing_information≤120字。
这是最终输出上限，不是建议。先用准确短句写清楚，再输出；不用套话凑长度，不增加题数或复制题目。保留必要前提、若/假设、否定、疑似、时间间隔、分期分级、剂量与证据适用边界。时间标签只写日期或阶段，假设条件应留在题干，不得丢失。
四选项保持相近决策层次，压缩选项时同步answer_text；不能只缩短干扰项而把所有条件放在正确项。解析说明决定因素与一个关键误区，keyPoint只写可迁移原则。
字数不符按字段形成明确修订任务，复用现有最多一次修订，不增加循环。不受影响的题目不改。若无法在限字内完整表达，不硬截断、不弱化医学限制、不改来源，记录具体问题；最终代码会暂不输出仍超限的题目。仍输出其余合规题，零题才insufficient。医学审核继续如实报告，不能因为字数达标改写成PASS。
guidelineRef的原始名称、章节、版本和链接由代码按原记录回填，不能为控字数删改来源元数据；80字限制只针对题目生成的evidence_summary。禁止把证据原文“建议/可考虑”升级为无例外的“必须”。
'''
for nid in ['sR35QbYF2xamDQR3','v12RevisionGenerator','x5dghEdUbp0QQg4T','v12ValidatorR2']:
 p=inp(child,nid,'systemPrompt')
 p['value']=p['value'].replace('≤400字','≤180字').replace('question≤160字','question≤100字').replace('每个选项≤60字','每个选项≤40字').replace('explain≤160字','explain≤100字').replace('keyPoint≤70字','keyPoint≤35字')+rule
for nid in ['cmuTcUhJefVm2DC6','v12AssemblyR2']:
 c=inp(child,nid,'code');s=c['value']
 s=s.replace('candidate.case_summary.length > 400','proseSize(candidate.case_summary) > 180').replace('400字','180字')
 s=s.replace('option.length > 60','proseSize(option) > 40').replace('超过60字','超过40字').replace('限制在60字','限制在40字')
 s=s.replace('["question", 160]','["question", 100]').replace('["explain", 160]','["explain", 100]').replace('["keyPoint", 70]','["keyPoint", 35]').replace('["evidence_summary", 80]','["evidence_summary", 80],\n      ["phase", 16],\n      ["timepoint", 40]')
 s=s.replace('question[field].length > limit','proseSize(question[field]) > limit')
 c['value']=shared+'\n'+s
c=inp(child,'v12PatchMerge','code')
c['value']=shared+'\n'+c['value'].replace('previousResult.parsed.case_summary.length <= 400','proseSize(previousResult.parsed.case_summary) <= 180').replace('patch.case_summary.length > 400','proseSize(patch.case_summary) > 180').replace('400字','180字')
c=inp(child,'v12FinalPublicationNormalize','code')
assert 'function main(inputs)' in c['value']
c['value']=shared+'\n'+c['value'].replace('function main(inputs)','function mainBeforeLength(inputs)',1)+'\n'+(WORK/'child-final.js').read_text(encoding='utf-8')
# Parent still accepts older child replies but cannot emit overlong questions on fallback.
c=inp(parent,'jKqMCN8eJKvkngnI','code')
assert 'function main(inputs)' in c['value']
c['value']=shared+'\n'+c['value'].replace('function main(inputs)','function mainBeforeLength(inputs)',1)+'\n'+(WORK/'parent-final.js').read_text(encoding='utf-8')
p=inp(parent,'ltrYX3w0AXTIiF0r','systemPrompt')
p['value']=p['value'].replace('无法安全缩短时不提供该项，代码保留完整事件。','无法安全缩短时不提供该项，代码先按完整分句拆卡；仍超90字时展示简短待精简提示，原文仅存内部运行记录。')
p['value']=p['value'].replace('安全条件不满足时保留原文，禁止硬截断。','安全条件不满足时不提供修改，禁止硬截断；最终代码暂不输出仍超限的题目。')
p['value']+='''

【最终硬限字V5】首页与hero标题≤14字、首页简介≤48字、hero副标题≤40字；摘要患者背景/评估重点≤40字，诊断检查/治疗经过≤50字；病程title≤16字、date由代码固定≤32字、detail≤90字。题干与解析≤100字、keyPoint≤35字，保留受保护的原题条件。不得编辑选项、答案、phase/timepoint和原指南；这些内容由子流程按统一上限生成，不合规由最终代码暂不输出并记录原因。空结果不凑题，提示字段不是病例事实。
'''
child['name']='题目生成-统一限字V5-测试版';child['intro']='以题目生成(10)为底稿，生成、审核、修订、机械检查和最终回退统一限字；保留检索、模型和最多一次修订。'
parent['name']='最终出题-统一限字V5-测试版';parent['intro']='以用户最终出题的V4衍生版为底稿；页面正文及题目最终硬限字，不回退展示超长原文；原引用保留。'
for d in [child,parent]:(OUT/(d['name']+'.json')).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
manifest={'source_sha256':{str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in [child_source,parent_source]},'outputs':[d['name']+'.json' for d in [child,parent]],'online_tested':False}
(WORK/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(OUT)
