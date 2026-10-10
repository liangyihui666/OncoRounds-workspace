const fs=require('fs'),assert=require('assert/strict'),path=require('path');
const dir='outputs/第二批十例结果核对-20260928';
const data=JSON.parse(fs.readFileSync(dir+'/原始结果解析.json','utf8'));
const rubric={'病例忠实度':25,'证据支持与适用边界':30,'进阶决策难度':20,'选项及解析质量':15,'题组完整性与核心主题覆盖':10};
// Editorial assessments after reading all 50 questions, their visible references, and source case HTML.
const reviews=[
 ['155554','卡匹色替相关放射性回忆性皮炎',[21,7,8,5,9],
  'Q3用ICI毒性指南支持卡匹色替皮炎处置；Q4把个案再激发与换药成功升级为通用规则。',
  ['Q1、Q2以检测和适应证记忆为主，竞争选项较弱。Q1的PI3K称谓还需与实际AKT靶点区分，原病例报道本身也有混称。',
   'Q3引用明确为免疫检查点抑制剂毒性指南，不能仅因也是皮疹便直接支持AKT抑制剂的处置剂量；C解析还用后续换药耐受作为当前决策依据。',
   'Q4以药物机制不同推出减量再激发和换药可行，主引用摘要只说明Alpelisib机制和适用人群；病例曾这样处理，不等于指南支持此普遍策略。',
   'Q5从一般姑息放疗推荐推到再照射的具体选择，需匹配再程放疗条款。五题答案全A。']],
 ['162417','乳腺癌术后新诺卡菌菌血症',[21,5,5,5,6],
  'Q3把TMP-SMX过敏套入抗肿瘤药轻度药疹可不停药规则，药物类别错配。',
  ['Q3的致敏药是抗生素TMP-SMX，答案却回答“不需要停用抗肿瘤药物”；原病例实际先换药。BACTRIM说明书也要求皮疹首次出现时停药评估，不能用该抗肿瘤药例外规则替代。',
   'Q4脱敏讨论须核实过敏类型及确无更好替代方案。原文药敏列出多个敏感替代药，题目未交代为何不适用，却借PCP共识决定诺卡菌感染处置。',
   'Q1/Q2/Q5主要考检查清单、剂量百分比和评价标准，核心病原鉴定、药敏及足疗程治疗没有形成有效考核。Q5含“假设”却未标【延伸情境】。五题全A。']],
 ['163925','高PD-L1表达MSS胃癌转化治疗',[23,5,8,5,8],
  'Q3将III期术后ATTRACTION-5结果外推到IV期转化后pCR；Q5无充分依据把PET排在腹腔镜之前。',
  ['Q1保留MSS与高CPS并存的决策价值，但笼统“根据CPS选化疗±免疫”摘要不足以逐项核验具体SOX联合方案。',
   'Q2引用主要支持不符合D2+PAND条件，不能仅据此证明必须立即同期切除胃和肝、继续两周期一定不合适。',
   'Q3研究为病理III期D2术后人群，比较加或不加纳武利尤单抗；本例是IV期先行免疫转化后pCR。试验阴性不能直接证明该患者全部观察随访或整个PD-1药物类别均不适用。',
   'Q4是检测级别记忆，且从检测推荐推到进展后具体药物适用需补线次条件。Q5用“正文未提及腹腔镜”排除选项，缺少记载不是反对证据。']],
 ['165004','TNBC合并肝内脏危象',[24,13,10,9,6],
  '病例事实较稳，但五题绕开SG治疗肝内脏危象的核心决策；部分解析附加依据不足。',
  ['Q1卡培他滨方向与原病例相符，但解析附加“帕博利珠单抗术后维持仅适用于CPS≥20”的门槛，所见引用摘要不能支持，须回查正式条款。',
   'Q2受体复核和Q3免疫相关膀胱炎较贴合病程；Q3需要保留排除感染的先后与适用条件，不能把所有经验抗感染笼统判无效。',
   'Q4/Q5多为通用新辅助规范，干扰项偏容易。五题没有真正讨论SG与严重肝功能异常/内脏危象的证据边界，不能仅靠题数算核心主题完成。']],
 ['165033','MSS直肠癌RIN方案',[24,10,12,8,8],
  'Q5研究阶段适用性较好；Q2明确用“反推”支持强化化疗，推理不成立。',
  ['Q1再评估可切除性的方向可保留，需核实再程放疗约束。',
   'Q2由dMMR/MSI-H对某类化疗不敏感反推本例应优选FOLFOXIRI，无法证明三药强化的必要性，也没有充分条件排除较低强度方案。',
   'Q3将术前/辅助后ctDNA预后相关性扩展为复发后RIN治疗的必要监测与疗效结论；相关性不能独自证明监测策略改变决策的价值。',
   'Q4仅引用“再程放疗原则见其他章节”，便判具体50Gy方案总剂量过高，缺少累积剂量、照射体积和间隔。',
   'Q5核对FIRM初治新辅助与术后复发阶段，是本批较好的进阶题方向；详细入组数据仍需核对返回全文。']],
 ['170901','HER2阳性直肠癌胰腺转移伴感染',[20,6,8,6,8],
  'Q3把活动性感染简化为不适合强化治疗，直接推荐化疗；Q5过早推到转化手术目标。',
  ['Q1有鉴别原发与转移的实际价值，但一般“力争取得病理”不能直接升级为所有类似胰腺病灶都必须采用EUS-TA。',
   'Q2引用摘要只明确RAS/BRAF的原发灶检测可用，答案同时扩至MSS，需回查同一记录是否完整支持。',
   'Q3现有一般低强度治疗推荐不能直接证明本例感染未控制时化疗安全，更不能由此排除暂缓。原病例基于感染风险使用HER2双靶向；历史方案不必自动判为标准，但题目替代方案必须有匹配感染情境的依据。',
   'Q4影像结合标志物方向可保留，但偏基础。Q5原文只有缩小/改善，题目增写感染已控制和部分缓解，并在既有脑、肝、骨等多器官受累背景下以争取手术为目标，缺少可切除性条件。']],
 ['133766','乳腺小叶癌胃及腹膜转移',[19,11,8,8,7],
  'Q5把已经完成的乳腺超声和X线当作待补检查；检测条款多处写成无条件必须。',
  ['原文确诊过程中已完成乳腺超声和X线，Q5解析却称确诊后必须补充乳腺专项影像，属于遗漏已完成检查。',
   'Q1将不同转移部位的检查方法列表解释为每个初诊IV期患者无条件必须同时做ECT和脑MRI；需回查原条款适用条件。',
   'Q2把检测菜单扩为所有乳腺癌统一必检PD-L1和PIK3CA/AKT1/PTEN，所见摘要不能替代完整人群分层。',
   'Q3用药前QTc安全方向有价值，但偏单点记忆。Q4将复发时重新活检原则扩成每次进展必须再活检，并排除ESR1相关策略，需明确可及性和治疗选择。胃转移来源鉴别未成为主考点。']],
 ['142240','肝癌免疫靶向联合SBRT',[13,3,7,4,6],
  'Q5关键入组条件符号与正式论文相反；Q3在肾毒性未分级时认定永久停药最优。',
  ['Q1排除抗血管生成的出血风险与Q2一个周期后直接加TKI之间缺少出血已控制的事实。Q2自行补出“胃溃疡愈合时间窗”，还把联合方案优于单药当作已证实。',
   'Q3明确基线肌酐未知却选永久停用ICI，并以AFP下降判定再挑战获益有限；引用仅为按毒性等级决定处置的一般原则。',
   'Q4“未记载分级”被写成“轻度”“未达减量阈值”，将未知变成确定。',
   'Q5将CheckMate 9DW纳入要求写成≤1个可测量病灶，正式论文为至少1个。ASCO摘要页面检索文本也出现≤1，存在来源冲突，不能直接归因模型幻觉；应核查原摘要、全文及入库记录。',
   'SBRT和停全身治疗后长期控制是原病例主线，但题组几乎未考；原文也不能支持把所有后续时点概括为持续仑伐替尼单药维持。']],
 ['153882','妊娠期乳腺癌伴胎盘转移',[22,5,6,5,8],
  'Q3/Q5疑似将新辅助条款套入IV期治疗；Q4“再次腹泻”与排除复发性毒性减量的理由不一致。',
  ['Q1骨转移评估和Q2转移灶受体复核方向可保留，但均偏基础。Ki-67不同本身不等于ER/PR/HER2受体已改变。',
   'Q3所引TCbHP/THP、TH+吡咯替尼分层须核对具体章节，不能只以“初始治疗”代替新辅助与转移性一线场景；被指南收录也不直接等于在任何组合/场景均符合药品说明书。',
   'Q4题干写“再次出现2级腹泻”，解析却称“仅为24h未缓解”并排除复发时减量。前次严重度与责任药物不明，三药并用下不能直接确定卡培他滨恢复剂量；也未标【延伸情境】。',
   'Q5将新辅助每周期评估要求泛化为转移性初始全身治疗。五题全A；妊娠时点、母婴决策、先心病背景和胎盘转移评估缺少实质考核。']],
 ['155245','HER2阳性胆管癌T-DXd治疗',[23,18,10,11,8],
  '本批相对最好，两道延伸题标注完整；Q5仍是推荐级别记忆，若干具体用药条件待核。',
  ['Q1检测方法题较清楚，但原病例只记IHC/FISH阳性，未给IHC具体评分；解析“本例符合”不能当作已确认3+。病例为胆总管癌，肝内胆管癌共识的适用范围亦须核实。',
   'Q2分子检测指导后线方向合理，但“常规推荐检测”不必然意味着所有治疗均须等待全部结果。',
   'Q3明确假设2级ILD并询问T-DXd停药原则，形式和药物匹配较好。Q4也明确假设，但≤7天/＞7天的分界需核对本次引用全文，不能仅凭生成摘要认定已验证。',
   'Q5只是I/II/III级及证据类别识记；核心耐药后联合仑伐替尼的证据限度未充分考核。']]
];
const sourceLinks={
 bactrim:'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=f59d0c04-9c66-4d53-a0e1-cb55570deb62',
 attraction:'https://www.sciencedirect.com/science/article/pii/S2468125324001560',
 checkmate:'https://pubmed.ncbi.nlm.nih.gov/40349714/',
 asco_conflict:'https://www.asco.org/abstracts-presentations/255595'
};
const root='C:/Users/admin/Desktop/新增病例候选-第2批10例-2026-09-11',files=fs.readdirSync(root);
let explainIds=0;
const rows=reviews.map(([id,topic,points,reason,findings],i)=>{
 const r=data[i],qs=r.Questions.questions;assert.equal(qs.length,5);assert.equal(r.Questions.question_count,5);
 assert.equal(r.Questions.case_id,r.detail.case_id);
 const file=files.find(f=>f.startsWith(id)&&f.endsWith('.html'));assert(file);
 const internalIds=qs.filter(q=>/\b(?:GA|GB|GS|CS|IR)\d+\b/.test(q.explain)).map(q=>q.id);explainIds+=internalIds.length;
 for(const q of qs){assert(q.keyPoint?.trim());assert.equal(q.options[q.answer],q.answer_text);assert.equal(q.explain.split(/\r?\n/).length,4);q.explain.split(/\r?\n/).forEach((s,j)=>assert(s.startsWith('ABCD'[j]+'｜'+('ABCD'[j]===q.answer?'正确':'不正确')+'：')));}
 points.forEach((p,j)=>assert(p>=0&&p<=Object.values(rubric)[j]));
 return {output_index:i+1,source_id:id,topic,case_id:r.Questions.case_id,source_file:path.join(root,file),question_count:5,answer_sequence:qs.map(q=>q.answer).join(''),internal_ids_in_explanations:internalIds,unmarked_extensions:qs.filter(q=>/假设|若后续/.test(q.question)&&!q.question.startsWith('【延伸情境】')).map(q=>q.id),dimensions:Object.fromEntries(Object.keys(rubric).map((k,j)=>[k,points[j]])),score:points.reduce((s,n)=>s+n,0),reason,findings};
});
const mean=rows.reduce((s,r)=>s+r.score,0)/rows.length;
const report={scope:'本次生成题组的人工编辑复核估分，不是原病例价值、正确率或医学审批',rubric,case_count:10,question_count:50,complete_case_count:10,mean_score:mean,all_same_answer_cases:rows.filter(r=>new Set(r.answer_sequence).size===1).map(r=>r.source_id),internal_ids_in_explanations_question_count:explainIds,limitations:['已读全部50题与10份病例HTML，但未获得逐题绑定的完整检索正文。','证据分依据可见摘要、论证边界和少量公开原始来源核验，未逐条确认全部指南。','公共输出未携带工作流版本，不能确认本批是否使用最新修复版。','按病例内容匹配文件，不证明实际上传顺序；不同病例难度不同，均分不用于判断工作流前后因果效果。'],sources:sourceLinks,rows};
fs.writeFileSync(dir+'/逐例评分.json',JSON.stringify(report,null,2));
const table=rows.map(r=>`| ${r.output_index} | ${r.source_id} ${r.topic} | ${Object.values(r.dimensions).join(' | ')} | **${r.score}** |`).join('\n');
const details=rows.map(r=>`## ${r.output_index}. ${r.source_id} ${r.topic}：${r.score}/100\n\n${r.reason}\n\n${r.findings.map(s=>'- '+s).join('\n')}\n\n[原病例](<${r.source_file.replaceAll('\\','/')}>)`).join('\n\n');
fs.writeFileSync(dir+'/逐例评分与问题.md',`# 第二批10例生成结果复核\n\n10例均输出5题，共50题；全部有keyPoint，解析为A/B/C/D四行且标记与答案对应。题量与字段完成，不等于医学质量合格。\n\n评分沿用上次五维标准，属于人工编辑估分。已读10份原病例及全部50题；尚无本轮逐题检索全文，证据支持仅能作有范围限制的复核。所有题组仍需修订或核证，70分亦不表示可直接发布。\n\n| 输出序号 | 病例 | 忠实/25 | 证据/30 | 进阶/20 | 选项解析/15 | 完整覆盖/10 | 总分 |\n|---|---|---:|---:|---:|---:|---:|---:|\n${table}\n\n平均${mean}分。与上一批不同病例，不能据此证明修复版质量上升或下降，也不能从公共结果确认线上工作流版本。\n\n${details}\n\n## 已做外部核验的重点\n\n- 162417 Q3：TMP-SMX属于抗菌药。BACTRIM说明书要求首次出现皮疹时停药处理，不能直接套用抗肿瘤药轻度皮疹可继续治疗的规则。[正式说明书](${sourceLinks.bactrim})\n- 163925 Q3：ATTRACTION-5研究的是病理III期胃/食管胃结合部癌D2术后辅助治疗，并非IV期先接受免疫转化后pCR的人群；该结果不能独自证明本例应观察随访。[原始研究](${sourceLinks.attraction})\n- 142240 Q5：正式研究纳入条件为至少1个可测量未治疗病灶，题目写成≤1个并以此排除多病灶患者，不能接受。[研究摘要](${sourceLinks.checkmate}) 与此同时，[ASCO四年随访摘要页面](${sourceLinks.asco_conflict})的搜索可见文本也出现≤1，提示来源冲突。未取得本轮入库原始记录，无法区分网页呈现、入库、摘要提炼或模型解释环节的责任。\n\n外部核验用于发现问题，不替代本轮知识库证据，也未把新网页偷偷补为题目引用。\n\n## 流程层面的结论\n\n1. 本次没有零题、缺keyPoint或解析不足四行的交付问题。不能据此宣称格式失败以后不会再发生。\n2. 155554、162417、153882三组五题全A；${explainIds}道题的解析暴露GA/GB/GS/CS/IR内部证据编号。\n3. 162417 Q5、153882 Q4含假设或若后续，却缺【延伸情境】标签。现有程序只校验已带标签题的假设措辞，不能反向发现所有未标注假设。\n4. 主要剩余问题是药物类别、研究人群/阶段、未知条件及亚组结论的适用性；“引用存在”不能代表“答案被引用支持”。\n5. 不应靠删除知识库解决。CheckMate 9DW需先核查证据源与符号；感染和特殊人群问题需要对应证据，核心问题缺依据时应明确缺口，不能用通用检测题静默替代并清空missing_information。\n6. 本轮仅复核并评分，未改工作流，也未修改用户原始HTML及输出附件。\n`);
console.log(JSON.stringify({cases:10,questions:50,mean,internalIds:explainIds,scores:rows.map(r=>[r.source_id,r.score])}));
