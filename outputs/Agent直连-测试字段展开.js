function main({ case_json }) {
  const parsedTextLength = String(case_json || "").length;

  const production_variables = {
    case_id: "TEST-CONNECT-001",
    case_title: "BRAF V600E 突变晚期肺腺癌连接测试病例",
    disease: "左肺上叶浸润性腺癌 cT4N0M1a IVA期，BRAF V600E突变",
    case_context: "患者男，55岁。2021年因反复咳嗽伴胸背痛就诊，气管镜活检诊断左肺上叶浸润性腺癌，基因检测提示BRAF V600E突变。",
    learning_points: "晚期肺腺癌分子检测、多线治疗决策、BRAF靶向治疗及骨髓抑制管理",
    question_count: 5,
    question_draft: "",
    difficulty: "进阶",
    review_feedback: "首次生成，无上一轮审核意见",
    case_mode: "全程管理",
    case_timeline: "2021年11月诊断左肺上叶浸润性腺癌，BRAF V600E突变；2021年12月接受一线化疗联合贝伐珠单抗，2022年4月PD；2022年4月至10月接受二线化疗联合PD-1抑制剂，后PD；2022年11月至2023年4月接受安罗替尼，后PD；2023年4月开始达拉非尼联合曲美替尼，2024年2月疗效评价PR。",
    biomarkers: "BRAF 15号外显子V600E突变；检测平台、标本来源及突变丰度未记录。",
    decision_points: "初诊后的分子检测与一线方案选择；一线进展后的二线治疗；多线进展后依据BRAF V600E突变选择达拉非尼联合曲美替尼。",
    adverse_events: "二线治疗第4、第6周期出现III-IV度骨髓抑制，因此暂停化疗。",
    evidence_notes: `脱敏连接测试病例；部分药物剂量、检测平台和标本来源未记录。上传文档解析文本长度：${parsedTextLength}`
  };

  return {
    production_variables,
    ...production_variables
  };
}
