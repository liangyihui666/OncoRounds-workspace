// Deterministic shape repair only. No question text, answer, or count is fabricated.
function parseQuestionContract(value) {
  let raw=typeof value==='string'?value:JSON.stringify(value),parsed;
  const warnings=[];
  try {
    if(typeof raw!=='string'||!raw.trim())throw new Error('候选为空');
    parsed=JSON.parse(raw);
    // Walk the original JSON, because JSON.parse silently discards duplicate keys.
    let p=0;
    const ws=()=>{while(/\s/.test(raw[p]||'')&&p<raw.length)p++;};
    function str(){const start=p++;while(p<raw.length){if(raw[p]==='\\'){p+=2;continue;}if(raw[p++]==='"')return JSON.parse(raw.slice(start,p));}throw new Error('字符串未闭合');}
    function visit(at){ws();if(raw[p]==='{'){p++;ws();const seen=new Set();if(raw[p]==='}'){p++;return;}while(p<raw.length){ws();const key=str();if(seen.has(key))throw new Error('重复键：'+at+'.'+key);seen.add(key);ws();p++;visit(at+'.'+key);ws();if(raw[p++]==='}')return;}}
      else if(raw[p]==='['){p++;ws();let n=0;if(raw[p]===']'){p++;return;}while(p<raw.length){visit(at+'['+(n++)+']');ws();if(raw[p++]===']')return;}}
      else if(raw[p]==='"')str();else{while(p<raw.length&&!/[,\]}\s]/.test(raw[p]))p++;}}
    visit('$');
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('候选根值必须是JSON对象');
    const roots=['schema_version','generation_status','case_summary','question_count','difficulty','missing_information','risk_message','questions'];
    const extra=Object.keys(parsed).filter(k=>!roots.includes(k));
    if(extra.length){
      if(extra.some(k=>!/^Q[1-5]$/.test(k)))throw new Error('根对象出现未定义字段：'+extra.join('、'));
      if(!Array.isArray(parsed.questions))throw new Error('questions必须是数组');
      const merged=parsed.questions.slice(),ids=new Set(merged.map(q=>q?.id));
      if(ids.size!==merged.length)throw new Error('题号重复，不能自动归位');
      for(const key of extra){const q=parsed[key];if(!q||Array.isArray(q)||typeof q!=='object'||q.id!==key||ids.has(key))throw new Error('根级题目冲突：'+key);ids.add(key);merged.push(q);}
      if(parsed.question_count!==5||merged.length!==5||![1,2,3,4,5].every(n=>ids.has('Q'+n)))throw new Error('仅在Q1至Q5齐全且唯一时允许结构归位');
      merged.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
      parsed={...parsed,questions:merged};for(const key of extra)delete parsed[key];
      warnings.push('QUESTION_LAYOUT_REPAIRED：将根级'+extra.join('、')+'原对象归入questions；未改题干、选项、答案或引文，仍须全部校验。');
    }
    return {parsed,raw,error:'',warnings};
  }catch(e){return {parsed:null,raw:raw||'',error:String(e.message),warnings};}
}
