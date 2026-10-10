import copy
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
src = root/'outputs/OCR衔接出题-20260928/题目生成-OCR直连-时间阶段文案修订版.json'
out = root/'outputs/高年资医生出题-20260928'
out.mkdir(parents=True,exist_ok=True)
old = json.loads(src.read_text(encoding='utf-8'))
d = copy.deepcopy(old)
common = '''

【高年资肿瘤专科医生的进阶标准】
目标学员为高年资肿瘤专科医生。difficulty仍使用接口值“进阶”，其含义是有临床取舍的病例推理，不是基础知识复述或冷僻记忆。
decision_points是候选方向，不是必须逐条转成问题的指令。选择病例和当前检索证据共同支持、能区分合理备选行动的真实决策；优先治疗排序、证据适用边界、检测结果不一致的处理、再次取材的时机、局部与全身治疗的选择、疗效与毒性之间的权衡。病例没有对应情境就不出该方向。
出题前在内部比较候选考点：当时已知事实、需权衡的备选方案、决定优先级的条件、支持该结论的实际evidence_id。此规划不输出、不新增JSON字段。
每题应需要整合病例条件和证据适用边界；通常至少涉及两个相互作用的有效条件，但不以条件数量机械判定难度。无关病史、长句、罕见术语、研究名称和精确数值背诵都不构成进阶难度。
删除病例特异条件后仍能仅凭常识直接作答、凭一个关键词对应标准答案、从极端或荒谬选项排除即可作答的题目，通常不合格。必须具体指出哪些条件改变了本题选择，不用空泛的“综合判断”包装基础题。
四个选项必须位于相同决策层次，表达相近。每个干扰项应在相邻临床条件下具有合理性，其中至少一个是本例值得认真比较的竞争方案；当前病例事实和绑定证据必须能解释它为何不优先。不能为了合理干扰项引入没有依据的新治疗结论。
仅当题干事实与证据足以支持唯一最佳答案时才能形成单选题。多个方案同等合理、关键条件未载明或主要靠专家偏好才能区分时，换成有证据支持的决策或报告缺口；不得把争议强行写成唯一正确答案。
解析先说明本例决定性条件和正确方案，再解释最具竞争力的备选方案为何此时不优先；keyPoint提炼带适用边界的可迁移原则。拒绝只复述答案、泛称“指南推荐”，也不必逐项罗列显然错误选项。
同组题目应覆盖不同决策，不把同一检测原则或同一研究结论换词重复。难度增加不得违反原有真实时间线、单一绑定证据、四选一、字数和来源规则。必要条件无法在现有篇幅清楚表达时改选较聚焦的决策，不删除条件制造歧义。
禁止补造检查结果、治疗经历、毒性等级、患者意愿或其他病灶状态来构造复杂病例；禁止用后续结局倒推当前选择。目标5题，证据只能支持较少有挑战性的题目时允许1至4题并说明缺口，不用简单题凑数。
'''
audit = '''
【逐题难度与教学价值审核】
除医学正确性外，独立审核是否达到上述高年资标准。使用已有question_checks与repair_tasks，不新增输出字段。
每题核查：①哪些已记载的条件影响方案优先级；②去掉病例后能否凭常识作答；③是否存在合理且有区分依据的竞争选项；④绑定原文能否区分唯一最佳答案；⑤解析是否解释决定因素与竞争方案；⑥是否与其他题实质重复。不得因模型自称“进阶”或语言专业就通过。
医学正确但难度不足时，question_checks中passed=false，problems写明具体简单在哪里，decision=REVISE；不得仅给低分但仍PASS。全部实际题目医学、证据、难度与展示均无待修问题时才可PASS。
repair_tasks使用具体code：DIFFICULTY_TOO_LOW（常识或脱离病例仍可答）、DISTRACTOR_TOO_OBVIOUS（干扰项明显失真）、ANSWER_NOT_UNIQUE（无法区分最佳）、EXPLANATION_NO_TRADEOFF（未解释竞争方案）、DUPLICATE_DECISION（同义考点重复）。message写明原题问题、已有事实或证据允许的修改方向，不能要求虚构条件。
需要重构决策的难度问题，授权question、options、answer、answer_text、explain、keyPoint；考点变化时同时授权type、phase、timepoint、evidence_id、support_mode、evidence_summary。仅解析不足就只授权explain和keyPoint，避免无关改写。
如果现有资料不能支持更高难度题目，记录具体缺失信息；有候选但尚不合格时仍如实REVISE，零题且缺少事实或证据时才STOP_INSUFFICIENT。二轮也不能因重试结束而放宽标准。
'''
revision = '''
【执行难度修订】
对DIFFICULTY_TOO_LOW或DISTRACTOR_TOO_OBVIOUS，按repair_packet授权实质重构决策条件与备选方案，不通过加长题干、替换术语、调整选项顺序或重述原题冒充修复。只能使用已记载事实与可定位证据；若修改影响正确答案及引用，同步修改所有已授权关联字段。
对EXPLANATION_NO_TRADEOFF，补充决定性条件和最具竞争力备选方案不优先的原因。对ANSWER_NOT_UNIQUE，原文存在可区分条件才补入题干，否则改用受支持的考点或明确不能修复。对DUPLICATE_DECISION，替换受影响题，不改未授权通过题。
修订前自检原问题是否实际消失；没有证据支持的复杂化不得实施。无法修复时沿用原有insufficient/缺口及回退协议，不假报成功；回退候选不代表医学或难度通过。
'''
ids = {'sR35QbYF2xamDQR3','x5dghEdUbp0QQg4T','v12RevisionGenerator','v12ValidatorR2'}
for n in d['nodes']:
    if n['nodeId'] in ids:
        p=next(i for i in n['inputs'] if i['key']=='systemPrompt')
        p['value']=p['value'].replace('尊重三组教学侧重；','优先遵循当前病例learning_points，未提供时按真实决策选择；')
        p['value']+=common
        if n['nodeId'] in {'x5dghEdUbp0QQg4T','v12ValidatorR2'}: p['value']+=audit
        if n['nodeId']=='v12RevisionGenerator': p['value']+=revision
        (out/(n['name']+'-提示词.txt')).write_text(p['value'],encoding='utf-8')
    if n['nodeId']=='lUxTeIqSf0zHu2BL':
        p=next(i for i in n['inputs'] if i['key']=='system_textareaInput')
        p['value']+='\n\n【目标学员】\n高年资肿瘤专科医生。进阶指基于病例条件与证据边界的方案取舍；禁止常识题、明显错误干扰项和无依据的复杂化。'
    if n['nodeId']=='v12RevisionInput':
        p=next(i for i in n['inputs'] if i['key']=='system_textareaInput')
        p['value']+='\n\n【难度修订目标】\n落实repair_packet中的难度和竞争方案问题；保持高年资标准，只改授权题，不编造病例条件。'
d['name']='题目生成-OCR直连-高年资医生版'
d['intro']='面向高年资肿瘤专科医生：病例决策取舍、合理竞争选项、独立难度审核及一次实质修订。'
(out/'题目生成-OCR直连-高年资医生版.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'使用说明.md').write_text('''# 高年资医生出题测试版

导入本目录工作流JSON到测试应用，核对OCR结果后发送完整14字段病例JSON。沿用时间与阶段短文案规范。

本轮同步首轮出题、首轮独立审核、二轮修订、二轮独立审核及两处输入提示。先比较真实决策和证据支持，再生成有合理竞争方案的单选题；难度不足写入现有逐题审核和修订任务。清除旧“三组教学侧重”表述。未新增模型调用，未更换模型、检索工具、接口字段或连线。

目标5题、实际1至5题、最多一次修订。证据不足不补造、不以基础题凑数。difficulty字段保持“进阶”，含义升级为高年资临床推理。

当前模型沿用上一版：首轮生成/审核qwen3.8-max，二轮修订/审核qwen3.5-plus，irAE回退qwen3.5-plus-nothinking。本轮未擅自全部改用Flash。

输出协议仍保留候选及真实审核结果：output_ready不等于可发布，正式展示应使用publishable=true。难度审核未过则应为REVISE且不可发布；调用方若忽略publishable，仍可能展示未通过题目。本轮未修改线上调用方。

离线测试验证配置同步及模拟审核任务能进入修订并阻止发布，不证明模型能识别所有简单题。尚未导入平台或实际运行模型；需用真实病例进行高年资医生评审。
''',encoding='utf-8')
print(out)
