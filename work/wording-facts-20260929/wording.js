// Normalize only known question-ending boilerplate; preserve all clinical context and choices.
function normalizeQuestionWording(candidate) {
  if(!candidate||!Array.isArray(candidate.questions))return candidate;
  return {...candidate,questions:candidate.questions.map(q=>{
    if(!q||typeof q.question!=='string')return q;
    const question=q.question.replace(/(?:以下|下列)哪项(?:最符合|符合)(?:当前|现行|最新)?(?:指南(?:的)?(?:推荐|建议|要求)?|共识(?:的)?(?:推荐|建议|要求)?|规范|临床逻辑|当前管理原则|治疗前回顾要求)[？?]$/, '以下哪项正确？');
    return question===q.question?q:{...q,question};
  })};
}
