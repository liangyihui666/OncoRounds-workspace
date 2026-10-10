const fs=require('fs'),assert=require('assert/strict'),vm=require('vm');
const dir='outputs/解析内病例对照-不增字段-20261008';fs.mkdirSync(dir,{recursive:true});
const source='C:/Users/admin/.codex/attachments/ee08e3f4-ba8a-4c91-bab7-23c021a21be7/已粘贴的文本.txt';
const outerSource='outputs/OCR文本清洗-完整工作流-20261008/OCR文本清洗与五题生成-完整工作流.json';
const original=JSON.parse(fs.readFileSync(source)),child=structuredClone(original),outer=JSON.parse(fs.readFileSync(outerSource));
const prompt=`
解析中的病例对照
保持原14字段协议，不新增after_answer或其他字段。仅在已有explain中说明病例实际经过与本题参考答案的关系。
有与本题直接相关且可回溯的实际处理、药物或结局时，在正确选项的解析开头简要写“原病例实际……；本题依据所引证据……”，随后解释该项成立的条件；其余三个选项照常逐项解析。可写多句，但同一项不换行，总长仍不超过160字。不必每题重复整段病史；无对应实际经过或无明确可比较差异时，正常解析，不强行加“原文未记载”或对照模板。
病例实际用药及结局只来自case_source_text或可回溯病例事实；不能把拟讨论方案、专家意见、引用研究队列或假设条件写成实际经过。病例原句可放入已有verification.case_facts核对，总数仍1至3条，不新增核对字段；原文已有时以原文为准。后续结局只在答后解析说明，不能反向证明此前方案正确或提前泄露到题干。
若原病例采用旧药/旧方案，而本题引用的现行证据支持另一方案，可说明“原病例实际采用……；按本题所引……版本证据，在满足……条件时可考虑……”。明确区分病例事实和当前教学判断，不把个案做法等同标准答案，不把本题推荐写成患者后来实际换了药。缺少人群、阶段、适应证或必要条件时，不能笼统称新药已替代旧药。
只有检索到的绑定证据明确记载推荐变更，且版本/时间与比较内容确实支持时，才可写“指南更新后……”。仅有新版日期、药物较新或模型记忆不证明更新。未有历史推荐证据时只说“按本题所引证据”，不宣称过去指南推荐相反。原文未记载差异原因时不能猜测团队因指南更新、费用、药物可及性或患者意愿而改变治疗；若本题确需解释差异，注明“原文未说明差异原因”，再说明证据适用边界。
第二轮逐题检查这些表述；删除没有出处的对照和更新原因，保留证据支持的正常解析。字段或原句匹配通过不表示医学比较结论通过。
`;
for(const id of ['sR35QbYF2xamDQR3','v12RevisionGenerator']){
 const p=child.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='systemPrompt');
 assert(p.value.includes('每项一句完整支持或排除理由'));
 p.value=p.value.replace('每项一句完整支持或排除理由','每项提供完整支持或排除理由，可含简短病例对照与多句说明')+prompt;
}
for(const [name,w] of [['01-五题出题子应用-完整工作流.json',child],['02-OCR清洗与五题生成-完整工作流.json',outer]]){for(const n of w.nodes)for(const i of n.inputs)if(i.key==='code')new vm.Script(i.value);fs.writeFileSync(dir+'/'+name,JSON.stringify(w,null,2));}
fs.writeFileSync(dir+'/修改记录.json',JSON.stringify({source,outerSource,changed_nodes:['题目生成-首轮.systemPrompt','题目修订-第二轮.systemPrompt'],new_fields:[],internal_question_fields:14,programs_unchanged:true,outer_unchanged:true,frontend_unchanged:true,api_calls:0,medical_review_status:'not_performed'},null,2));
// Reuse the offline five-question harness, replacing the obsolete extra-field assertions.
let test=fs.readFileSync(__dirname+'/test.cjs','utf8');
const fixtureStart=test.indexOf('const empty='),fixtureEnd=test.indexOf('const checks=[]');
let fixture=test.slice(fixtureStart,fixtureEnd);
fixture=fixture.replace(',after_answer:after()','');
const checks=[];const check=(name,f)=>{try{f();checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:e.message});}};
const code=(w,id)=>w.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='code').value;
const fn=(w,id)=>vm.runInNewContext(code(w,id)+'\nmain');
const getFixture=new Function(fixture+'\nreturn {draft,packet,pool};');
const {draft,packet,pool}=getFixture();
check('仅两轮提示词改变，模型/检索/程序/图/外层保持原版本',()=>{
 assert.deepEqual(child.edges,original.edges);assert.deepEqual(child.chatConfig,original.chatConfig);
 for(const n of child.nodes){const prev=original.nodes.find(p=>p.nodeId===n.nodeId);if(!['sR35QbYF2xamDQR3','v12RevisionGenerator'].includes(n.nodeId))assert.deepEqual(n,prev);else assert.deepEqual(n.inputs.filter(i=>i.key!=='systemPrompt'),prev.inputs.filter(i=>i.key!=='systemPrompt'));}
 assert.deepEqual(outer,JSON.parse(fs.readFileSync(outerSource)));
 assert(!JSON.stringify(child).includes('"after_answer"')); // Prompt mentions the prohibited field, no schema/output adds it.
});
check('内部仍为14字段，公开输出没有新增字段',()=>{
 const d=draft();assert.equal(Object.keys(d.questions[0]).length,14);
 const a=fn(child,'v12AssemblyR2')({candidate_json:JSON.stringify(d),evidence_pool:pool,case_packet:packet});assert.equal(a.structure_decision,'PASS',JSON.stringify(a.structure_errors));
 const q=JSON.parse(a.candidate_json_passthrough).questions[0];assert(!('after_answer' in q));assert.equal(q.explain.split('\n').length,4);
});
check('病例对照加多句解析完整保留到最终五题字母答案输出',()=>{
 const d=draft();d.questions[0].explain.A='原病例实际接受测试方案；本题依据测试证据判断适用条件。条件满足时该项成立。';
 for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2']){const a=fn(child,id)({candidate_json:JSON.stringify(d),evidence_pool:pool,case_packet:packet});assert.equal(a.structure_decision,'PASS',JSON.stringify(a.structure_errors));}
 const a=fn(child,'v12AssemblyR2')({candidate_json:JSON.stringify(d),evidence_pool:pool,case_packet:packet});
 const f=fn(child,'v12FinalPublicationNormalize')({candidate_json:a.candidate_json_passthrough,structure_decision:a.structure_decision,structure_errors:a.structure_errors,structure_warnings:a.structure_warnings,cited_evidence:a.cited_evidence_json,evidence_pool:pool,evidence_verification:a.evidence_verification,case_id:'TEST',second_cancer_type:'直肠癌',second_round_raw:JSON.stringify(d)});
 assert.equal(f.output_ready,true);assert.equal(f.publishable,false);
 const p=fn(outer,'bJcPjyWI8hiwuVOS')({group1:f.publication_payload_json,case_packet:packet}).candidate_pool;assert.equal(p.candidate_count,5);
 const r=fn(outer,'jKqMCN8eJKvkngnI')({...packet,candidate_pool:p,difficulty:'进阶',second_cancer_type:'直肠癌'});
 const q=JSON.parse(r.response_json).Questions.questions;assert.equal(q.length,5);assert(q[0].explain.startsWith('A｜正确：'+d.questions[0].explain.A));assert(q.every(x=>!('after_answer' in x)&&x.options[x.answer]===x.answer_text));
});
check('正常解析无需病例对照，错误答案/重复选项/假引文仍拦截',()=>{
 for(const edit of [d=>d.questions[0].answer_text='错',d=>d.questions[0].options[1]=d.questions[0].options[0],d=>d.questions[0].verification.quotes.A=['这段证据从未出现在原文里']]){const d=draft();edit(d);const a=fn(child,'v12AssemblyR2')({candidate_json:JSON.stringify(d),evidence_pool:pool,case_packet:packet});assert.equal(a.structure_decision,'FAIL');}
});
fs.writeFileSync(dir+'/离线检查结果.json',JSON.stringify({checks,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,api_calls:0,online_verified:false,medical_review_status:'not_performed'},null,2));
console.log(JSON.stringify({dir,checks},null,2));if(checks.some(c=>!c.pass))process.exitCode=1;
