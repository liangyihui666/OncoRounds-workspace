function main({adverse_events,fallback_json}) {
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const full=typeof adverse_events==='string'?adverse_events:JSON.stringify(adverse_events||'');
  const segments=full.split(/\r?\n/).flatMap(line=>/[｜|]/.test(line)?[line]:line.split(/[；;]/)).map(clean).filter(Boolean);
  const patterns=[
    /高血氨(?:性)?脑病|高血氨|意识障碍|嗜睡|脑病|血氨/ig,
    /中毒性表皮坏死松解症|毒性表皮坏死松解症|Stevens[- ]?Johnson|\bTEN\b|\bSJS\b|皮疹|皮炎/ig,
    /\bDIC\b|弥散性血管内凝血|凝血异常/ig,
    /糖尿病酮症酸中毒|\bDKA\b|1型糖尿病/ig,
    /间质性肺炎|免疫相关肺炎|肺炎|pneumonitis/ig,
    /心肌炎|myocarditis/ig,
    /肝炎|肝损伤|hepatitis/ig,
    /结肠炎|colitis/ig,
    /垂体炎|甲状腺功能异常|肾上腺功能不全/ig,
    /肾炎|肾损伤|胰腺炎/ig,
    /重症肌无力|肌炎|脑炎|神经病变/ig,
    /血小板减少|血小板[ⅠⅡⅢⅣIVX\d一二三四]*度降低|中性粒细胞减少|溶血性贫血/ig,
    /关节炎|腹泻|恶心|呕吐/ig
  ];
  function gradeOf(text){
    if(/未明示|未提供|未记载|不详/.test(text))return null;
    const matches=[...text.matchAll(/(?:\bG(?:rade)?\s*([1-5])\b|([1-5])\s*[级度])/gi)];
    return matches.length?Math.max(...matches.map(m=>Number(m[1]||m[2]))):null;
  }
  function drugOf(text,parts){
    // Structured drug field is authoritative for this event; never use the whole case's class.
    if(parts.length>=5 && parts[1])return parts[1];
    const found=text.match(/5[-‐]?FU|m?FOLFOX\d*|FOLFIRI|FOLFOXIRI|氟尿嘧啶|卡培他滨|[\u4e00-\u9fa5]{2,8}单抗|[\u4e00-\u9fa5]{2,8}替尼|\bICI\b|PD-?1|PD-?L1|CTLA-?4|CAR[- ]?T|化疗|靶向治疗|免疫治疗/gi)||[];
    return [...new Set(found)].join(' ')||'治疗类别未记载';
  }
  const found=[],unresolved=[];
  for(const [order,source_text]of segments.entries()){
    if(/^(?:无|未见|未发生|未提供|未记录|不详)(?:明显|严重|治疗相关|免疫相关|不良事件|不良反应|毒性|irAE)*[。！!]?$/i.test(source_text))continue;
    if(/无第二(?:项|个)?(?:严重)?不良反应/.test(source_text))continue;
    const parts=source_text.split(/[｜|]/).map(clean);
    const eventText=parts.length>=5?parts[2]:source_text;
    if(/^(?:无|未见|未发生|已排除)/.test(eventText))continue;
    const drug=drugOf(source_text,parts);
    const labels=[];let domain=-1;
    for(const [index,pattern]of patterns.entries()){
      const matches=eventText.match(pattern)||[];
      if(matches.length&&domain<0)domain=index;
      labels.push(...matches);
    }
    // A recorded blood-ammonia test anchors neurological symptoms without inventing a diagnosis.
    if(domain===0 && /血氨/.test(source_text)&&!labels.some(x=>/血氨/.test(x)))labels.push('血氨');
    if(!labels.length){unresolved.push({source_text,missing:['event_name']});continue;}
    if(/\bDIC\b/.test(source_text)&&!labels.includes('DIC'))labels.push('DIC');
    const event_name=(/疑似|考虑|推测|待排/.test(source_text)?'疑似 ':'')+[...new Set(labels)].slice(0,5).join(' ');
    const grade_value=gradeOf(parts.length>=5?parts[3]:source_text);
    const critical=/意识障碍|嗜睡|休克|危及生命|严重急性|\bDIC\b|酮症酸中毒|\bDKA\b|\bTEN\b|\bSJS\b/i.test(eventText+' '+(parts[3]||''));
    const priority=Math.max(grade_value||0,critical?3.5:0); // retrieval urgency, never an inferred CTCAE grade
    const treatment_key=drug.replace(/（[^）]*）|\([^)]*\)/g,'').toLowerCase();
    const key=treatment_key+'|'+domain;
    const item={key,event_name,grade:grade_value===null?'分级未提供':'G'+grade_value,grade_value,grade_status:grade_value===null?'not_provided':'source_recorded',source_text,order,drug,treatment_key,domain,priority};
    const old=found.find(x=>x.key===key);
    if(!old)found.push(item);else if(item.priority>old.priority)Object.assign(old,item);
  }
  let fallback={};try{fallback=typeof fallback_json==='string'?JSON.parse(fallback_json):fallback_json||{};}catch(_){}
  let fallbackApplied=false;
  for(const raw of [fallback.anchor_a,fallback.anchor_b]){
    const match=clean(raw).match(/^(G[1-5]|分级未提供)[｜|](.+)$/i);
    if(!match)continue;
    const event_name=clean(match[2]);
    const source=unresolved.find(x=>x.source_text.includes(event_name));
    if(!source)continue;
    const parts=source.source_text.split(/[｜|]/).map(clean),grade_value=gradeOf(parts.length>=5?parts[3]:source.source_text);
    if(match[1]!=='分级未提供'&&Number(match[1].slice(1))!==grade_value)continue;
    if(/^(?:无|未见|未发生|已排除)/.test(parts.length>=5?parts[2]:source.source_text))continue;
    const drug=drugOf(source.source_text,parts);
    found.push({event_name,grade:grade_value===null?'分级未提供':'G'+grade_value,grade_value,source_text:source.source_text,order:segments.indexOf(source.source_text),drug,treatment_key:drug,priority:grade_value||0,domain:99});fallbackApplied=true;
  }
  found.sort((a,b)=>b.priority-a.priority||a.order-b.order);
  const selected=found.slice(0,1);
  // Do not let several manifestations of one drug suppress another serious treatment event.
  const second=found.slice(1).find(x=>x.priority>=3&&x.treatment_key!==selected[0]?.treatment_key)||found[1];
  if(second)selected.push(second);
  function query(anchor){
    if(!anchor)return '';
    const related=found.filter(x=>x!==anchor&&x.treatment_key===anchor.treatment_key&&!selected.includes(x)&&x.priority>=3);
    const names=[anchor.event_name,...related.map(x=>x.event_name)].join(' ');
    const text=anchor.drug+' '+names+' '+anchor.grade+' 毒性识别 鉴别诊断 暂缓停药 再治疗条件 支持处理 正式指南';
    if(text.length>480)throw new Error('毒性查询超长，请核对事件字段');
    return text;
  }
  const needs_fallback=unresolved.length>0&&!fallbackApplied;
  return {anchor_a:selected[0]?selected[0].grade+'｜'+selected[0].event_name:'',anchor_b:selected[1]?selected[1].grade+'｜'+selected[1].event_name:'',
    query_a:query(selected[0]),query_b:query(selected[1]),has_a:!!selected[0],has_b:!!selected[1],anchor_a_detail:selected[0]||null,anchor_b_detail:selected[1]||null,
    needs_fallback,fallback_applied:fallbackApplied,unresolved_segments:unresolved,omitted_event_count:Math.max(0,found.length-selected.length),fallback_max_calls:1,
    fallback_input:needs_fallback?full:'',fallback_system_prompt:'只复制原文不良事件名与明示分级，不推断分级或归因。',fallback_output_schema:'{"anchor_a":"","anchor_b":"","has_a":false,"has_b":false}',no_second_event_is_valid:!needs_fallback&&selected.length<2};
}
