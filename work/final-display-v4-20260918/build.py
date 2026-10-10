import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
WORK=Path(__file__).parent
OUT=ROOT/'outputs/最终出题-全页精简V4-20260918'
OUT.mkdir(exist_ok=True)
source=ROOT/'outputs/最终出题-首页与摘要精简V3-20260918/最终出题-首页与摘要精简V3-测试版.json'
d=json.loads(source.read_text(encoding='utf-8'))
(WORK/'source.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
nodes={n['nodeId']:n for n in d['nodes']}
def inp(n,k):return next(i for i in nodes[n]['inputs'] if i['key']==k)
helper=(WORK/'display.js').read_text(encoding='utf-8')
production=inp('ogy1PAMdD268kXeo','code')
needle='  const production_variables = {'
assert needle in production['value']
production['value']=helper+'\n'+production['value'].replace(needle,'''  for(const key of ['case_context','disease','case_timeline','biomarkers','learning_points_candidate','decision_points_candidate','adverse_events','evidence_notes']) {
    data[key]=normalizeCaseText(data[key]);
  }
'''+needle)
pool=inp('bJcPjyWI8hiwuVOS','code')
pool['value']=helper+'\n'+pool['value'].replace('  const editorialInput = {','  const editorialInput = {\n    timeline_sources:timelineEntries(caseData.case_timeline),')
prompt=inp('ltrYX3w0AXTIiF0r','systemPrompt')
prompt['value']=prompt['value'].replace('"focus":""}}','"focus":""},"timeline_edits":[]}',1)
prompt['value']=prompt['value'].replace('每个修改后的question最多160字、explain最多160字、keyPoint最多70字','题干question以50～80字为目标、最多100字；explain以50～80字为目标、最多100字；keyPoint以15～25字为目标、最多35字')
prompt['value']=prompt['value'].replace('时间轴及原引用不修改。','时间轴按下方规则仅做展示整理；原引用不修改。')
prompt['value']+='''

病程轴展示：timeline_sources已经逐事件拆分，每条有source_id、date、detail。timeline_edits按需返回[{"source_id":"E1","title":"病理与检测","detail":"精简但等义的事件内容"}]，不返回date，不新增或合并事件。title为4～10字中性事件名，不用“诊疗节点1”，不写评价或推荐。detail目标30～70字、上限90字，仅删重复表述，保留时间顺序、全部数字/分期/分级、药物/检测英文、阴阳性、否定与疑似等限定。不能改变“拟行/已行”的状态，不能变更结局或用药。无法安全缩短时不提供该项，代码保留完整事件。没有具体时间时保留原始相对阶段，不编日期。来源中的JSON数组符号不能作为展示文字。
题目文字：删除“关于……下列哪项最符合当前指南规范”等冗余套话，直接问本题的决策，但保留“若/假设”、无内脏危象、时间间隔、检测状态等全部条件。解析优先说决定因素和关键误区，不扩展背景科普。医学结论、推荐强度、数字、答案及选项都不更改；不能用缩字数掩盖引用不匹配等医学问题。安全条件不满足时保留原文，禁止硬截断。phase和timepoint及guidelineRef不在本次编辑范围。
'''
code=inp('jKqMCN8eJKvkngnI','code')
code['value']=helper+'\n'+code['value']
start=code['value'].index('  function buildTimelineItems() {')
end=code['value'].index('\n  const timelineItems =',start)
code['value']=code['value'][:start]+'''  function buildTimelineItems() {
    return buildDisplayTimeline(case_timeline,agent_reply);
  }
'''+code['value'][end:]
code['value']=code['value'].replace('const limits={question:160,explain:160,keyPoint:70};','const limits={question:100,explain:100,keyPoint:35};')
needle='    result.selection_report.summary_card=summary.report;'
code['value']=code['value'].replace(needle,needle+'''
    if(detail.overview){
      const focus=summary.items.find(x=>x.label==='当前评估重点');
      detail.overview.hero={...detail.overview.hero,title:card.display_title,subtitle:focus?.value||'结合病史与检查信息，思考当前诊疗问题。'};
    }''')
d['name']='最终出题-全页精简V4-测试版'
d['intro']='保留现有单次题目生成绑定；首页、摘要和详情头部精简，数组病程逐事件解析，题干解析受保护等义精简。'
target=OUT/(d['name']+'.json')
target.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(target)
