import copy,json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
old=json.loads((root/'outputs/Flash病例入口修复-20260928/高年资出题-Flash-病例JSON入口修复版.json').read_text(encoding='utf-8'))
d=copy.deepcopy(old)
common='''

【五题优先与不足检查】
目标是5道不同且达到高年资标准的题目。输出少于5题前，必须逐一检查case_packet.decision_points及真实诊疗阶段，并对照全部evidence_pool寻找未覆盖的可支持决策；不能只围绕最显眼的并发症，也不能把缺少该并发症专项指南当作整个病例无法补题的理由。
可探索初始诊断/分期、分子结果适用、治疗选择或排序、复评与后续管理、安全性处理等，但不强制每类一题，没有原文事件或证据就不出。同一药物停药换几个场景，不自动算不同考点。
首轮不足5题时，在生成结果missing_information逐项说明“已检查的剩余真实决策—可用证据或检索缺口—为何不能形成独立且有唯一答案的题”，不只写“证据不足”。不得声称搜索过当前检索池以外的来源。
题数目标不得覆盖医学正确性、真实时点、证据直接支持与高年资难度要求。通用原则不能擅自升级为具体药物的永久禁忌；不能用后续结局证明当时答案。补题不得复制、降难度或补造病例。
'''
for n in d['nodes']:
 if n['nodeId'] in ['sR35QbYF2xamDQR3','x5dghEdUbp0QQg4T','v12RevisionGenerator','v12ValidatorR2']:
  p=next(i for i in n['inputs'] if i['key']=='systemPrompt')
  p['value']+=common
  if n['nodeId'] in ['x5dghEdUbp0QQg4T','v12ValidatorR2']:
   p['value']+='''
【审核题数与证据缺口的边界】
对已有题仍使用validator_evidence完整原文审核；另附的完整候选证据池（压缩摘要）仅用于发现补题方向，不能代替新题的独立全文核对。
少于5题时，general_feedback必须写明“补题检查：”并列出检查的剩余真实决策、具体可用evidence_id或缺口、为何可补或不可补。未覆盖全部真实决策或缺少这项检查，不得仅因已有题通过就宣告检查完成。
区分两类缺口：影响现有题答案/干扰项排除的缺口必须列入problems、repair_tasks与missing_information并REVISE；只影响增加新题的覆盖局限写入general_feedback，由生成结果保留缺口，不能伪装成已有题通过或失败的依据。PASS时审核missing_information应为空；不能为PASS把现有题的证据问题移到general_feedback。
'''
  if n['nodeId']=='x5dghEdUbp0QQg4T':
   p['value']+='''
若当前1至4题且检索池确有支持新考点的记录，decision=REVISE、recommended_revision_mode=FULL；为可形成的每道新题返回repair_tasks：code=ADD_SUPPORTED_QUESTION，target_ids从已有题数下一号连续编号至最多Q5，fields包含type、phase、timepoint、question、options、answer、answer_text、explain、keyPoint、evidence_id、support_mode、evidence_summary。message明确原文病例条件、新决策、候选evidence_id、相对现有题的区别。只能授权实际有支撑的数量，不能为了达到5题先占空位。question_checks仍只检查已有题，不虚构未生成题审核结果。没有可支持的补题方向时可以只保留已通过题并说明检查结果，不强制修订。未完成补题检查时可用题集任务COVERAGE_RECHECK（target_ids=[]、fields=["missing_information"]）要求FULL重新检查。
'''
  if n['nodeId']=='v12RevisionGenerator':
   p['value']+='''
【第二轮补题执行】
ADD_SUPPORTED_QUESTION是新增题授权，必须使用FULL，按任务连续追加Q4/Q5等新题；保留preserve_ids中的旧题原样，不输出重复旧题，不重新编号。FULL的replacements可以仅包含授权修订题与授权新增题，代码继承未改题。新增题必须绑定已返回的evidence_id并满足高年资难度。重新核对任务中的压缩依据是否充分；无法形成有效新题时不要凑题，使用已有insufficient与missing_information协议明确失败原因。补题后进入第二轮独立全文审核，不因满5题自动通过。COVERAGE_RECHECK只授权重新检查与更新具体覆盖缺口，若没有新增题号授权不能自行追加。
'''
 if n['nodeId'] in ['aISFT5i9Sh2cffSo','v12ValidationInputR2']:
  p=next(i for i in n['inputs'] if i['key']=='system_textareaInput')
  p['value']+='\n\n【补题范围检查用候选池：摘要仅用于发现考点，已有题审核仍须绑定完整原文】\n{{$v11EvidenceRegistry.v12FinalPoolJson$}}'
 if n['nodeId']=='v11ReviewMerge':
  p=next(i for i in n['inputs'] if i['key']=='code');s=p['value']
  s=s.replace('    const targetIds = Array.isArray(task?.target_ids)', '''    const addition = task?.code === "ADD_SUPPORTED_QUESTION" && origin === "medical";
    const permittedIds = addition ? ['Q1','Q2','Q3','Q4','Q5'].filter(id => !IDS.includes(id)) : IDS;
    const targetIds = Array.isArray(task?.target_ids)''',1)
  s=s.replace('task.target_ids.map(String).filter((id) => IDS.includes(id))','task.target_ids.map(String).filter((id) => permittedIds.includes(id))',1)
  s=s.replace('rootOrSetTask || mechanicalMode === "FULL"', 'allTasks.some(t => t.code === "ADD_SUPPORTED_QUESTION") || rootOrSetTask || mechanicalMode === "FULL"',1)
  p['value']=s
 if n['nodeId']=='v12PatchMerge':
  p=next(i for i in n['inputs'] if i['key']=='code');s=p['value']
  anchor='    const existingIds = Array.from(previousById.keys());'
  s=s.replace(anchor,'''    for (const id of patchIds) {
      if(previousById.size > 0 && !previousById.has(id) && !tasks.some(t => t.code === 'ADD_SUPPORTED_QUESTION' && t.target_ids.includes(id))) {
        errors.push('未授权新增题号：' + id);
      }
    }
'''+anchor,1)
  p['value']=s
d['name']='高年资出题-Flash-五题优先补题版'
out=root/'outputs/五题优先补题-20260928';out.mkdir(parents=True,exist_ok=True)
(out/'高年资出题-Flash-五题优先补题版.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'修改说明.md').write_text('''# 五题优先补题版

替换当前接收14字段JSON的出题子应用，外层HTML流程不变。保留上传版本的Flash配置与轻量irAE回退模型。

首轮先对病例全部真实决策与候选证据池检查覆盖，再尽量形成5题。首轮审核额外看到完整候选池摘要：有可支持新考点时，明确授权ADD_SUPPORTED_QUESTION新增Q4/Q5并进入FULL合并；原通过题保留，新题经过二轮完整原文审核。没有依据不授权补题，不能只用“专项指南缺失”概括整个病例无法补足。

区分现有题证据错误与仅影响补题的缺口，前者必须REVISE，后者可随少题结果保留。未增加检索或模型调用次数；补题范围限于当前已检索证据，不能保证每例都出5题。最多一次修订，修订或补题失败沿用原候选回退与不可发布状态。

当前输出仍保留未通过候选用于调试，正式展示必须检查publishable。尚未在线运行；离线验证仅覆盖任务传递、补题合并、旧题保护和异常拦截，不代表医学正确性或模型有效补题。
''',encoding='utf-8')
print(out)
