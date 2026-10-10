const fs=require('fs'),assert=require('assert/strict');
const dir='outputs/十例批量结果核对-20260928/';
const audit=JSON.parse(fs.readFileSync(dir+'逐例核对.json','utf8'));
const rubric=[['病例忠实度',25],['证据支持与适用边界',30],['进阶决策难度',20],['选项及解析质量',15],['题组完整性与核心主题覆盖',10]];
const scores=[
 [[16,10,8,6,9],'Q1增写紫杉醇治疗后进展，研究获益与获批适应证混用；多条记录拼接，五题全B。'],
 [[23,16,10,10,9],'鉴别诊断主线清楚；Q3选择MDT过于容易，Q2、Q4、Q5把一般原则扩大为具体检查或手术优先级。'],
 [[22,13,11,10,9],'多原发、来源鉴别和MMR线索较有价值；Q2将跨病灶IHC差异等同MMR/MSI不一致，Q4把化疗周期评估条款套到免疫治疗。'],
 [[22,17,8,9,5],'病例主线基本连贯，但五题绕开核心冷凝集素综合征；Q1/Q2考点接近，多数为一般乳腺癌管理。'],
 [[21,14,10,9,9],'覆盖受体变化与全程管理；Q1将2017至2021写成7年前，Q4解析混入另一研究数据，干扰项偏弱。'],
 [[15,9,8,8,9],'将原文时间估算成约第6周期；Q1/Q3/Q4重复度高，一般MDT原则不足以直接证明必须手术探查及后续停药结论。'],
 [null,'Q2、Q4缺keyPoint且解析格式不合格，整组0题。记交付分0，内容分不可评；不代表病例本身没有出题价值。'],
 [[14,10,10,8,9],'Q5虚构化疗后部分缓解；Q3排除内分泌方案的理由不足，检测及评估条款存在扩大解释。'],
 [[17,11,10,9,9],'治疗主线有价值，但Q3术后间隔错误；Q1用一般调整原则推出特定CDK4/6桥接方案，多题解析过于绝对。'],
 [[13,5,9,6,9],'Q4推出卡培他滨与奥拉帕利应联合且不能省略其一；Q5在胚系身份未明时直接给遗传风险，Q3调整方案依据不足。']
];
const rows=audit.rows.map((r,i)=>{
 const [points,reason]=scores[i];if(points)points.forEach((p,j)=>assert(p>=0&&p<=rubric[j][1]));
 return {index:r.output_index,source_id:r.source_id,topic:r.topic,question_count:r.question_count,
   dimensions:points?Object.fromEntries(rubric.map(([name],j)=>[name,points[j]])):null,
   quality_score:points?points.reduce((s,p)=>s+p,0):null,delivery_score:points?points.reduce((s,p)=>s+p,0):0,reason};
});
const mean=rows.filter(r=>r.quality_score!==null).reduce((s,r)=>s+r.quality_score,0)/9;
const report={scope:'人工编辑复核估分，仅评本次生成结果，不是医学审批、正确率或对原病例价值的评价',
 limitations:['未取得逐题绑定的检索全文，证据维度按可见引用摘要、解析及适用逻辑保守估分','0题病例不评内容分，仅记交付分0','本分数不是经过验证的临床质量量表'],
 rubric:Object.fromEntries(rubric),mean_quality_score_of_nine_nonempty_cases:mean,rows};
fs.writeFileSync(dir+'逐例评分.json',JSON.stringify(report,null,2));
const table=rows.map(r=>`| ${r.index} | ${r.source_id} ${r.topic} | ${r.dimensions?Object.values(r.dimensions).join(' | '):'— | — | — | — | 0'} | ${r.quality_score??'0（未交付）'} |`).join('\n');
const details=rows.map(r=>`- **${r.source_id}：${r.quality_score??'0（未交付）'}分。** ${r.reason}`).join('\n');
fs.writeFileSync(dir+'逐例评分.md',`# 本次10例生成结果评分\n\n人工编辑复核估分，不是临床审核结论或正确率。评分对象是本次生成题组，不评价原病例价值。尚无检索全文，不能确认每条引用直接支持答案；证据项按可见信息保守评分。\n\n| 返回序号 | 病例 | 忠实度/25 | 证据/30 | 进阶/20 | 选项解析/15 | 完整与覆盖/10 | 总分/100 |\n|---|---|---:|---:|---:|---:|---:|---:|\n${table}\n\n${details}\n\n第7例内容不可评，0仅为交付分。其余9例平均${mean}分。第2、3、5例可优先保留主线修订；第1、6、8、9、10例需较大重写；第4例需补齐主题证据再重组。没有一组可据当前材料直接判为可发布。\n\n第10例Q4的外部核验依据：ESMO泛亚洲早期乳腺癌指南6j.1明确不应在gBRCA1/2m患者中联合奥拉帕利与卡培他滨：[指南原文](https://pmc.ncbi.nlm.nih.gov/articles/PMC11145753/)。其他证据缺口不因取得此网页而视为已经核验。\n`);
console.log(JSON.stringify({scores:rows.map(r=>[r.source_id,r.quality_score]),mean}));
