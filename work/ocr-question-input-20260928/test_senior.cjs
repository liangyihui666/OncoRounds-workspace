const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const d=read('outputs/高年资医生出题-20260928/题目生成-OCR直连-高年资医生版.json');
const old=read('outputs/OCR衔接出题-20260928/题目生成-OCR直连-时间阶段文案修订版.json');
const results=[];function test(name,fn){fn();results.push({name,pass:true});}
const ids=['sR35QbYF2xamDQR3','x5dghEdUbp0QQg4T','v12RevisionGenerator','v12ValidatorR2'];
test('四个生成审核节点均采用高年资标准并保留时间阶段规则',()=>{for(const id of ids){const n=d.nodes.find(n=>n.nodeId===id);const p=n.inputs.find(i=>i.key==='systemPrompt').value;assert(p.includes('【高年资肿瘤专科医生的进阶标准】'));assert(p.includes('【学员可见的时间与诊疗阶段】'));assert(!p.includes('尊重三组教学侧重'));}});
test('模型、代码、检索配置及连线不变',()=>{assert.deepEqual(d.edges,old.edges);assert.deepEqual(d.chatConfig,old.chatConfig);for(const n of d.nodes){const o=old.nodes.find(x=>x.nodeId===n.nodeId);const c=structuredClone(n);for(const i of c.inputs||[]){if(ids.includes(n.nodeId)&&i.key==='systemPrompt')i.value=o.inputs.find(x=>x.key===i.key).value;if(['lUxTeIqSf0zHu2BL','v12RevisionInput'].includes(n.nodeId)&&i.key==='system_textareaInput')i.value=o.inputs.find(x=>x.key===i.key).value;}assert.deepEqual(c,o);}});
for(const id of ['v11ReviewMerge','v12ReviewMergeR2']){
 const node=d.nodes.find(n=>n.nodeId===id);const main=vm.runInNewContext(node.inputs.find(i=>i.key==='code').value+'\nmain');
 const review={decision:'REVISE',score:90,fatal_errors:[],question_checks:[{id:'Q1',passed:false,problems:['无需病例即可排除三个选项'],revision:'基于已有条件重构竞争方案'},{id:'Q2',passed:true,problems:[],revision:''}],repair_tasks:[{target_ids:['Q1'],code:'DIFFICULTY_TOO_LOW',fields:['question','options','answer','answer_text','explain','keyPoint'],message:'按已有事实重构方案取舍'}],recommended_revision_mode:'PATCH',revision_instruction:'只修订Q1',missing_information:[],general_feedback:'Q1难度不足'};
 const args={structure_decision:'PASS',structure_errors:[],structure_warnings:[],medical_auditable:true,mechanical_revision_mode:'',mechanical_repair_tasks:[],candidate_internal_json:JSON.stringify({questions:[{id:'Q1'},{id:'Q2'}]}),review_text:JSON.stringify(review),patch_merge_decision:'PASS',patch_merge_errors:[]};
 test(node.name+'：难度问题进入修订并保留通过题',()=>{const r=main(args);assert.equal(r.decision,'REVISE');assert.equal(r.publishable,false);assert(r.repair_tasks.some(t=>t.code==='DIFFICULTY_TOO_LOW'&&t.target_ids.includes('Q1')));assert(r.preserve_ids.includes('Q2'));});
 test(node.name+'：高分或错误PASS不能覆盖难度失败',()=>{const r=main({...args,review_text:JSON.stringify({...review,decision:'PASS',score:100})});assert.equal(r.decision,'REVISE');assert.equal(r.publishable,false);});
}
fs.writeFileSync(path.join(root,'outputs/高年资医生出题-20260928/离线检查报告.json'),JSON.stringify({offline:true,model_execution:false,checks:results},null,2));
console.log(results.length+' checks passed; no online/model evaluation performed.');
