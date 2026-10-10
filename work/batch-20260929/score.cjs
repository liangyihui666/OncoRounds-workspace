const fs=require('fs'),assert=require('assert/strict');
const dir='outputs/题干措辞与病例事实修复-20260929';
const batch=JSON.parse(fs.readFileSync('work/batch-20260929/results.json','utf8'));
const previous=JSON.parse(fs.readFileSync('outputs/第二批十例结果核对-20260928/逐例评分.json','utf8'));
const rubric=previous.rubric;
const assessments=[
 ['162417','新诺卡菌菌血症',[24,18,9,10,7],'较上次明显改善，TMP-SMX处理已纠正，RSV诊断证据也有辨析；但Q1/Q2/Q5偏规范记忆，IHC替代分型与内在分型表述仍需修正。'],
 ['163925','MSS胃癌转化治疗',[24,17,11,10,8],'本批相对最好。Q3研究适用性有价值，pCR后治疗缺口已披露；Q4解析补出具体分期数字、Q5若干排除理由仍需同一证据支持。'],
 ['165004','TNBC肝内脏危象',[20,16,9,10,6],'核心证据缺口诚实披露，但仍未实质考查SG与肝内脏危象；Q1补入穿刺阳性及完整分期，Q2偏药物配方记忆，进阶性不足。'],
 ['165033','MSS直肠癌RIN方案',[22,13,12,9,9],'Q4区分不耐受与进展、研究剂量差异，较有价值；Q3把可能停药或减量收窄成必须永久停整套方案，是主要扣分点。'],
 ['170901','直肠癌胰腺转移伴感染',[20,11,11,10,8],'能说明双靶向提前一线的依据缺口；但将HER2定义阈值当患者事实，囊肿持续存在被直接推为必须引流，依据仍不充分。'],
 ['133766','乳腺小叶癌胃转移',[19,12,10,10,8],'诊断流程比上一批贴合病例；但“唯一可获取的标本”缺原文依据，一般评估原则被用来指定检查优先级，受体谱与来源鉴别作用混杂。'],
 ['142240','肝癌免疫靶向与SBRT',[21,10,10,10,8],'肾毒性题改成先评估等级，较上次进步；仍补写PS 0，将ICI后换线研究用于治疗中联合，并由一般综合评估原则推出不恢复治疗。'],
 ['153882','妊娠期乳腺癌、胎盘转移',[17,7,7,8,7],'仍需较大重写。增加原文没有的MDT讨论及心脏安全推断；治疗阶段适用性待核，腹泻恢复剂量的时间与复发条件被省略，母婴核心决策不足。'],
 ['155245','胆管癌T-DXd',[18,16,9,10,7],'比上次退步：把白细胞减少和贫血改为2级中性粒细胞减少且无发热；HERB数值差异被称为显著差异，多题偏方案和数字记忆。'],
 ['155554','卡匹色替相关皮炎',[17,9,10,9,8],'核心主题覆盖较好，答案分布改善；但把总三次放疗写成三次下肢放疗，永久停药及替代方案仍缺药物和严重度匹配的依据。']
];
const rows=assessments.map(([id,topic,points,reason],i)=>{
 points.forEach((p,j)=>assert(p>=0&&p<=Object.values(rubric)[j]));
 const prior=previous.rows.find(r=>r.source_id===id);assert(prior);
 return {output_index:i+1,source_id:id,topic,case_id:batch[i].Questions.case_id,question_count:batch[i].Questions.question_count,dimensions:Object.fromEntries(Object.keys(rubric).map((k,j)=>[k,points[j]])),score:points.reduce((a,b)=>a+b,0),previous_score:prior.score,reason};
});
const mean=rows.reduce((s,r)=>s+r.score,0)/rows.length;
const report={scope:'人工编辑估分，针对用户9月29日提交的生成结果；不评价原病例价值，不是正确率或医学审批',rubric,mean_score:mean,previous_same_cases_mean:previous.mean_score,limitations:['依据前一轮已完成的全部50题与原病例复核评分，未获得逐题完整检索正文。','分数是五维人工判断，不是经过验证的临床量表。','这是两批相同病例的输出比较，不是对9月29日刚交付工作流的线上验收，不能据此认定因果效果。'],rows};
fs.writeFileSync(dir+'/本批逐例评分.json',JSON.stringify(report,null,2));
const table=rows.map(r=>`| ${r.output_index} | ${r.source_id} ${r.topic} | ${Object.values(r.dimensions).join(' | ')} | **${r.score}** | ${r.previous_score} |`).join('\n');
fs.writeFileSync(dir+'/本批逐例评分.md',`# 9月29日生成题组评分\n\n本批平均 **${mean}/100**，上一批相同病例平均${previous.mean_score}/100。均为人工编辑估分，不是正确率或医学审核结论。未取得本轮逐题检索全文，证据分按可见信息保守评估。\n\n| 序号 | 病例 | 忠实/25 | 证据/30 | 进阶/20 | 选项解析/15 | 完整覆盖/10 | 本次 | 上次 |\n|---|---|---:|---:|---:|---:|---:|---:|---:|\n${table}\n\n${rows.map(r=>`- **${r.source_id}，${r.score}分：** ${r.reason}`).join('\n')}\n\n题量、解析完整性、内部编号与答案分布已有改善；主要瓶颈仍是病例事实被补写、证据条件丢失和进阶难度不足。可优先保留胃癌和RIN题组主线修订；妊娠乳腺癌与卡匹色替皮炎需重点重写。分数不自动赋予发布资格。\n\n评的是用户提供的这次输出，不是刚交付修改版的在线重跑结果。CheckMate 9DW问题本批未再成题，也未列为本次扣分项。\n`);
console.log(JSON.stringify({mean,scores:rows.map(r=>[r.source_id,r.score])}));
