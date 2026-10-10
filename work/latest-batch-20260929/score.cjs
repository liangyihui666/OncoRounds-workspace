const fs=require('fs');const x=require('./results.json');
const assessments=[
 [62,'题组偏基础；Q1已完成局部CT/MRI仍退回初筛流程；Q5为治疗前评估却标为不良反应管理；答案全B。'],
 [45,'Q4把一般复发灶活检外推到脑膜转移；Q2将推荐完成周期绝对化；核心脑膜诊疗缺口虽披露但未覆盖。'],
 [55,'Q2/Q4把受体变化断言为生物学演变而非检测误差；Q1使用后续EUS成功解释此前选择；核心梗阻处理未覆盖。'],
 [null,'格式未完成：Q5解析及证据字段缺失，同时根对象缺字段。公开结果0题，不等于模型实际生成0题。'],
 [null,'格式未完成：Q5解析为空或格式不合格，整组未交付。无原始回复及结束原因，不能确认截断。'],
 [45,'Q3错误地将pMMR等同于排除林奇；Q1/Q2/Q4重复；将不推荐升级为禁止、一般3至4周升级为硬下限。'],
 [43,'Q3胃癌引用结肠癌复评证据；Q4用中性粒阈值记忆替代持续毒性和菌血症决策；Q5假设改变MSI状态只为考推荐级别。'],
 [null,'报告证据不足，未交付；缺全证据池，无法确认确已穷尽可用的五题方向。'],
 [58,'Q4把贝伐珠单抗术后恢复时间变成必须使用的适应证；Q5跨线继续用药缺少联合方案边界；Q1解析有绑定摘要以外结论待核。'],
 [40,'Q1据HER2/PD-L1/MMR排除全部靶向联合；Q2/Q4解析拼接多个来源；Q3误用缓解确认规则判断进展。']
];
const rows=x.output_data.map((v,i)=>({index:i+1,case_id:v.Questions.case_id,title:v.detail.home.display_title,question_count:v.Questions.question_count,answers:v.Questions.questions.map(q=>q.answer).join(''),editorial_score:assessments[i][0],note:assessments[i][1],missing_information:v.Questions.missing_information}));
const qs=x.output_data.flatMap(v=>v.Questions.questions),scored=rows.filter(r=>r.editorial_score!==null);
const out='outputs/新批次七例完成复核-20260929';fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(out+'/逐例评分.json',JSON.stringify({source_attachment:'0936f3fe-5488-4102-898b-bd36d782b02c',scoring:'人工编辑初评分，非医学批准；综合证据边界、事实与答案唯一性、进阶性与病例覆盖、表述；未交付不计医学零分',complete_count:scored.length,expected_count:10,question_count:qs.length,completion_rate:0.7,completed_mean_score:Math.round(scored.reduce((s,r)=>s+r.editorial_score,0)/scored.length*10)/10,structural_checks:{four_options:qs.every(q=>Object.keys(q.options).join('')==='ABCD'),answer_text_match:qs.every(q=>q.options[q.answer]===q.answer_text),four_explanation_lines:qs.every(q=>q.explain.split('\n').length===4),no_visible_internal_ids:qs.every(q=>!/\b(?:GA|GB|GS|CS|IR)\d+\b/.test(JSON.stringify(q)))},full_evidence_available:false,model_finish_reason_available:false,workflow_revision_available:false,medical_approval:false,rows,batch_report:x.batch_report},null,2));
console.log('Saved report; completed mean = '+scored.reduce((s,r)=>s+r.editorial_score,0)/scored.length);
