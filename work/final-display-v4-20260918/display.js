function unwrapDisplay(value) {
  for(let i=0;i<4&&typeof value==='string';i++){
    const s=value.replace(/^\uFEFF/,'').trim();
    if(!/^[\[{"]/.test(s))break;
    try{value=JSON.parse(s);}catch(_){break;}
  }
  return value;
}
function normalizeCaseText(value) {
  value=unwrapDisplay(value);
  if(Array.isArray(value))return value.map(normalizeCaseText).filter(Boolean).join('\n');
  if(value&&typeof value==='object'){
    const date=value.date||value.timepoint||value.time||'';
    const body=value.detail||value.description||value.event||value.value||value.text||'';
    return [date,value.title,body].filter(v=>typeof v==='string'&&v.trim()).join('：');
  }
  return typeof value==='string'?value.trim():'';
}
function timelineEntries(value) {
  const source=normalizeCaseText(value);
  // Split sentence-list and arrow formats only at explicit dates/stages. Semicolons inside an event stay with that event.
  const start='(?:(?:19|20)\\d{2}[年.\\/-]|初诊时|入院时|术前|术后|治疗期|出院后|随访时|复发时)';
  const delimited=source.replace(new RegExp('(?:[；;]|\\s*(?:->|→)\\s*|[，,])\\s*(?='+start+')','g'),'\n');
  const exactDate='(?:19|20)\\d{2}(?:(?:年\\s*\\d{1,2}月?(?:\\s*\\d{1,2}日?)?)|(?:[.\\/-]\\d{1,2}(?:[.\\/-]\\d{1,2})?))?';
  const datePattern=new RegExp('^('+exactDate+'(?:\\s*(?:至|到|—|–|~|～|-)\\s*'+exactDate+')?)\\s*[：:]?\\s*');
  const stagePattern=/^((?:初诊|就诊|入院|出院|术前|术后|治疗|随访|复发|进展)(?:前|后|时|期|阶段)?(?:\s*[一二三四五六七八九十半\d]+\s*(?:个?月|年|周|天|日|周期)(?:后|前|时)?)?|第\s*[一二三四五六七八九十\d]+\s*(?:个?月|年|周|天|周期))\s*[：:]/;
  return delimited.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map((text,i)=>{
    const match=text.match(datePattern)||text.match(stagePattern);
    return {source_id:'E'+(i+1),date:match?match[1].trim():'时间未详',detail:match?text.slice(match[0].length).trim()||text:text};
  });
}
function buildDisplayTimeline(value, reply) {
  reply=unwrapDisplay(reply);
  const edits=Array.isArray(reply?.timeline_edits)?reply.timeline_edits:[];
  const unique=new Map();const dup=new Set();
  for(const e of edits){if(unique.has(e?.source_id))dup.add(e.source_id);else unique.set(e?.source_id,e);}
  const tokens=s=>JSON.stringify((s.match(/[A-Za-z][A-Za-z0-9+_/-]*|[<>≤≥＜＞]?\d+(?:\.\d+)?%?|未见|未明确|未提供|未证实|阴性|阳性|疑似|可能|考虑|尚未|计划|拟行|暂停|停药|不敏感/g)||[]).sort());
  const titleFor=s=>/病理|穿刺|活检/.test(s)?'病理与检测':/手术|切除|清扫|保乳/.test(s)?'手术治疗':/化疗|放疗|靶向|免疫治疗/.test(s)?'治疗经过':/PET|CT|MRI|复查|评估/.test(s)?'检查与复评':/随访/.test(s)?'随访记录':'病情记录';
  const result=[];
  for(const event of timelineEntries(value)){
    const e=unique.get(event.source_id);
    const proposed=typeof e?.detail==='string'?e.detail.trim():'';
    const safe=proposed&&proposed.length<=90&&!dup.has(event.source_id)&&tokens(proposed)===tokens(event.detail)&&!/https?:|<script|……/.test(proposed)&&!Object.keys(e).some(k=>!['source_id','title','detail'].includes(k));
    const detail=safe?proposed:event.detail;
    // Long fallback events become separate complete clauses; no mid-sentence truncation.
    const clauses=detail.length>90?detail.split(/(?<=[。；;])/).filter(s=>s.trim()):[detail];
    let chunks=[],buffer='';
    for(const c of clauses){if(buffer&&buffer.length+c.length>90){chunks.push(buffer);buffer='';}buffer+=c;}
    if(buffer)chunks.push(buffer);
    const proposedTitle=typeof e?.title==='string'?e.title.trim():'';
    const title=safe&&proposedTitle.length>=2&&proposedTitle.length<=12&&!/首选|推荐|必须|治愈|成功|[\[\]{}]/.test(proposedTitle)&&!(proposedTitle.match(/[A-Za-z][A-Za-z0-9+_/-]*|\d+/g)||[]).some(t=>!event.detail.includes(t))?proposedTitle:titleFor(event.detail);
    chunks.forEach((text,i)=>result.push({date:event.date,title:chunks.length>1?title+'（'+(i+1)+'）':title,detail:text.trim()}));
  }
  return result;
}
