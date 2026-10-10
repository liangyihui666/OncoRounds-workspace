const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const load = p => JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const outer = load('outputs/三连-修复多JSON串流与错误归因-20260904.json');
const inner = load('outputs/题目生成-单一结果输出-病种检索修复-20260904.json');
const oldOuter = load('outputs/三连-分工生成-按题号终选-质量优化-20260904.json');
const oldInner = load('outputs/题目生成-质量优化-二轮修订强化-20260904.json');
function run(w, id, args) {
  const n = w.nodes.find(n => n.nodeId === id || n.name === id);
  const sandbox = { input: structuredClone(args), URL };
  vm.runInNewContext(n.inputs.find(i=>i.key==='code').value + '\nresult=main(input);', sandbox, { timeout: 2000 });
  return JSON.parse(JSON.stringify(sandbox.result));
}
const fixtureIds = ['8e496144-1f5c-414c-9b08-302fbaeaad7d','fcd36459-e93c-4955-abc7-e95042239e08','1e9465a7-86a6-4ad0-bb1e-728d246b0834'];
const fixtures = fixtureIds.map(id=>load('C:/Users/admin/.codex/attachments/'+id+'/pasted-text.txt'));
const results = fixtures.map(f=>run(outer,'15题候选池拼接',f));
const tests = [];
function test(name, fn) { fn(); tests.push(name); console.log('PASS '+name); }
function exportPool(pool, ids, extra={}) {
  return run(outer,'json生成',{ ...pool.case_packet, candidate_pool:pool,
    agent_reply:JSON.stringify({selection_status:ids.length===5?'success':'insufficient',selected_ids:ids,selection_notes:[],risk_message:''}), ...extra });
}
test('复现三份日志并恢复结构候选：GEJ 0、食管15、ALK 5',()=>{
  assert.deepEqual(results.map(r=>r.candidate_pool.candidate_count),[0,15,5]);
  assert(results[0].candidate_pool.groups.every(g=>g.parse_status==='OK'&&g.generation_status==='insufficient'));
  assert(results[1].candidate_pool.groups.every(g=>g.parse_status==='OK'&&g.usable_question_count===5));
  assert.equal(results[2].candidate_pool.groups[1].error_code,'MISSING_FINAL_OUTPUT');
});
test('GEJ具体上游缺口保留，不再误报Unexpected JSON或真实无证据推断',()=>{
  const out=exportPool(results[0].candidate_pool,[]);
  assert.equal(out.selection_report.failure_kind,'UPSTREAM_INSUFFICIENT');
  assert(out.final_data.missing_information.some(m=>m.includes('GEJ')));
  assert(out.final_data.missing_information.some(m=>m.includes('肺癌')));
  assert(!out.quality_notice.includes('Unexpected'));
});
test('食管15题和ALK5题均可按模拟ID导出5道原题及独立病例详情JSON',()=>{
  for(const r of results.slice(1)){
    const pool=r.candidate_pool;
    const selected=pool.candidates.slice(0,5);
    const out=exportPool(pool,selected.map(c=>c.candidate_id));
    assert.equal(out.final_data.question_count,5);
    assert.equal(out.case_page_data.case_id,pool.case_packet.case_id);
    assert.equal(out.selection_report.medical_approval_confirmed,false);
    out.final_data.questions.forEach((q,i)=>{
      const old=selected[i].question;
      for(const k of ['question','type','phase','timepoint','answer_text','explain','keyPoint','guidelineRef'])assert.deepEqual(q[k],old[k]);
      assert.equal(q.options[q.answer],q.answer_text);
    });
  }
});
const published=results[1].candidate_pool.candidates.slice(0,5).map(c=>c.question);
const publicRoot={schema_version:'1.1',generation_status:'success',difficulty:'进阶',question_count:5,case_summary:'测试',questions:published};
const stopRoot={schema_version:'1.1',generation_status:'insufficient',difficulty:'进阶',question_count:0,case_summary:'测试',questions:[],missing_information:['明确的最终停止原因']};
const barePool = value=>run(outer,'15题候选池拼接',{group1:value,group2:JSON.stringify(stopRoot),group3:JSON.stringify(stopRoot),case_packet:{}}).candidate_pool;
test('末尾insufficient优先：不能复活前面的success草稿',()=>{
  const p=barePool(JSON.stringify(publicRoot)+JSON.stringify(stopRoot));
  assert.equal(p.candidate_count,0);assert.equal(p.groups[0].parse_status,'OK');
  assert(p.groups[0].upstream_missing_information.includes('明确的最终停止原因'));
});
test('尾部截断、非法JSON、夹带文字、只剩审核不能静默回收旧题',()=>{
  for(const [suffix,code] of [['{"questions":','TRUNCATED_REPLY'],['垃圾','REPLY_PARSE_ERROR'],['{"broken":,}','REPLY_PARSE_ERROR'],[JSON.stringify({decision:'REVISE',score:0,question_checks:[]}),'MISSING_FINAL_OUTPUT']]){
    const p=barePool(JSON.stringify(publicRoot)+suffix);
    assert.equal(p.candidate_count,0);assert.equal(p.groups[0].error_code,code);
  }
});
test('括号/转义字符在JSON字符串中，不会错误切分；支持旧单JSON和围栏',()=>{
  const root=structuredClone(publicRoot);root.case_summary='含 }{ 和引号"及反斜线\\';
  const p=barePool(JSON.stringify({anchor_a:'{}'})+JSON.stringify(root));
  assert.equal(p.candidate_count,5);
  assert.equal(barePool('```json\n'+JSON.stringify(root)+'\n```').candidate_count,5);
});
test('输出异常不足5题显示技术错误，不当作医学证据不足',()=>{
  const p=barePool('{bad');
  const out=exportPool(p,[]);
  assert.equal(out.selection_report.failure_kind,'UPSTREAM_OUTPUT_ERROR');
  assert.match(out.quality_notice,/不能把这些异常等同于医学证据不足/);
});
test('保持首轮75阈值、二轮直出和合并失败回退规则',()=>{
  const candidate=JSON.stringify(publicRoot);
  const cases=[
    {r1_decision:'PASS',r1_score:75,r1_publishable:true,r1_candidate:candidate},
    {r1_decision:'PASS',r1_score:74,r1_publishable:true,r1_candidate:candidate},
    {r1_decision:'REVISE',r1_score:65,r1_candidate:candidate,r2_decision:'REVISE',r2_score:60,r2_candidate:candidate},
    {r1_decision:'REVISE',r1_score:65,r1_candidate:candidate,r2_decision:'REVISE',r2_score:0,r2_candidate:''},
    {r1_decision:'STOP_INSUFFICIENT',r1_score:0,r1_candidate:JSON.stringify(stopRoot),r2_decision:'STOP_INSUFFICIENT',r2_score:0,r2_candidate:JSON.stringify(stopRoot)}
  ];
  for(const c of cases){
    const old=run(oldInner,'最终发布状态归一',c),now=run(inner,'最终发布状态归一',c);
    for(const k of ['status','publishable','validation_decision','validation_score','round_count'])assert.equal(now[k],old[k]);
    if(old.publishable)assert.equal(now.final_response_json,old.final_response_json);
  }
});
test('单一最终结果包可解析，保留实际REVISE，不给回退题伪造审核绑定',()=>{
  const args={case_id:'CASE-T',case_title:'测试',disease:'测试肿瘤',r1_candidate:JSON.stringify(publicRoot),r1_decision:'REVISE',r1_score:65,
    r2_candidate:'',r2_decision:'REVISE',r2_score:0,r2_feedback:JSON.stringify({medical_auditable:false,patch_merge_decision:'FAIL'})};
  const out=run(inner,'最终发布状态归一',args);
  const env=JSON.parse(out.publication_payload_json);
  assert.equal(env.record_type,'oncorounds_final');assert.equal(env.selected_candidate_round,1);
  assert.equal(env.audit_applies_to_selected_candidate,false);assert.equal(env.validation_decision,'REVISE');
  const p=barePool(out.publication_payload_json);
  assert.equal(p.candidate_count,5);assert.equal(p.groups[0].audit.score,0);
  const firstOnly=run(inner,'最终发布状态归一',{r1_candidate:JSON.stringify(publicRoot),r1_decision:'PASS',r1_score:75,r1_publishable:true,
    r1_feedback:JSON.stringify({medical_auditable:true,patch_merge_decision:'PASS'}),r2_candidate:JSON.stringify(publicRoot),r2_decision:''});
  assert.equal(JSON.parse(firstOnly.publication_payload_json).selected_candidate_round,1);
  assert.equal(JSON.parse(firstOnly.publication_payload_json).audit_applies_to_selected_candidate,true);
});
test('显式病例ID不匹配时阻止串病例；不猜测临床文本所属患者',()=>{
  const raw=JSON.stringify({case_id:'CASE-A',final_response_json:JSON.stringify(publicRoot)});
  const p=run(outer,'15题候选池拼接',{group1:raw,group2:JSON.stringify(stopRoot),group3:JSON.stringify(stopRoot),case_packet:{case_id:'CASE-B'}}).candidate_pool;
  assert.equal(p.groups[0].error_code,'CASE_MISMATCH');assert.equal(p.candidate_count,0);
  const realPool=results[1].candidate_pool;
  assert.throws(()=>exportPool(realPool,realPool.candidates.slice(0,5).map(c=>c.candidate_id),{case_id:'WRONG'}),/CASE_MISMATCH/);
});
test('两个工作流的所有中间聊天节点关闭对外输出，终端只引用最终结果包',()=>{
  for(const w of [inner,outer]) for(const n of w.nodes.filter(n=>n.flowNodeType==='chatNode'))assert.equal(n.inputs.find(i=>i.key==='isResponseAnswerText').value,false);
  for(const n of inner.nodes.filter(n=>n.flowNodeType==='answerNode'))assert.deepEqual(n.inputs.find(i=>i.key==='text').value,['v12FinalPublicationNormalize','v26PublicationEnvelope']);
});
test('检索词与重排均随病种，不再写死肺癌/ALK/EBUS；生物标志物和决策引用存在',()=>{
  const ids=['c4VtiMJKVkMxJ9O5','q0CMNrCkFGt4LYVq','nWJ1txLnlLszyUU5','p3yBjyK1YBhY5m8v','udswa1eViYShgQ58','rfC50X90Ce6cGaIB','sB1igq1zFijP0xqL'];
  for(const id of ids){
    const n=inner.nodes.find(n=>n.nodeId===id);
    const text=n.inputs.find(i=>i.key==='system_textareaInput'||i.key==='rerankInstruct').value;
    assert(!/NSCLC|ALK|肺癌|EBUS|肺门|纵隔镜/.test(text),n.name);
  }
  assert(inner.nodes.find(n=>n.nodeId==='q0CMNrCkFGt4LYVq').inputs.find(i=>i.key==='system_textareaInput').value.includes('paCC6BpL'));
  assert(inner.nodes.find(n=>n.nodeId==='p3yBjyK1YBhY5m8v').inputs.find(i=>i.key==='system_textareaInput').value.includes('sJtCjs9u'));
});
test('原连线、应用ID、医学生成/校验提示词及温度不变；全部代码可编译',()=>{
  for(const [w,old] of [[outer,oldOuter],[inner,oldInner]]){
    assert.deepEqual(w.edges,old.edges);assert.equal(w.nodes.length,old.nodes.length);
    for(const n of w.nodes){
      if(n.flowNodeType==='code')new vm.Script(n.inputs.find(i=>i.key==='code').value);
      if(n.flowNodeType==='chatNode'){
        const o=old.nodes.find(x=>x.nodeId===n.nodeId);
        for(const k of ['systemPrompt','temperature','model'])assert.deepEqual(n.inputs.find(i=>i.key===k),o.inputs.find(i=>i.key===k));
      }
      if(n.flowNodeType==='appModule')assert.deepEqual(n,old.nodes.find(x=>x.nodeId===n.nodeId));
    }
  }
});
test('所有新增节点/全局变量引用可定位，输出变量ID无重复',()=>{
  for(const w of [outer,inner]){
    const globalText=JSON.stringify([w.chatConfig?.variables,w.nodes.find(n=>n.nodeId==='userGuide')]);
    function check(nid,oid){
      if(nid==='VARIABLE_NODE_ID'){assert(globalText.includes('"'+oid+'"'),'global '+oid);return;}
      const n=w.nodes.find(n=>n.nodeId===nid);assert(n,'node '+nid);
      assert(n.outputs.some(o=>o.id===oid||o.key===oid),'output '+nid+'.'+oid);
    }
    function visit(v){
      if(Array.isArray(v)){
        if(v.length===2&&typeof v[0]==='string'&&(v[0]==='VARIABLE_NODE_ID'||w.nodes.some(n=>n.nodeId===v[0]))&&typeof v[1]==='string')check(v[0],v[1]);
        else v.forEach(visit);
      }else if(typeof v==='string')for(const m of v.matchAll(/\{\{\$([\w-]+)\.([\w-]+)\$\}\}/g))check(m[1],m[2]);
    }
    for(const n of w.nodes){n.inputs.forEach(i=>visit(i.value));assert.equal(new Set(n.outputs.map(o=>o.id)).size,n.outputs.length);}
  }
});
console.log(JSON.stringify({passed:tests.length,replayed_case_counts:results.map(r=>({case_id:r.candidate_pool.case_packet.case_id,candidate_count:r.candidate_pool.candidate_count,groups:r.candidate_pool.groups.map(g=>({group_id:g.group_id,parse_status:g.parse_status,count:g.usable_question_count,error_code:g.error_code}))})),tests},null,2));
