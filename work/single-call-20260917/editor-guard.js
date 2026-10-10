function applyEditorialEdits(selected, agentReply, report) {
  const audit = {scope:'wording_only_not_medical_revalidation',applied:[],rejected:[]};
  report.editorial = audit;
  let reply;
  try {
    reply=agentReply;
    for(let i=0;i<4&&typeof reply==='string';i++)reply=JSON.parse(reply.replace(/^\uFEFF/,'').replace(/^```(?:json)?\s*|\s*```$/g,'').trim());
  } catch(_) { return selected; }
  if(!Array.isArray(reply?.edits))return selected;
  const byId=new Map(selected.map(c=>[c.candidate_id,c]));
  const seen=new Set();
  const proposals=new Map();
  const limits={question:160,explain:160,keyPoint:70};
  const tokens=s=>{
    const numbers=s.match(/[<>≤≥＜＞]?[+-]?\d+(?:\.\d+)?(?:\s*[-~～至]\s*\d+(?:\.\d+)?)?\s*(?:%|％|级|年|月|周|天|日|周期|mg|g|mm|cm|μmol\/L|g\/L)?/g)||[];
    const latin=s.match(/[A-Za-z][A-Za-z0-9+_/-]*/g)||[];
    const qualifiers=s.match(/尚未|未见|未提供|未明确|未证实|未记录|未排除|不详|阴性|阳性|疑似|可能|考虑|不能|不得|不应|无需|无须|必须|仅限|仅在|只在|所有|任何|均可|首选|永久|暂时|暂停|停用|停药|恢复|再挑战|推荐|建议|标准|优于|劣于|不劣于|等同|排除|证实|确诊|减量|增量/g)||[];
    return JSON.stringify([numbers.map(x=>x.replace(/\s/g,'')).sort(),latin.sort(),qualifiers.sort()]);
  };
  for(const edit of reply.edits){
    const id=edit?.candidate_id;
    if(!byId.has(id)||seen.has(id)||!edit||typeof edit!=='object'||Array.isArray(edit)){
      audit.rejected.push({candidate_id:id||'',reason:'UNKNOWN_OR_DUPLICATE_ID'});continue;
    }
    seen.add(id);
    if(Object.keys(edit).some(k=>k!=='candidate_id'&&!Object.hasOwn(limits,k))){
      audit.rejected.push({candidate_id:id,reason:'FORBIDDEN_FIELD'});continue;
    }
    const changes={};const original=byId.get(id).question;
    for(const key of Object.keys(limits)){
      if(!Object.hasOwn(edit,key))continue;
      const value=edit[key];const old=original[key];
      if(typeof value!=='string'||!value.trim()||value.length>limits[key]||value.length<old.length*0.65||tokens(value)!==tokens(old)||/https?:\/\/|\{\{|<script/i.test(value)){
        audit.rejected.push({candidate_id:id,field:key,reason:'LENGTH_OR_PROTECTED_FACT_CHANGED'});continue;
      }
      if(value!==old){changes[key]=value;audit.applied.push({candidate_id:id,field:key,before:old,after:value});}
    }
    proposals.set(id,changes);
  }
  return selected.map(c=>({...c,question:{...c.question,...(proposals.get(c.candidate_id)||{})}}));
}
