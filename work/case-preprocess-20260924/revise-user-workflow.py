import json,copy
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'outputs/病例资料预处理-20260924'
source=Path('C:/Users/admin/.codex/attachments/1c4f7afe-1fe7-4996-9115-fd5b7bf8479a/已粘贴的文本.txt')
w=json.loads(source.read_text(encoding='utf-8-sig'))
def node(id):return next(n for n in w['nodes'] if n['nodeId']==id)
def inp(n,key):return next(i for i in n['inputs'] if i['key']==key)
ocr=next(n for n in w['nodes'] if n['flowNodeType']=='tool')
assert ocr['pluginId']=='systemTool-lyhOcr/docStructureOptimizeV1'
inp(ocr,'urls')['value']=[['collectFiles','ocrUrls']]
inp(ocr,'urls')['selectedType']='reference'
ocr['catchError']=True
inp(node('aggregate'),'texts')['value']=[ocr['nodeId'],'texts']
inp(node('aggregate'),'ocrError')['value']=[ocr['nodeId'],'system_error_text']

extract=inp(node('extractCase'),'systemPrompt')
extract['value']=extract['value'].replace(
'6. adverse_events记录并发症/不良事件的时间、程度、处理、结局、原文归因。明确发生在治疗前还是后；不把治疗前贫血、感染或未确定因果的问题自动归为irAE。',
'6. adverse_events记录治疗相关不良事件，以及影响治疗的合并症/感染，注明类别、相对于治疗的时间、程度、处理、结局和原文归因。原文归因不明时明确写不明；治疗前贫血或感染须注明治疗前，不能当成irAE。肿瘤进展、转移及其相关症状记录在case_timeline，不作为药物不良事件重复列入adverse_events。')
extract['value']+='''

提交前必须逐项执行以下核对；与较宽泛的前述规则相比，以本节的严格限制为准：
【日期】每一个年/月/日及“月初、月中、月底、某月至某月”都必须在原文明确对应到该事件。不得根据前后事件补出时间范围、病理报告日期或发病日期。不许以“按上下文逻辑整理”为理由推算。原文无具体时间时，可写“日期未记载（新辅助治疗前）”，且治疗前后的先后关系也须有原文支持。标本采集日与结果报告日分开写。
【确定性】逐条核对“考虑、可能、倾向、疑似、未见明确”。例如原文“考虑缺铁性贫血伴溶血”，输出必须保留“考虑”，不得写成“诊断为缺铁性贫血伴溶血”。这些示例是规则演示，不是本次病例事实。
【因果与意见】检查结果不同只能记录差异；不得自行解释为样本异质性、检测方法差异、耐药机制或治疗时间短。原文作者确实作此判断，也必须写“原文MDT/作者认为……”，不能写成已证实的患者事实。不因影像进展直接断言已经确定免疫耐药。
【证据备注】evidence_notes用于原文局限和待核实信息。不得把课件引用某研究改写为“研究支持本患者方案”。若保留研究或指南名称，统一写“原文讨论提及……；这里只记录提及名称，不代表已检索核实或适用于该患者”。不抄写具体推荐结论，不将来源作者的意见当成出题答案依据。
【关键事实清单】回读原文，确认未漏掉：器官功能（例如肺功能及预计值比例）、体能状态、基线远处转移检查、标本/检测方法/历次结果、手术切缘、病理残余肿瘤比例、复发时其他部位疾病状态。原文有则保留；没有则不编造，不机械列出一大串缺失。
【原文冲突】病灶尺寸前后描述不一致、分期前缀或期别写法不同，分别记录实际表述与所在阶段，并在data_quality_notes标记“原文记载不一致，待核实”。不能只记录检测差异而漏掉尺寸和分期冲突，不通过医学常识自行重分期。
【简短标题】case_title使用病种/特征＋诊疗主题，目标12～22字，避免将完整治疗过程和结局都塞入标题。
【输出前自查】删除所有无原文依据的日期、因果解释、确诊升级及推荐结论，然后才输出。不得把你自己的解释放在data_quality_notes中冒充“待核实事项”。
'''
review=inp(node('reviewCase'),'systemPrompt')
review['value']+='''

请先独立读materials，再检查candidate，不能沿用候选内容的解释。对以下检查逐项实际核实，不允许仅因JSON完整就PASS：
1. 候选每个日期/时间范围能否在原文找到且对应同一事件？原文只有前后顺序，候选出现某月初或某月至某月，必须REVISE。病理结果日不能直接沿用取材日。
2. 候选是否保留“考虑、倾向、可能、未见明确”？把“考虑”改成“诊断为”，即使医学上看似合理也必须REVISE。
3. 出现“体现……异质性”“与……治疗时间短有关”“因而证实耐药”等因果解释时，检查原文是否明确归因、候选是否标明作者/MDT观点。候选自行推断必须REVISE；不得替候选找合理解释。
4. evidence_notes及data_quality_notes中是否把原文提到的研究/指南变成可直接使用的推荐证据？若直接宣称某研究支持本例方案或某指南推荐某操作，而没有保持“原文提及、未经检索核实”的边界，必须REVISE。
5. 比对原文是否遗漏肺功能/其他重要器官功能、切缘、病理残余肿瘤、复发时其他部位控制等决策条件；只检查原文实际提供者。
6. 尺寸与MDT描述、分期前缀及期别等是否存在原文冲突？候选是否如实保留并标记，不应擅自纠正。
7. 肿瘤进展/转移症状是否被放进adverse_events而可能误导后续不良反应检索？这些应放在时间轴；治疗前感染/贫血等若保留，必须明确事件类别和与治疗的关系。
8. 所有示例仅用于检查方法，不是本病例的患者事实；不得要求每例病例都具备同一种疾病或同一数值。
原文冲突已经忠实标记、原文缺失已经注明时，可以PASS；不得为通过核对而补出“正确答案”。候选新造的时间或解释即使写在“待核实”里，也必须REVISE。
'''
w['name']='大查房-病例预处理-结构OCR与事实提取修订版'
w['intro']='基于用户最新工作流：接通结构OCR输入输出，约束日期、确定性、因果和证据备注；只上传文件，最终仍输出14个病例字段。'
(OUT/'大查房-病例预处理-结构OCR与事实提取修订版.json').write_text(json.dumps(w,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('workflow generated')
