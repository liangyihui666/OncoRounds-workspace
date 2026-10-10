const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const source='outputs/上传版证据范围修复-20260929/01-出题子应用-Flash证据范围修复版.json';
const dir='outputs/选项重复与答案布局修复-20260929';fs.mkdirSync(dir,{recursive:true});
const base=JSON.parse(fs.readFileSync(source,'utf8')),w=structuredClone(base),helper=fs.readFileSync(path.join(__dirname,'options.js'),'utf8');
const get=(id,key)=>w.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key===key);
const once=(s,a,b)=>{assert.equal(s.split(a).length,2,a);return s.replace(a,b);};
const planCode=helper.slice(0,helper.indexOf('function optionVarietyReview'));
const reviewCode=helper.slice(helper.indexOf('function optionVarietyReview'));
const packet=w.nodes.find(n=>n.nodeId==='v12CasePacket');
get(packet.nodeId,'code').value=planCode+'\n'+once(get(packet.nodeId,'code').value,'case_packet: packet,','case_packet: packet,\n    answer_position_plan_json: JSON.stringify(answerPositionPlan(packet)),');
packet.outputs.push({id:'answerPositionPlanJson',key:'answer_position_plan_json',type:'dynamic',valueType:'string',valueDesc:'',label:'首次出题答案位置计划',description:'仅用于生成前布局，不重排已经生成的选项'});
get('lUxTeIqSf0zHu2BL','system_textareaInput').value+='\n\n【首次出题答案位置计划：0=A、1=B、2=C、3=D】\n{{$v12CasePacket.answerPositionPlanJson$}}';
let prompt=get('sR35QbYF2xamDQR3','systemPrompt').value;
prompt=once(prompt,'题干自然询问',`选项构造：首次写题采用输入answer_position_plan的Q1至Q5位置，先决定有证据的正确措施，再在预分配位置撰写该项；其他三项围绕同一决策，从时机、适用条件、治疗意图、强度或证据外推边界中选择实际相关差异。差异必须有来源，不能生造剂量。不要每题都用“无需检查、忽略结果、所有人必须、只做支持治疗”充数。相同医学术语可复用，但正确项反复表达同一个原则时应换考点，不只换病名、时点或同义词。四项篇幅和具体程度接近，不让正确项总是最全面的长句。\n\n题干自然询问`);
prompt=once(prompt,'四项表述层次接近，首次构思选项时让五题正确位置覆盖至少3个位置，不默认全A。','四项表述层次接近，首轮按输入位置计划构思完整选项；未收到计划时正确位置至少覆盖3种。');
get('sR35QbYF2xamDQR3','systemPrompt').value=prompt;
const oldCommon=base.nodes.find(n=>n.nodeId==='sR35QbYF2xamDQR3').inputs.find(i=>i.key==='systemPrompt').value;
let revision=once(get('v12RevisionGenerator','systemPrompt').value,oldCommon,prompt);
revision=once(revision,'先看case_constraints的原句',`先检查option_variety_review列出的具体题号、选项、近似正确项和重复干扰模板。近似不是判错：保留必要医学术语，核对是不是同一决策被重复考；是则整题换考点。干扰项靠极端措辞即可排除时，结合本题证据重写竞争措施及四条解析。答案集中时优先重写原本内容不合格题；禁止只调换合格题选项位置。已有合格题保持原顺序，不强制套回首轮位置计划。\n先看case_constraints的原句`);
get('v12RevisionGenerator','systemPrompt').value=revision;
let r=get('v12RevisionInput','code').value;
r=helper+'\n'+once(r,'review_all_questions:true,','review_all_questions:true,answer_position_plan:answerPositionPlan(casePacket),option_variety_review:optionVarietyReview(questions),');
get('v12RevisionInput','code').value=r;
for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2']){
 let c=get(id,'code').value;
 c=reviewCode+'\n'+once(c,'  // Warning-only: the independent reviewer decides whether the wording leaks the answer.',`  const variety = optionVarietyReview(questions);
  for(const pair of variety.similar_option_pairs) warnings.push('OPTION_REUSE '+pair.left.question_id+pair.left.option+'/'+pair.right.question_id+pair.right.option+'：选项文本重复或近似，复核是否重复考同一决策；不得仅替换同义词');
  for(const family of variety.recurring_templates) warnings.push('DISTRACTOR_TEMPLATE '+family.code+'：'+family.occurrences.map(x=>x.question_id+x.option).join('、')+'；复核是否依赖同类极端或空泛干扰项');
  // Warning-only: medical correctness requires the bound evidence and clinical context.`);
 get(id,'code').value=c;
}
get('v12FinalPublicationNormalize','code').value=once(get('v12FinalPublicationNormalize','code').value,'20260929-source-scope-five','20260929-option-variety-five');
assert.deepEqual(w.edges,base.edges);const changed=w.nodes.filter((n,i)=>JSON.stringify(n)!==JSON.stringify(base.nodes[i]));assert.equal(changed.length,8);
const file=path.join(dir,'01-出题子应用-Flash选项去重复版.json');fs.writeFileSync(file,JSON.stringify(w,null,2));
for(const n of changed){const key=n.inputs.some(i=>i.key==='code')?'code':n.inputs.some(i=>i.key==='systemPrompt')?'systemPrompt':'system_textareaInput';fs.writeFileSync(path.join(dir,n.name+(key==='code'?'-代码.js':'-提示词.txt')),n.inputs.find(i=>i.key===key).value);}
fs.writeFileSync(path.join(dir,'修改记录.json'),JSON.stringify({source,revision:'20260929-option-variety-five',changed_nodes:changed.map(n=>({id:n.nodeId,name:n.name})),nodes:w.nodes.length,edges:w.edges.length,first_draft_answer_plan:true,program_answer_shuffle:false,public_schema_changed:false,models_unchanged:true,retrieval_unchanged:true,online_run:false},null,2));console.log(file);
