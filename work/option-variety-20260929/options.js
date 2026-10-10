// Plans apply before drafting. This code never reorders or rewrites completed options.
function answerPositionPlan(packet) {
  const key=[packet?.case_id,packet?.case_title,packet?.disease].filter(v=>typeof v==='string').join('|');
  let seed=2166136261;
  for(let i=0;i<key.length;i++){seed^=key.charCodeAt(i);seed=Math.imul(seed,16777619)>>>0;}
  const positions=[0,1,2,3];let state=seed||1;
  for(let i=3;i>0;i--){state^=state<<13;state^=state>>>17;state^=state<<5;state>>>=0;const j=state%(i+1);const t=positions[i];positions[i]=positions[j];positions[j]=t;}
  positions.push(positions[seed%3]);
  return {scope:'initial_drafting_layout_not_answer_shuffle',assignments:positions.map((answer,i)=>({id:'Q'+(i+1),answer,letter:'ABCD'[answer]})),instruction:'首轮首次构思时按此位置写正确项及其余三个有临床迷惑性的选项，再写对应解析；第二轮保留内容合格题顺序，仅重写/补写时参考空缺位置。位置计划不代表医学答案，禁止改变事实或扭曲正确性去凑位置。'};
}
function optionVarietyReview(questions) {
  const qs=Array.isArray(questions)?questions:[],entries=[],counts=[0,0,0,0];
  const normalize=s=>s.replace(/[\s，。；：、！？!?;:（）()【】\[\]“”"'‘’]/g,'').toLowerCase();
  for(let i=0;i<qs.length;i++){
    const q=qs[i];if(!q||typeof q!=='object')continue;
    const options=Array.isArray(q.options)?q.options:['A','B','C','D'].map(k=>q.options?.[k]);
    const answer=Number.isInteger(q.answer)?q.answer:'ABCD'.indexOf(q.answer||'?');
    if(answer>=0&&answer<4)counts[answer]++;
    options.forEach((value,j)=>{if(typeof value==='string'&&value.trim())entries.push({question_id:q.id||'Q'+(i+1),question_index:i,option:'ABCD'[j],selected:j===answer,text:value,normalized:normalize(value)});});
  }
  const grams=s=>new Set(Array.from({length:Math.max(0,s.length-1)},(_,i)=>s.slice(i,i+2)));
  const similar=[];
  for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
    const a=entries[i],b=entries[j];if(a.question_index===b.question_index||Math.min(a.normalized.length,b.normalized.length)<12)continue;
    const A=grams(a.normalized),B=grams(b.normalized),intersection=[...A].filter(g=>B.has(g)).length;
    const score=2*intersection/(A.size+B.size||1);
    if(a.normalized===b.normalized||(score>=0.82&&Math.min(a.normalized.length,b.normalized.length)/Math.max(a.normalized.length,b.normalized.length)>=0.75)){
      similar.push({left:{question_id:a.question_id,option:a.option,text:a.text,selected:a.selected},right:{question_id:b.question_id,option:b.option,text:b.text,selected:b.selected},match:a.normalized===b.normalized?'exact_after_punctuation':'similar_text',similarity:Math.round(score*100)/100});
    }
  }
  const families=[
    {code:'NO_EVALUATION',pattern:/(?:无需|不必|不需|无须).{0,12}(?:检查|评估|活检|检测|复查|病理)|仅(?:凭|依赖).{0,14}(?:确诊|判断|诊断)/},
    {code:'IGNORE_INFORMATION',pattern:/忽略|直接沿用|以.{0,15}原发灶.{0,12}为准|不.{0,4}考虑.{0,8}(?:病史|既往|结果)/},
    {code:'EXTREME_ACTION',pattern:/绝对禁忌|一律|所有.{0,16}(?:必须|均应)|立即永久|必须.{0,16}(?:所有|全部)|仅行.{0,10}无需|只能.{0,10}支持治疗/}
  ];
  const recurring_templates=[];
  for(const family of families){const hits=entries.filter(e=>!e.selected&&family.pattern.test(e.text));if(new Set(hits.map(e=>e.question_index)).size>=2)recurring_templates.push({code:family.code,total_occurrences:hits.length,occurrences:hits.slice(0,8).map(e=>({question_id:e.question_id,option:e.option,text:e.text}))});}
  const repeated_correct_pairs=similar.filter(p=>p.left.selected&&p.right.selected);
  const prioritized=similar.filter(p=>p.left.selected&&p.right.selected).concat(similar.filter(p=>!(p.left.selected&&p.right.selected)));
  return {scope:'lexical_review_not_medical_verdict',answer_counts:counts,concentrated:qs.length===5&&counts.filter(n=>n>0).length<3,similar_pair_count:similar.length,similar_option_pairs:prioritized.slice(0,12),repeated_correct_pairs:repeated_correct_pairs.slice(0,10),recurring_templates,
    instruction:'近似文本和模板命中只用于定位，不代表选项错误；相同药名/术语可以复用，否定词、剂量和时点差异必须保留。若两题凭同一决策即可作答，换掉较浅题；重写空泛干扰项为同一决策的真实竞争措施，依据明确时才排除。不要仅换同义词，不自动调换合格题顺序。'};
}
