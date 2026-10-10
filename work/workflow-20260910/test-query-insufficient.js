const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..');
const dir=path.join(root,'outputs/工作流优化-检索长度与零题修正版-20260910');
const old=JSON.parse(fs.readFileSync(path.join(__dirname,'generator-updated.json'),'utf8'));
const fixed=JSON.parse(fs.readFileSync(path.join(dir,'01-题目生成-检索长度与零题修正版.json'),'utf8'));
const results=[];
function test(name,fn){try{fn();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',error:e.stack});}}
function run(w,id,input){const n=w.nodes.find(n=>n.nodeId===id);const code=n.inputs.find(i=>i.key==='code').value;
 const inputs=Object.fromEntries(n.inputs.filter(i=>i.canEdit).map(i=>[i.key,input[i.key]]));
 const ctx=vm.createContext({inputs});vm.runInContext(code+'\nresult=main(inputs)',ctx,{timeout:4000});return JSON.parse(JSON.stringify(ctx.result));}
const ids=['c4VtiMJKVkMxJ9O5','q0CMNrCkFGt4LYVq','nWJ1txLnlLszyUU5','p3yBjyK1YBhY5m8v'];
const gastric={disease:'胃神经内分泌肿瘤（WHO 2019 G1 级）伴恶性贫血及自身免疫性萎缩性胃炎',second_cancer_type:'胃神经内分泌肿瘤',case_context:'患者男，39 岁，因乏力、贫血就诊。胃镜见胃窦结节。活检确诊1型胃神经内分泌肿瘤（G1）；CT未见转移。',biomarkers:'Ki-67<3%；核分裂象<2个/mm²；内因子抗体阳性；维生素B12<50 pg/mL。',decision_points:'针对小且单发的1型胃神经内分泌肿瘤，选择定期胃镜随访而非立即内镜下切除；维生素B12长期替代治疗。',learning_points:'【本次调用的教学侧重，不是新增病例事实】系统治疗；目标生成5题。'};
const liver=JSON.parse(fs.readFileSync('C:/Users/admin/.codex/attachments/6e23a83c-69e6-4b1d-8480-1ce8d34b43ec/pasted-text.txt','utf8')).production_variables;
const samples=[];
test('胃NET及实际肝癌的四路query不超过480字符，保留原发疾病，不混入教学分工',()=>{
 for(const source of [gastric,liver])for(const id of ids){const out=run(fixed,id,source);assert(out.system_text.length<=480);assert(out.system_text.includes(source.disease));assert(!out.system_text.includes('目标生成'));assert(!out.system_text.includes('【本次调用'));samples.push({case:source.second_cancer_type,node:id,...out});}
});
test('超长病例和无分隔符字段不突破上限，不截断否定句或数值',()=>{
 const cases=[{}, {...gastric,case_context:'未证实转移'.repeat(1000),biomarkers:'Ki-67<3%'.repeat(1000),decision_points:'未使用药物'.repeat(1000)}, {...gastric,disease:'😀'.repeat(1000)},Object.fromEntries(Object.keys(gastric).map(k=>[k,'😀'.repeat(1000)]))];
 for(let size=1;size<=30;size++)cases.push({...gastric,case_context:gastric.case_context.repeat(size),biomarkers:gastric.biomarkers.repeat(size),decision_points:gastric.decision_points.repeat(size)});
 for(const source of cases)for(const id of ids){const out=run(fixed,id,source);assert(out.system_text.length<=480);assert.equal(out.query_report.query_length,out.system_text.length);assert(!/[\uD800-\uDBFF]$/.test(out.system_text));}
 const long=run(fixed,ids[1],cases[1]);assert(long.query_report.omitted_segments.biomarkers>0);assert(!long.system_text.includes('Ki-67'));
});
test('精简只摘取原文完整子句，保留阴性状态与阈值',()=>{
 const data={...gastric,biomarkers:'长'.repeat(600)+'；Ki-67<3%；未证实转移；受体阴性；胚系属性未提供'};
 const out=run(fixed,ids[1],data);for(const s of ['Ki-67<3%','未证实转移','受体阴性','胚系属性未提供'])assert(out.system_text.includes(s));
});
const candidate={schema_version:'1.1',generation_status:'insufficient',case_summary:'胃神经内分泌肿瘤',question_count:0,difficulty:'进阶',questions:[],missing_information:['query超过500字符，证据池为空'],risk_message:'检索失败，无可引用记录'};
const pool={contract_version:'1.2',records:[],lanes:{},retrieval_health:{ok:false,errors:[{lane:'guideline_a',message:'Tool input validation failed: /query must NOT have more than 500 characters'}]}};
test('旧版两轮装配均复现validatorEvidence.map报错',()=>{for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2'])assert.throws(()=>run(old,id,{candidate_json:JSON.stringify(candidate),evidence_pool:pool,second_cancer_type:gastric.second_cancer_type}),/validatorEvidence.map is not a function/);});
test('两轮装配：检索报错/正常空池均保留零题及原因，不再抛异常',()=>{
 for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2'])for(const ok of [true,false]){
  const inputPool={...pool,retrieval_health:ok?{ok:true,errors:[]}:pool.retrieval_health};
  const out=run(fixed,id,{candidate_json:JSON.stringify(candidate),evidence_pool:inputPool,second_cancer_type:gastric.second_cancer_type});
  assert.equal(out.structure_decision,ok?'INSUFFICIENT':'FAIL');assert.equal(out.medical_auditable,true);
  const c=JSON.parse(out.candidate_json_passthrough);assert.equal(c.question_count,0);assert.deepEqual(c.missing_information,candidate.missing_information);assert.equal(c.cancer_type,'神经内分泌肿瘤');
  const evidence=JSON.parse(out.validator_evidence_json);assert.equal(evidence.audit_mode,'FULL_POOL_FOR_INSUFFICIENCY');assert.deepEqual(evidence.records,[]);
  if(!ok)assert(out.structure_errors.some(s=>s.includes('500 characters')));
 }
});
test('不足医审对象保留完整原始正文和证据池元数据',()=>{
 const records=[{evidence_id:'GA1',doc_id:'D1',split_index:0,snippet:'压缩正文',raw_snippet:'完整正文。仅适用于特定人群，不能扩大结论。'}];
 const out=run(fixed,'cmuTcUhJefVm2DC6',{candidate_json:JSON.stringify(candidate),evidence_pool:{...pool,records},second_cancer_type:gastric.second_cancer_type});
 const evidence=JSON.parse(out.validator_evidence_json);assert.equal(evidence.records[0].snippet,records[0].raw_snippet);assert.equal(evidence.records[0].doc_id,'D1');assert.equal(evidence.contract_version,'1.2');
});
test('补检词各种超长线索不超过500字符',()=>{
 const n=fixed.nodes.find(n=>n.nodeId==='r8B6DL8OMe8eix63');const code=n.inputs.find(i=>i.key==='code').value;
 for(const base of ['a'.repeat(10000),samples[3].system_text])for(const terms of ['NCT01234567；研究A','线索'.repeat(10000),'研究A；'.repeat(200)]){
 const out=vm.runInNewContext(code+'\nboundedSupplementQuery(base,terms)',{base,terms});assert(out.length<=480);
 }
});
test('仅7个已确认相关节点改变；全部原有连线、变量、检索参数和工具绑定保持一致',()=>{
 assert.deepEqual(old.edges,fixed.edges);assert.deepEqual(old.chatConfig,fixed.chatConfig);
 const allowed=new Set([...ids,'cmuTcUhJefVm2DC6','v12AssemblyR2','r8B6DL8OMe8eix63']);
 for(const n of old.nodes)if(!allowed.has(n.nodeId))assert.deepEqual(n,fixed.nodes.find(x=>x.nodeId===n.nodeId));
 for(const id of ids){const n=fixed.nodes.find(n=>n.nodeId===id);assert(n.outputs.some(o=>o.id==='system_text'));for(const i of n.inputs.filter(i=>!['code','codeType','system_addInputParam'].includes(i.key)))assert.equal(i.canEdit,true);}
});
fs.writeFileSync(path.join(dir,'专项校验.json'),JSON.stringify({results,samples},null,2));
console.log(JSON.stringify(results,null,2));if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
