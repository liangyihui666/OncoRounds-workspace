from polish import *
from collections import Counter
import random

# 病例事实仅据提供的HTML整理；缺失指标不以指南反填。
meta=[
('CASE-FCB62584','肝癌_仑伐替尼肾损伤','消化系统肿瘤','肝癌',
 '68岁男性，既往高血压、糖尿病及HCV感染，2015年确诊原发性肝癌，曾接受肝切除、射频消融和TACE。2021年3月因复发开始仑伐替尼12 mg/d，治疗中蛋白尿及肾功能损害加重，减量后仍进展。2023年11月入院时24小时尿蛋白19.5 g、肌酐150 μmol/L、白蛋白26.4 g/L，伴水肿；肾活检示肾微血管病变和肾小动脉硬化。停药及支持治疗后水肿改善，但尿蛋白3.66 g/24 h、肌酐168 μmol/L，未恢复正常。2024年1月肝癌复发，接受微波消融并开始信迪利单抗。',
 '原发性肝癌，既往复发；原文未提供完整TNM分期。',
 '肾活检：肾微血管病变及肾小动脉硬化。PLA2R抗体阴性；此结果不能单独排除所有膜性肾病。原发肿瘤的详细组织学和分子分型未提供。',
 [('2015年','原发肝癌诊断','此后先后接受肝切除、射频消融和TACE，各治疗具体日期未详。'),('2021年3月','开始仑伐替尼','因复发使用12 mg/d；既往已有轻度蛋白尿。'),('治疗约10个月内','肾脏指标恶化','尿蛋白升至3+，肌酐升至108 μmol/L。'),('2022年10月','减量治疗','减至8 mg/d，肌酐仍波动于120–150 μmol/L，蛋白尿持续3+。'),('2023年7月','出现明显水肿','一个月体重增加10 kg，血压控制不佳。'),('2023年11月24日及入院后','严重蛋白尿与肾活检','入院24小时尿蛋白19.5 g、肌酐150 μmol/L。肾活检提示肾微血管病变和肾小动脉硬化，随后停用仑伐替尼并支持治疗；活检及停药具体日期未详。'),('停药后','肾脏复评','水肿改善，24小时尿蛋白3.66 g、肌酐168 μmol/L，仍有肾脏损伤。'),('2024年1月','肝癌复发后治疗','1月11日MRI提示复发；1月15日行微波消融，后开始信迪利单抗。')]),
('CASE-BD2810E1','胃神经内分泌肿瘤_恶性贫血','神经内分泌肿瘤','胃神经内分泌肿瘤',
 '39岁男性因乏力、疲倦和食欲下降就诊，血红蛋白6.2 g/dL、MCV 115 fL、维生素B12＜50 pg/mL，内因子及壁细胞抗体阳性，诊断恶性贫血。胃镜发现胃窦结节，病理结合萎缩性胃炎背景及胃泌素升高，原文诊断1型胃神经内分泌肿瘤、WHO G1级。CT未见转移。病例选择维生素B12替代和定期随访，未行内镜切除。原文称病灶小且单发，但未提供可核验的具体直径和完整浸润深度。3个月、6个月血液指标恢复正常，不等于已证明肿瘤消失。',
 '1型胃神经内分泌肿瘤，WHO G1级，伴自身免疫性萎缩性胃炎及恶性贫血。1型、G1和TNM分期为不同概念；CT未见转移不等于完整病理分期。',
 '结节嗜铬粒蛋白A免疫组化阳性，Ki-67＜3%，核分裂象＜2个/mm²。胃泌素228 pg/mL；血清嗜铬粒蛋白A255 ng/mL，原文判为正常。维生素B12＜50 pg/mL、甲基丙二酸9945 nmol/L，内因子及壁细胞抗体阳性。',
 [('就诊前两周','出现症状','乏力、疲倦、食欲下降，伴一次非血性呕吐。'),('入院检查','发现恶性贫血','大细胞性贫血、维生素B12显著降低，自身抗体阳性。'),('胃镜及活检','诊断胃NET','发现胃窦结节，病理及背景检查支持原文诊断的1型G1胃NET；CT未见转移。'),('治疗及出院','替代治疗与随访安排','给予肌内维生素B12并安排长期替代，未行内镜切除，建议定期随访。'),('出院后3个月及6个月','血液指标改善','血红蛋白等指标恢复并维持正常；未据此认定胃NET已消失。')]),
('CASE-46B8BDDE','胆管癌_EGFR靶向证据边界','消化系统肿瘤','胆道恶性肿瘤',
 '患者2019年2月诊断肝内胆管癌，右肝巨大病灶伴卫星结节。原文记载T4N0M0，但所给摘要未充分交代支持T4的肝外结构直接侵犯依据。检测发现EGFR 19号外显子缺失；患者拒绝化疗，知情讨论后接受阿法替尼40 mg/d。约1个月后疾病进展，后尝试阿帕替尼，最终因肝功能衰竭死亡，总生存期约1.8个月。该病例不能证明肺癌的EGFR靶向证据可直接移用于胆管癌，也不能由一次失败判定所有同类突变均无效。',
 '肝内胆管癌；原文记载T4N0M0，T4依据需核对原始影像，不能仅由巨大、多发肝内病灶推定。',
 'ARMS检测发现EGFR 19号外显子缺失。原文有限基因检测不等于已完成全部可行动靶点筛查；不得补写其他未检测基因阴性。',
 [('2019年2月','肝内胆管癌诊断','影像显示右肝巨大病灶及卫星结节，结合病理确诊；分期依据需复核。'),('治疗前','有限分子检测与讨论','发现EGFR 19号外显子缺失；患者拒绝化疗。'),('随后','阿法替尼治疗','知情讨论后给予40 mg/d。'),('约1个月后','疾病进展','原文判定进展，之后尝试阿帕替尼；单病灶变化不能替代完整RECIST评估。'),('总生存约1.8个月','死亡','原文记载因肝功能衰竭死亡。')]),
('CASE-DD610E54','乳腺血管肉瘤_局部治疗','胸部肿瘤','乳腺肉瘤',
 '32岁哺乳期女性，乳腺肿块出现约6个月，近1个月增长加快。体检约4×4 cm，超声约2.7×1.7 cm，CT约2.9×1.8 cm，各测量来自不同检查。组织学及CD34、ERG等检查支持原发性乳腺血管肉瘤。病例接受乳腺局部切除及整形，并实施了前哨淋巴结相关手术；这一经过不构成所有乳腺肉瘤常规进行前哨淋巴结活检的依据。原文未行放疗。6个月瘢痕处异常经活检为良性，仍需长期随访。',
 '原发性乳腺血管肉瘤；不能套用普通乳腺上皮癌的完整分期及治疗路径。',
 '组织形态结合CD34、ERG等血管内皮标志物支持诊断；单一标志物阳性不能独立确定组织学级别。',
 [('就诊前约6个月','出现乳腺肿块','近1个月增长加快，患者处于哺乳期。'),('就诊评估','影像与组织学诊断','体检、超声、CT测量不完全相同；病理及免疫组化支持血管肉瘤。'),('手术期','局部切除及乳腺整形','实施局部切除及Batwing整形，原文也记载前哨淋巴结相关手术。'),('术后','未接受放疗','保留本病例经过，不将其解释为所有血管肉瘤均禁忌放疗。'),('术后6个月','瘢痕处复评','异常处活检为良性，继续随访。')]),
('CASE-8DC486E7','胆管癌_自发性肿瘤溶解','消化系统肿瘤','胆道恶性肿瘤',
 '72岁男性，肝内高肿瘤负荷并腹水，影像提示门静脉血栓及其他可疑播散表现，病理为中分化腺癌，原文诊断转移性胆管癌。住院第5天、尚未接受抗肿瘤治疗时出现急性肾损伤、高钾、低钙及高尿酸，原文诊断自发性肿瘤溶解综合征。给予补液、别嘌醇和高钾等支持处理后改善。患者随后选择舒适照护。摘要未提供完整实验室数值，不能自行补算TLS分级。',
 '原文诊断转移性胆管癌；不能把腹水或可疑结节本身直接改写成病理证实的远处转移。',
 '中分化腺癌，原文免疫组化包括CK19、CK20及CK5.2；未提供可用于靶向治疗选择的完整分子检测。',
 [('入院评估','高肿瘤负荷胆管癌','肝脏巨大肿瘤负荷、腹水及影像异常，结合病理诊断；腹水引流约3 L。'),('住院第5天','自发性TLS','未接受抗肿瘤治疗即出现急性肾损伤及相关代谢异常。'),('急性处理','支持与代谢纠正','补液、别嘌醇及高钾处理等；不把急救稳定心肌的用钙自动理解为常规补钙。'),('病情改善后','照护目标讨论','结合病情和患者意愿转为舒适照护。')]),
('CASE-DB524C69','肝移植后肝癌_肾上腺转移','消化系统肿瘤','肝癌',
 '62岁男性因HCV相关肝硬化及肝癌于2018年接受肝移植，移植前Child-Pugh A级。移植约48个月后发生左肾上腺出血性转移，大血肿伴血流动力学异常，AFP明显升高。先行介入止血，再切除肾上腺病灶，病理证实肝癌转移，切缘阴性。此后调整免疫抑制方案；约14个月后局部复发再次切除。后续AFP曾显著升高又下降，影像未见明确病灶，仍需结合动态影像和移植物功能随访。移植前肝功能分级不能代替复发时功能评估。',
 '肝细胞癌肝移植后肾上腺转移，伴出血及后续局部复发；复发时需重新评估全身病灶和移植物功能。',
 '肾上腺切除病理证实肝癌转移，伴脉管侵犯，切缘阴性。AFP动态变化用于随访参考，不能单独证明药物疗效或排除残余肿瘤。',
 [('2018年','肝移植','HCV相关肝硬化及肝癌，移植前Child-Pugh A级；术后接受免疫抑制治疗。'),('移植后约48个月','肾上腺出血性转移','巨大血肿、活动性出血及AFP显著升高。'),('急性处理及手术','先止血再切除','介入止血后切除肾上腺病灶，病理证实肝癌转移，切缘阴性。'),('术后','调整免疫抑制方案','原文记载依维莫司；个案选择不代表已证明其抗复发疗效。'),('约14个月后','局部复发再切除','再次切除局部病灶，后续方案涉及西罗莫司。'),('后续随访','AFP与影像动态观察','AFP升高后下降，影像未见明确病灶；未由标志物变化单独认定治愈或药物有效。')]),
('CASE-4FDC8196','十二指肠腺癌_转移期管理','消化系统肿瘤','小肠癌',
 '53岁女性因腹痛、黄疸等就诊，检查发现十二指肠第三段肿块及肝脏病灶，两处活检结合临床支持十二指肠中分化腺癌伴肝转移，肺结节性质未完全确定。原文报告MSI、HER2及“PD-1”相关结果为阴性，但需核对检测方法和原始项目，不能改写成明确的PD-L1 CPS。患者接受FOLFOX治疗，期间出现肺栓塞和神经症状，接受抗凝及支持照护；未提供足以确定神经毒性等级的功能受损资料。',
 '十二指肠腺癌伴肝转移；展示归类为消化系统肿瘤，字典二级名称为小肠癌。肺结节不自动视为已证实肺转移。',
 '原发与肝脏病灶活检为中分化腺癌，原文记载脉管侵犯。MSI、HER2及“PD-1”结果需结合原始检测报告解释；不能据此补写全部分子检测阴性或胚系检测结果。',
 [('就诊前约3周','出现腹部症状','腹痛、黄疸等促使进一步检查。'),('诊断期','确认十二指肠原发及肝转移','内镜发现第三段病灶，结合两处活检诊断；肺结节仍需区别可疑与确诊。'),('系统治疗期','FOLFOX治疗','治疗目的依据转移性疾病讨论，不能称为已根治后的辅助治疗。'),('治疗期间','肺栓塞及神经症状','实施抗凝和支持处理；神经症状未提供明确毒性等级。'),('后续照护','持续症状与治疗评估','结合疾病控制、并发症、耐受性及患者意愿安排后续管理。')]),
('CASE-776A405','胃GIST_CLEAN-NET','骨与软组织肿瘤','胃肠道间质瘤',
 '43岁女性，胃贲门附近后壁约3 cm胃肠道间质瘤，KIT、CD34及DOG1免疫组化阳性，S100和SMA阴性，CT未见明确播散。接受改良CLEAN-NET切除，切缘阴性，原文按改良Fletcher标准评为低风险。手术约147分钟、出血约3 mL，术后第9天出院，3个月未见复发。原文未提供完整核分裂计数，不能由免疫组化阳性推定KIT基因突变或自行重算风险。',
 '胃部胃肠道间质瘤（胃GIST），原文评为低风险；风险复核需完整病理及肿瘤破裂信息。',
 'KIT、CD34、DOG1阳性，S100、SMA阴性；切缘阴性。免疫组化KIT阳性不等同KIT基因突变；未提供完整核分裂计数及突变检测结果。',
 [('术前','定位及诊断','贲门附近胃后壁约3 cm病灶，病理及免疫组化支持GIST，CT未见明确播散。'),('手术期','改良CLEAN-NET切除','采用改良切除及缝合方式，兼顾完整切除和贲门功能；手术约147分钟，出血约3 mL。'),('术后病理','切缘阴性','原文评为低风险；不补造核分裂计数或KIT突变。'),('术后第9天','出院','恢复后出院。'),('术后3个月','随访','未见复发，继续按风险安排随访。')]),
('CASE-E3A31C4F','食管鳞癌_ESD后追加治疗','消化系统肿瘤','食管癌',
 '54岁男性因进食相关不适就诊，食管病灶接受ESD，病理为中至低分化鳞癌、pT1a-MM，伴脉管瘤栓；垂直切缘阴性，肿瘤距最近水平切缘＜1 mm，不能仅据距离认定水平切缘阳性。病灶约4.5×3.2 cm。CT提示部分纵隔淋巴结稍大，不能直接写成病理N阳性。团队讨论追加治疗后实施食管切除术；所给资料未提供可核验的最终淋巴结病理分期及长期结局。',
 '食管鳞癌ESD病理pT1a-MM伴脉管侵犯；需要追加治疗评估。影像淋巴结稍大不等于病理证实转移。',
 '中至低分化鳞癌，浸润黏膜肌层，脉管瘤栓；垂直切缘阴性，水平切缘距离＜1 mm，HM是否受累需核对。原文未提供特异性分子标志物检测结果。',
 [('就诊前约2个月','出现症状','食管相关症状后接受内镜评估。'),('内镜治疗','ESD切除','切除病灶约4.5×3.2 cm。'),('ESD病理','发现高危因素','pT1a-MM、中至低分化鳞癌、脉管侵犯，垂直切缘阴性，水平切缘距离近。'),('追加治疗前','再分期及方案讨论','CT部分纵隔淋巴结稍大；结合风险及耐受性讨论手术与放化疗。'),('后续治疗','食管切除术','原文选择三切口食管切除；最终pN及长期结局未提供，不补写。')])
]

files=[]
audit=[]
# 打散答案的周期性位置，同时保证更新后的字母与文本完全一致。
rng=random.Random(20260911)
answer_positions=list('ABCD'*11+'B')
rng.shuffle(answer_positions)
for number,(cid,label,first,second,summary,disease,pathology,timeline) in enumerate(meta,1):
    obj=cases[cid]
    before=copy.deepcopy(obj)
    block=obj['Questions']
    block.update(cancer_type=first,second_cancer_type=second,questions=sets[cid],question_count=len(sets[cid]),generation_status='success',missing_information=[])
    for i,q in enumerate(block['questions'],1):
        q['id']=f'Q{i}'
        correct=q['answer_text']
        distractors=[text for key,text in q['options'].items() if key!=q['answer']]
        rng.shuffle(distractors)
        letter=answer_positions.pop()
        q['options']={key:correct if key==letter else distractors.pop() for key in 'ABCD'}
        q['answer']=letter
    detail=obj['detail']
    detail.update(cancer_type=first,second_cancer_type=second,decision_point_count=len(sets[cid]))
    detail['home']['description']=summary
    teaching='；'.join(q['phase'] for q in sets[cid])+'。'
    detail['overview']['hero']['subtitle']=teaching
    for tab in detail['overview']['tabs']:
        if tab['id']=='summary':
            values=[summary,disease,pathology,teaching]
            for row,value in zip(tab['summary_items'],values):row['value']=value
        if tab['id']=='timeline':
            tab['timeline_items']=[dict(date=date,title=title,detail=content) for date,title,content in timeline]
    name=f'{number:02d}_{label}_{cid}.json'
    path=OUT/name
    path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    files.append(path)
    audit.append(dict(case_id=cid,file=name,original_source_slot=next(i+1 for i,x in enumerate(original) if x.get('Questions',{}).get('case_id')==cid),original_questions=before['Questions']['questions'],revised_question_ids=[q['id'] for q in sets[cid]]))

# 仅做格式、映射、答案及可追溯性检查，不把校验成功写成医学PASS。
answers=Counter()
stems=set()
for path in files:
    o=json.loads(path.read_text(encoding='utf-8'))
    q,d=o['Questions'],o['detail']
    assert set(o)=={'Questions','detail'}
    assert q['schema_version']==d['schema_version']=='1.0'
    assert q['question_count']==len(q['questions'])==d['decision_point_count']==5
    for field in ('case_id','cancer_type','second_cancer_type','difficulty'):assert q[field]==d[field]
    assert q['cancer_type'] and q['second_cancer_type']
    assert [x['id'] for x in q['questions']]==['Q1','Q2','Q3','Q4','Q5']
    for question in q['questions']:
        assert set(question['options'])==set('ABCD')
        assert len(set(question['options'].values()))==4
        assert question['answer_text']==question['options'][question['answer']]
        assert question['question'] not in stems
        stems.add(question['question']);answers[question['answer']]+=1
        ref=question['guidelineRef']
        assert ref['source_url'].startswith('https://') and ref['source_title'] and ref['evidence_summary']
        assert ref['doc_id']=='' and ref['split_index'] is None
    old=cases[q['case_id']] # 图片未在任何修改操作中重建。
    source=next(x for x in original if x.get('Questions',{}).get('case_id')==q['case_id'])
    assert d['image']==source['detail']['image']
    assert next(t for t in d['overview']['tabs'] if t['id']=='images')==next(t for t in source['detail']['overview']['tabs'] if t['id']=='images')
assert len(files)==9 and sum(answers.values())==45
report=dict(file_count=9,question_count=45,answer_distribution=dict(answers),checks=['9个JSON解析成功','每份5题且题数与详情一致','所有答案字母与文本一致','两级癌种及病例ID在Questions/detail一致','45个题干无完全重复','原病例图片字段保留','新公开引用不沿用原数据库定位'],medical_pass_asserted=False,workflow_modified=False,source_sha256=hashlib.sha256(SOURCE.read_bytes()).hexdigest())
(Path(__file__).parent/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
(Path(__file__).parent/'change-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
readme='''# 9组题目润色说明

交付9个独立JSON，每份5题，共45题。顺序沿用原始成功结果；原批次第4项INVALID_JSON未纳入，也没有补造该病例题目。本次未修改或发布工作流。

## 本次调整

- 拆开重复考点，调整选项和解析，强调病例中的决定因素及证据适用边界。
- 修正尿蛋白“3+”与毒性等级混淆、分型与分级混淆、可疑转移写成确诊、KIT蛋白阳性等同基因突变、切缘距离近等同切缘阳性等问题。
- 不把个案采用的药物或手术直接写成通用标准，不把单臂研究当作与手术等效的随机证据。
- 同步更新病例摘要、核心教学点和时间轴，保留病例ID、原图片及外层{Questions, detail}结构、schema_version 1.0。
- 十二指肠腺癌按现有字典补为cancer_type=消化系统肿瘤、second_cancer_type=小肠癌；具体诊断仍保留十二指肠腺癌。

## 引用与适用范围

题目引用按本次核对的公开指南、药品说明书及原始研究等更新，实际来源链接写在guidelineRef.source_url。未获得原数据库分块正文的旧定位不与新来源混用：doc_id留空、split_index为null，source_section未确认时留空。需要数据库记录定位的功能应重新绑定，不能把这些公开来源当成原检索池记录。

evidence_type/type如实保留“药品说明书/drug_label”“权威诊疗资料/reference”等来源性质，前端若对这两个字段使用封闭枚举，需要确认展示兼容性。schema_version和既有字段层级未调整。

病例史按用户提供的HTML整理，未提供的检查结果、毒性等级及分期依据不补造。部分历史病例用较新的指南作教学复盘，不能据此认定当年的诊疗必然不当。肾上腺转移急诊处理的引用为病例及综述，证据性质与随机试验不同。

已完成JSON结构、45题计数、选项唯一性、答案字母与文本、两级分类一致性、题干完全重复及图片保留检查。这些检查不代表临床专家终审或前端线上运行验证。

## 文件对应

'''
for i,m in enumerate(meta,1):readme+=f'- {i:02d}：{m[1]}，{m[0]}，5题。\n'
(OUT/'润色说明.md').write_text(readme,encoding='utf-8')
archive=ROOT/'outputs/OncoRounds-9组题目润色-20260911.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for path in files+[OUT/'润色说明.md']:z.write(path,path.name)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None and len(z.namelist())==10
print(json.dumps({**report,'folder':str(OUT),'zip':str(archive)},ensure_ascii=False,indent=2))
