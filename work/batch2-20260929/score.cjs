const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const batch = JSON.parse(fs.readFileSync('work/batch2-20260929/results.json', 'utf8'));
const out = 'outputs/新十例题组评分-20260929';
fs.mkdirSync(out, {recursive:true});
const rubric = {'病例忠实':25,'证据支持与适用边界':30,'进阶难度':20,'选项与解析':15,'完整性与核心覆盖':10};
const assessments = [
 {id:'144506',topic:'胃癌CAPOX后持久缓解',points:[24,18,9,9,8],reason:'病程基本忠实；Q3把毒性停药条件绝对化，Q4过度排除维持治疗，题目偏基础。',notes:[
 'Q1：不强制先做NGS的方向可以保留，但单一CSCO引用下的解释又调用CACA及中华医学会结论，当前输出不能证明同一检索记录支持全部排除理由。“未行NGS”宜保持为原文未提供分子分析，而非擅自确证检查从未做过。',
 'Q2：主要是PR后管理原则，错误项明显；不能仅凭未进展忽略累积毒性。CR/PR确认间隔应保留所依据评价规范的适用背景。',
 'Q3：重点重写。“4度血液学毒性或严重并发症方为停药指征”把暂停、延迟、减量和永久停药混在一起；原文没有具体血象和分级，不能从一般阈值证明本例减量处理必然正确。奥沙利铂说明书也分别规定血象恢复前延迟与恢复后减量，并非这一排他性表述。',
 'Q4：随访观察是可讨论选项，但仅凭曾发生血液学毒性，尚不能断言卡培他滨维持与毒性管理原则矛盾；缺恢复情况及药物归因。',
 'Q5：初始分期与治疗后分期区分基本合理，但考查层次低，病例长期完全缓解这一核心特点利用不足。']},
 {id:'151422',topic:'乳腺癌术后19年髌骨转移',points:[24,20,8,10,6],reason:'相对完整，但Q1、Q3、Q5反复考全身治疗不能被局部治疗替代，进阶性不足。',notes:[
 'Q1：保留PET可疑结节未经病理证实这一不确定性较好；“随访而非立即活检”的特定选择仍需结合可疑程度及结果对治疗的影响，不能只由系统治疗原则推出。',
 'Q2：已取得髌骨组织而HER2未记载，补充检测方向较合理；10%～40%不能不加区分地当作HER2单个受体的改变率。',
 'Q3：局部处理不能替代全身治疗，方向合理，但与Q1重复。',
 'Q4：完整回顾治疗史可保留；既往乳腺放射野与髌骨相距很远，机械强调必须量放射野边缘距离，病例针对性不足。',
 'Q5：骨改良药物与系统抗肿瘤治疗互补方向可保留；与Q1、Q3存在明显知识点重叠。五题不等于五个独立决策。']},
 {id:'151454',topic:'TNBC术后超早期脑膜转移',points:[20,8,8,6,6],reason:'Q3临床/病理N分期混淆；Q4把再检测原则变成强制脑转移灶取材，需要重点重写。',notes:[
 'Q1：完成计划新辅助疗程、获PR后手术的主线可保留。',
 'Q2：非pCR患者讨论术后强化方向合理，但答案泛泛，未考具体可选方案的适用条件。',
 'Q3：明确错误。解析把临床cN2写成4～9枚，实际这是病理pN2a的计数标准；cN2按固定/融合腋窝淋巴结或特定内乳结情况定义。不能据此直接证明临床低估。术前评估与yp分期应分别记录，不能说后者取代前者。原文Mx也应作为原文记录保留疑问，不宜包装为现行标准分期教学。',
 'Q4：重点重写。CSF细胞学阳性的脑膜转移不能由通用受体复查原则推出必须穿刺或切除颅内病灶。必须考虑取材可行性、风险及是否改变治疗。EANO–ESMO指南说明脑膜活检少用，主要用于诊断仍不确定等情形。',
 'Q5：评估时点题基本对应可见证据摘要，但偏记忆。整套对脑膜转移处置覆盖很弱。']},
 {id:'153018',topic:'乳腺癌十二指肠转移致梗阻',points:[24,14,8,10,6],reason:'病例吻合度较好，但Q1具体操作缺直接支持，Q2、Q3、Q5集中重复受体变化。',notes:[
 'Q1：EUS-FNAB确实是原病例实施的检查，但引用摘要仅是疑难病例需MDT讨论，不能直接证明该检查优于重复胃镜或腹腔镜。病例做过不等于指南已支持唯一优先选择。',
 'Q2：已有转移灶取材，重新检测方向可保留，但措辞宜体现临床适用条件。',
 'Q3：当前三阴性表型可影响方案选择，但一个“受体改变影响治疗”的摘要不足以证明整套方案排序。HER2阴性没有IHC具体评分，也不宜笼统排除所有HER2相关ADC的可能适用性。',
 'Q4：回顾治疗史合理，仍偏常识题。',
 'Q5：不能简单平均受体结果，方向可保留；结果差异需考虑肿瘤异质性与检测质量，不能排除技术原因。与Q2/Q3重复。缺少梗阻急性处置与系统治疗衔接的核心决策。']},
 {id:'162144',topic:'Luminal B乳腺癌肾上腺及脑转移',points:[23,15,7,10,6],reason:'五题齐全，但以PET、复检、MDT、回顾病史等通用原则为主，核心用药决策覆盖不足。',notes:[
 'Q1：“PET-CT可用于可疑病灶评估”不等于必须先于组织取材，当前题干缺乏决定检查顺序的关键条件。',
 'Q2：可考虑转移灶复检，但应说明安全可及性，不能将组织获取作为无条件要求。',
 'Q3：原病例化疗X方案不详，周期长度不明，因此不能仅凭2～3周期评估就否定每月CT为过于频繁。',
 'Q4：正确项“MDT综合评估”宽泛；A和C高度近似。单一综合评估原则不能证明先完成局部放疗再启动系统治疗一律错误。',
 'Q5：回顾治疗史本身合理，但不足以决定局部放疗与全身方案的时序；“所有骨进展都需局部处理”也不应从一般转移部位原则推出。整套未深入考查阿贝西利联合氟维司群的选择边界。']},
 {id:'163395',topic:'HER2阳性乳腺癌脑转移使用RC48',points:[18,7,8,5,5],reason:'Q3研究方案被泛化；Q4强制颅内穿刺；Q5用后续12个月PFS支持第5周期决策，问题最多。',notes:[
 'Q1：初诊IV期优先系统治疗主线可保留，属于基础题。',
 'Q2：病例实际采用WBRT加吡咯替尼/卡培他滨，但引用摘要只支持局部治疗后考虑抗HER2治疗，不能验证特定联合及同步时序。',
 'Q3：PATRICIA研究是帕妥珠单抗加高剂量曲妥珠单抗的单臂研究。4个月临床获益率68%不是所有抗HER2方案的通用效果，也不能证明系统治疗优于SRS再照射。原病例“拒绝再次放疗”和药物可及性限制被题干漏掉，恰是实际选择RC48的重要背景。',
 'Q4：严重适用性错误。“脑转移灶技术上可穿刺，无法获取不构成跳过理由”不成立。受体复查原则不能覆盖颅内操作风险和取材可行性；应先评估取材价值与可及部位。',
 'Q5：第5周期PR时不能已经用后续12个月PFS作决策依据；抗HER2化疗后维持的一般原则也不足以直接给RC48套用“至少6～8周期”。需分离当时疗效和后来随访。']},
 {id:'136519',topic:'AFP阳性结肠癌伴肠套叠',points:null,reason:'0题：缺evidence_id、support_mode等必填字段，且存在证据匹配失败；不只是知识库不足。',notes:[
 '最终questions为空，无法给题目内容质量评分，交付记0。',
 'missing_information同时含AFP鉴别、乙肝管理等真实证据缺口，以及Q1/Q2结构字段缺失、support_mode非法/空值、证据池匹配0条等技术问题。',
 '应定位生成与修订节点完整原始输出，区分模型漏字段、字段未传递及真无证据；仅凭最终输出不能归因到某一个节点，也不能给被丢弃的题目估分。']},
 {id:'137992',topic:'HER2阳性合并MSI-H胃癌',points:null,reason:'0题：Q2～Q5可见内容残留CS01、GA05、IR02、GA01，被程序拦截。',notes:[
 '最终questions为空，无法给内容质量评分，交付记0。',
 '错误信息明确指出内部证据编号进入学员可见正文或证据摘要。可判断输出规范未被满足，不能据此认定该病例无足够证据。',
 '缺少第二轮原始题目及实际检索全文，不能恢复评估完整五题。直接删编号也不能证明原有理由不存在跨记录拼接。']},
 {id:'139431',topic:'小肠黏液腺癌双侧卵巢转移',points:[19,12,9,9,7],reason:'Q2误挂淋巴结计数，Q3称CAPEOX为单药，Q5混合辅助治疗与可测量病灶疗效评价。',notes:[
 'Q1：综合形态、免疫组化与临床判读方向合理；具体标记物来源判断仍需直接病理证据，不能全靠“综合判读”的泛原则。',
 'Q2：原文3/19是淋巴结转移计数（小肠周围3/12、结肠周围0/7），题干和解析却紧接在双侧卵巢转移之后，产生事实归属错误。M1属于IV期这一主结论可保留。',
 'Q3：CAPEOX为卡培他滨加奥沙利铂双药方案，应写“CAPEOX方案单独使用/不联合贝伐”，不能叫单药。未切除晚期的一线系统治疗证据，也不能直接用于证明已切除IV期术后贝伐的选择。',
 'Q4：完善MSI/MMR以了解后续治疗机会的方向可保留，但不可暗示检测阳性即应在术后直接改免疫辅助治疗。',
 'Q5：原文未明确术后可测量残留病灶，不能机械使用CR/PR及4周确认；应先明确治疗目的和可评价病灶。术后随访检查与肿瘤缩小的疗效评价需要分开。']},
 {id:'143320',topic:'MSI-H结直肠癌肝转移转化治疗',points:[18,13,11,9,8],reason:'病程覆盖较好；Q3补入未明确记载的6周间隔，Q4把半年围手术期原则套到已接受长期治疗者。',notes:[
 'Q1：RAS突变影响抗EGFR选择是有效考点，但Hb 77g/L、KPS80不足以单独证明三药方案不适用；keyPoint写“双药骨架优于三药”扩大了结论。',
 'Q2：化疗进展、MSI-H回报后讨论PD-1治疗，主线较好，保留价值最高。',
 'Q3：提供的HTML正文仅记录11周期联合、14周期联合、随后2周期单药至2020年2月以及3月18日手术，没有明确末次贝伐日期。不能将“2周期单药”换算成确定“约6周”，更不能由约数推导已满足≥6周。此处评为题干新增事实缺依据；本次未从原始病历/图像证实精确日期。',
 'Q4：个体化讨论术后续用贝伐可保留，但病例术前已经长期治疗约27周期；“还需完成围手术期半年”不能直接用来否定pCR后观察。已完成治疗时长与免疫治疗情境未匹配。',
 'Q5：年轻、MSI-H、家族史触发遗传评估较有价值；正文列了EPCAM，答案及keyPoint只写MMR基因略窄，需明确完整遗传咨询和检测范围。']}
];
assert.equal(batch.length,10);
const rows=assessments.map((a,i)=>{
 const q=batch[i].Questions;
 if(a.points) a.points.forEach((p,j)=>assert(p>=0&&p<=Object.values(rubric)[j]));
 const score=a.points?a.points.reduce((s,n)=>s+n,0):null;
 const html=fs.readdirSync('C:/Users/admin/Desktop/新增病例候选-10例-2026-09-11').find(f=>f.startsWith(a.id)&&f.endsWith('.html'));
 return {output_index:i+1,source_id:a.id,case_id:q.case_id,topic:a.topic,question_count:q.questions.length,generation_status:q.generation_status,dimensions:a.points?Object.fromEntries(Object.keys(rubric).map((k,j)=>[k,a.points[j]])):null,quality_score:score,delivery_score:score??0,reason:a.reason,question_notes:a.notes,source_file:'C:/Users/admin/Desktop/新增病例候选-10例-2026-09-11/'+html};
});
const structural=[];
for(const [i,x] of batch.entries()) for(const q of x.Questions.questions){
 assert.deepEqual(Object.keys(q.options).sort(),['A','B','C','D']);
 assert.equal(q.answer_text,q.options[q.answer]);
 assert.deepEqual(q.explain.split(/\r?\n/).map(s=>s.slice(0,2)),['A｜','B｜','C｜','D｜']);
 const visible=JSON.stringify({question:q.question,options:q.options,explain:q.explain,keyPoint:q.keyPoint,evidence_summary:q.guidelineRef.evidence_summary});
 if(/\b(?:GA|GB|GS|CS|IR)\d{1,3}\b/.test(visible))structural.push({row:i+1,id:q.id,issue:'internal_id'});
}
const sources=[
 ['NCI乳腺癌PDQ：临床cN与病理pN定义','https://www.cancer.gov/types/breast/hp/breast-treatment-pdq'],
 ['EANO–ESMO脑膜转移指南：CSF与活检适用条件','https://pmc.ncbi.nlm.nih.gov/articles/PMC10619142/'],
 ['ASCO转移性乳腺癌标志物指南：可及病灶取材原则','https://pmc.ncbi.nlm.nih.gov/articles/PMC5478102/'],
 ['PATRICIA研究原文：特定双抗方案与4个月临床获益率','https://ascopubs.org/doi/abs/10.1200/JCO.20.02822'],
 ['DailyMed奥沙利铂说明书：骨髓抑制下的延迟与减量','https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=7dc8dfb1-dec8-43b3-b2ea-05eac054b2c6']
];
const scores=rows.filter(r=>r.quality_score!==null);
const result={input:'C:/Users/admin/.codex/attachments/9e6275bd-b992-4803-af24-427173db353b/已粘贴的文本.txt',assessment_date:'2026-09-29',scope:'生成题组人工编辑评分，不评价病例价值，不是医学正确率或发布审批',rubric,delivered_cases:scores.length,total_cases:10,delivered_questions:40,mean_quality_score:scores.reduce((s,r)=>s+r.quality_score,0)/scores.length,mean_delivery_score:rows.reduce((s,r)=>s+r.delivery_score,0)/10,structural:{four_options_and_answer_text:true,four_explanation_lines:true,visible_internal_ids:structural},limitations:['未取得本轮完整检索记录、两轮生成原文及节点执行轨迹；引用摘要由模型生成，不能当作已核验检索原文。','逐例对照所提供HTML正文；未逐一识别正文图片中的细小文本。重点医学争议另核对正式资料。','本批与上批是不同病例集合，不用均分差异推断工作流变好或变坏。','零题内容质量记null，交付记0；结构正常不代表医学通过。','本次仅评分，未修改工作流、知识库或线上配置。'],rows,sources};
fs.writeFileSync(path.join(out,'逐例评分.json'),JSON.stringify(result,null,2));
const table=rows.map(r=>`| ${r.output_index} | ${r.source_id} ${r.topic} | ${r.question_count} | ${r.quality_score??'—（交付0）'} | ${r.reason} |`).join('\n');
const dims=rows.map(r=>`| ${r.source_id} | ${r.dimensions?Object.values(r.dimensions).join(' | '):'— | — | — | — | —'} |`).join('\n');
const report=`# 新十例生成题组评分（2026-09-29）\n\n8例各5题，2例0题，共40题。已出题组平均 **${result.mean_quality_score.toFixed(1)}/100**；若把两例未交付计为0，本批交付质量均分 **${result.mean_delivery_score.toFixed(1)}/100**。这是人工编辑估分，不是正确率，不构成发布审批。\n\n${result.limitations.map(s=>'- '+s).join('\n')}\n\n## 逐例结论\n\n| 序号 | 病例 | 题数 | 评分/100 | 主要原因 |\n|---|---|---:|---:|---|\n${table}\n\n## 评分构成\n\n沿用病例忠实25、证据支持与适用边界30、进阶难度20、选项解析15、完整性与核心覆盖10。\n\n| 病例 | 忠实/25 | 证据/30 | 进阶/20 | 选项解析/15 | 完整覆盖/10 |\n|---|---:|---:|---:|---:|---:|\n${dims}\n\n## 逐题问题\n\n${rows.map(r=>`### ${r.output_index}. ${r.topic}（${r.quality_score===null?'未交付':r.quality_score+'分'}）\n\n[提供的病例HTML](<${r.source_file}>)\n\n${r.question_notes.map(n=>'- '+n).join('\n')}\n`).join('\n')}\n## 结构检查与修改优先级\n\n已交付40题全部有四个选项、答案文本匹配、A/B/C/D四行解析，未发现内部证据编号残留；两例被拦截的原题不可见。题干已基本不用“最符合指南推荐”问法。\n\n1. 优先重写TNBC的Q3/Q4、RC48的Q3/Q4/Q5。\n2. 修正小肠癌3/19数据归属、CAPEOX表述及辅助/晚期评价混用；去掉MSI-H结直肠癌未经证实的精确停药间隔。\n3. 解决两例交付失败：一例必填字段与绑定失败，一例内部编号外露。不得把这些技术失败统称为知识库不足。\n4. 减少同病例反复考受体复检、回顾病史、MDT等通用知识，优先覆盖真实的独立决策；原文未记载的具体条件保留未知。\n\n## 重点外部核查\n\ncN2与pN2a的区别由NCI分期表直接核对；脑膜活检适用条件由EANO–ESMO指南核对；PATRICIA的研究方案与68%终点由原文摘要核对；奥沙利铂说明书仅用于反证排他性毒性阈值，不用其结直肠癌剂量表直接替代本胃癌CAPOX方案。ASCO可及病灶原则取得索引摘要，全文打开受站点验证限制。\n\n${sources.map(([title,url])=>'- ['+title+']('+url+')').join('\n')}\n`;
fs.writeFileSync(path.join(out,'逐例评分与问题.md'),report);
console.log(JSON.stringify({out,mean:result.mean_quality_score,delivery_mean:result.mean_delivery_score,scores:rows.map(r=>[r.source_id,r.quality_score]),structural:result.structural},null,2));
