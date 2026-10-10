import json,copy,re
from pathlib import Path
work=Path(__file__).resolve().parent
root=work.parents[1]
base=root/'outputs/全链路五题修复-20260928'
out=root/'outputs/五题流程精简-20260928'
out.mkdir(parents=True,exist_ok=True)
child=json.loads((base/'01-出题子应用-全链路五题修复版.json').read_text(encoding='utf-8'))
outer=json.loads((base/'02-HTML测试外层-全链路五题修复版.json').read_text(encoding='utf-8'))
before=copy.deepcopy([child,outer])
def node(d,id):return next(n for n in d['nodes'] if n['nodeId']==id)
def inp(d,id,key):return next(i for i in node(d,id)['inputs'] if i['key']==key)
def repl(s,a,b):
    assert s.count(a)==1,a[:100]
    return s.replace(a,b)
def span(s,a,b,text):
    start=s.index(a);end=s.index(b,start)
    return s[:start]+text+s[end:]

prompt=(work/'generator.txt').read_text(encoding='utf-8')
inp(child,'sR35QbYF2xamDQR3','systemPrompt')['value']=prompt
inp(child,'v12RevisionGenerator','systemPrompt')['value']='第二轮任务：根据completion_plan、首轮原文、程序错误和完整证据修订并补齐5题。保留合格题，修复错误，删除后补位；首轮空或损坏则重建。输出完整JSON，不输出补丁。\n\n'+prompt
inp(outer,'glGeIMqOVaSRs5jF','systemPrompt')['value']=(work/'cleaner.txt').read_text(encoding='utf-8')
old=inp(outer,'t7eXTzfAM2QUzvvK','systemPrompt')['value']
taxonomy=old[old.index('["乳腺叶状肿瘤"'):].strip()
json.loads(taxonomy)
inp(outer,'t7eXTzfAM2QUzvvK','systemPrompt')['value']=(work/'extractor.txt').read_text(encoding='utf-8').replace('__TAXONOMY__',taxonomy)

common='只按本次查询排序，优先适用病种、人群、阶段与直接支持决策的完整正文。排除病例/新闻/解读及仅参考文献；保留关键限制和不同决策，降低实质重复。适用性优先，再选可确认的较新版本；不猜来源或年份。'
reranks={
 'udswa1eViYShgQ58':'初始分期指南：匹配原发、病理及初诊事实，覆盖分期检查、区域/远处病变和可切除性。取样矛盾仅在病例实际涉及才优先，不跨癌种套分期方法。',
 'rfC50X90Ce6cGaIB':'病理与分子检测指南：覆盖检测人群、标志物、方法、时机、取材与结果应用。区分初诊/复发，不能把复发条款外推初诊；降低纯分期、治疗方案与毒性内容。',
 'sB1igq1zFijP0xqL':'治疗指南：覆盖初始方案、结果等待与治疗衔接、局部/全身协调、复评及调整；匹配实际药物、分子、线次与目的。不用基础分期或“必须检测”替代具体方案证据。',
}
for id,p in reranks.items():inp(child,id,'rerankInstruct')['value']=p+common
study='只返回与查询药物、病种、亚型、线次和治疗目的匹配的原始研究记录。同一记录须明确研究身份/注册号、设计、入组人群、干预与比较、相关终点及已公布结果。meeting/journal只是来源标签，不自动代表原始研究。降低综述、述评、报道、研究解读、个案、名称提及及重复记录；不把其他人群结果外推，不补原文缺失的信息。适用性优先，再比较已确认版本。'
for id in ['k2eB90ICRuNwnMYm','wYNikERvoe0rtN03']:inp(child,id,'rerankInstruct')['value']=study
tox='按涉事药物/治疗类别、事件、明示分级和管理阶段排序，优先直接支持处理条件的正式指南。化疗、靶向与ICI毒性不能互相替代；不因同症状召回不适用类别。保留归因不确定性和再治疗限制，未知分级不推断。降低重复，版本明确且适用时选较新；无适用记录就留缺口。'
for id in ['cmjDyjb1ro4mMLZq','tVs35q6nFPGaT2Zu']:inp(child,id,'rerankInstruct')['value']=tox

# Remove the outer AI that only echoed IDs, and the gate that existed solely for it.
removed={'ltrYX3w0AXTIiF0r','singleEditorialGate20260917'}
outer['nodes']=[n for n in outer['nodes'] if n['nodeId'] not in removed]
outer['edges']=[e for e in outer['edges'] if e['source'] not in removed and e['target'] not in removed]
outer['edges'].append(dict(source='bJcPjyWI8hiwuVOS',target='jKqMCN8eJKvkngnI',sourceHandle='bJcPjyWI8hiwuVOS-source-right',targetHandle='jKqMCN8eJKvkngnI-target-left'))
node(outer,'jKqMCN8eJKvkngnI')['inputs']=[i for i in node(outer,'jKqMCN8eJKvkngnI')['inputs'] if i['key']!='agent_reply']
s=inp(outer,'jKqMCN8eJKvkngnI','code')['value']
s=span(s,'function applyEditorialEdits(', 'const TUMOR_DISPLAY_MAP', '')
s=s.replace('function prepareSelection({agent_reply,','function prepareSelection({')
s=span(s,'  const problemCount=', '  const seen=new Map(),unique=[];', '  const ranked=pool.candidates.map((c,i)=>({...c,stable_index:i}));\n')
s=repl(s,'  const byId=new Map(unique.map(c=>[c.candidate_id,c]));\n','')
s=span(s,'  let selected=null;', "  report.selection_status='success';", "  const selected=unique.slice(0,5);\n  report.selection_method='deterministic_original_order';\n  report.editorial={scope:'original_candidate_text_preserved',applied:[],rejected:[]};\n")
s=span(s,'  let seed=2166136261;', '  return {source:', '')
s=s.replace(',report,targets};',',report};').replace('report,targets:[]','report')
s=s.replace('  agent_reply,\n','').replace('prepareSelection({ agent_reply,','prepareSelection({')
s=repl(s,'  if (prepared.stop) return prepared.stop;\n','')
s=span(s,'    const dependentText =', '    prepared.report.selected[index].answer_mapping', '    const target=originalAnswerIndex;\n    const reorderedOptions=sourceOptions;\n')
s=s.replace('order_preserved: orderSensitive','order_preserved: true')
s=s.replace("workflow_revision:'20260928-full-chain-five-outer'","workflow_revision:'20260928-slim-five-outer'")
inp(outer,'jKqMCN8eJKvkngnI','code')['value']=s

# No downstream consumer remains for an editorial prompt or a has-candidates gate.
s=inp(outer,'bJcPjyWI8hiwuVOS','code')['value']
s=span(s,'  const editorialInput =', '\n}', '  return {candidate_pool};')
s=s.replace('workflow_revision: "20260904-followup-v2"','workflow_revision: "20260928-slim-five"')
inp(outer,'bJcPjyWI8hiwuVOS','code')['value']=s
node(outer,'bJcPjyWI8hiwuVOS')['outputs']=[o for o in node(outer,'bJcPjyWI8hiwuVOS')['outputs'] if o['key'] not in ['system_text','has_candidates']]

# Unused three-group generation text and old review-loop variables never enter the 14-field payload.
s=inp(outer,'ogy1PAMdD268kXeo','code')['value']
s=span(s,'  function focus(priority)', '\n}\n\nfunction main(args)', '  return {production_variables,...production_variables};')
s=repl(s,'    question_draft: "",\n','')
s=repl(s,'    review_feedback: "首次生成，无上一轮审核意见",\n','')
inp(outer,'ogy1PAMdD268kXeo','code')['value']=s
obsolete={'learning_points_a','learning_points_b','learning_points_c','question_draft','review_feedback'}
node(outer,'ogy1PAMdD268kXeo')['outputs']=[o for o in node(outer,'ogy1PAMdD268kXeo')['outputs'] if o['key'] not in obsolete]
inp(child,'v12FinalPublicationNormalize','code')['value']=inp(child,'v12FinalPublicationNormalize','code')['value'].replace("workflow_revision:'20260928-full-chain-five'","workflow_revision:'20260928-slim-five'")

after=[child,outer]
def prompt_stats(d):
    return sum(len(i['value']) for n in d['nodes'] for i in n.get('inputs',[]) if i['key'] in ['systemPrompt','rerankInstruct','system_textareaInput'] and isinstance(i.get('value'),str))
stats={'prompt_characters_before':sum(map(prompt_stats,before)),'prompt_characters_after':sum(map(prompt_stats,after)),
       'child_nodes_before':len(before[0]['nodes']),'child_nodes_after':len(child['nodes']),
       'outer_nodes_before':len(before[1]['nodes']),'outer_nodes_after':len(outer['nodes']),
       'removed_outer_nodes':['单组题目终稿优化','是否有题目可整理'],
       'removed_ai_calls_per_nonempty_run':1,'online_verified':False}
stats['prompt_reduction_percent']=round((1-stats['prompt_characters_after']/stats['prompt_characters_before'])*100,1)
for filename,d in [('01-出题子应用-五题精简版.json',child),('02-HTML测试外层-五题精简版.json',outer)]:
    (out/filename).write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'精简统计.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2),encoding='utf-8')
for name,d,id in [('首轮出题',child,'sR35QbYF2xamDQR3'),('第二轮修订',child,'v12RevisionGenerator'),('正文清洗',outer,'glGeIMqOVaSRs5jF'),('病例提取',outer,'t7eXTzfAM2QUzvvK')]:
    (out/(name+'提示词.txt')).write_text(inp(d,id,'systemPrompt')['value'],encoding='utf-8')
print(json.dumps(stats,ensure_ascii=False))
