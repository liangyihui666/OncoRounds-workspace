// Internal model output only. Render labels, never supply missing medical content.
function normalizeExplanations(candidate) {
  if (!candidate || !Array.isArray(candidate.questions)) return candidate;
  return {...candidate, questions:candidate.questions.map(q=>{
    if (!q || typeof q!=='object' || Array.isArray(q)) return q;
    const e=q.explain, letters=['A','B','C','D'];
    if (!e || typeof e!=='object' || Array.isArray(e)) return q;
    if (Object.keys(e).length!==4 || !letters.every(k=>Object.prototype.hasOwnProperty.call(e,k))) return q;
    if (!Number.isInteger(q.answer) || q.answer<0 || q.answer>3) return q;
    if (!letters.every(k=>typeof e[k]==='string' && e[k].trim() && !/[\r\n]/.test(e[k]) && !/^[A-D]\s*[｜|：:]|^(?:不正确|正确)\s*[：:]/.test(e[k].trim()))) return q;
    return {...q, explain:letters.map((k,i)=>k+'｜'+(i===q.answer?'正确':'不正确')+'：'+e[k].trim()).join('\n')};
  })};
}
