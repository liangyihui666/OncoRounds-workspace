const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const stageMode = process.argv.includes('--stage');
const dir = stageMode ? 'outputs/病程轴阶段兼容-20260928/' : 'outputs/病程轴与状态修复-20260928/';
const load = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const base = load('outputs/病例前处理提示词修订-20260928/HTML测试外层-病例整理提示词修订版.json');
const workflow = load(dir + (stageMode ? 'HTML测试外层-阶段兼容补充版.json' : 'HTML测试外层-病程轴与状态修复版.json'));
const code = (d, id) => d.nodes.find(n => n.nodeId === id).inputs.find(i => i.key === 'code').value;
const run = id => vm.runInNewContext(code(workflow, id) + '\nmain');
const plain = x => JSON.parse(JSON.stringify(x));
const results = [];
function test(name, fn) { fn(); results.push({name, pass:true}); }
const q = {id:'Q1',type:'治疗决策',phase:'初诊',timepoint:'初诊时',question:'教学测试：如何选择？',options:{A:'选项甲',B:'选项乙',C:'选项丙',D:'选项丁'},answer:'A',answer_text:'选项甲',explain:'A｜正确：测试依据。\nB｜不正确：条件不符。\nC｜不正确：条件不符。\nD｜不正确：条件不符。',keyPoint:'测试要点',guidelineRef:{doc_id:'TEST',split_index:0,type:'guideline',source_title:'测试记录'}};
const root = {schema_version:'1.0',case_id:'TEST',generation_status:'success',difficulty:'进阶',question_count:1,questions:[q],missing_information:[]};
const envelope = {status:'OUTPUT_READY',publishable:false,output_ready:true,medical_review_status:'not_performed',workflow_revision:'20260928-two-stage-revision',selected_candidate_audit:null,final_response_json:JSON.stringify(root)};
const packet = {case_id:'TEST',second_cancer_type:'直肠癌'};
const pool = run('bJcPjyWI8hiwuVOS')({group1:JSON.stringify(envelope),case_packet:JSON.stringify(packet)}).candidate_pool;
function final(timeline, p = pool) {
  return run('jKqMCN8eJKvkngnI')({...packet,candidate_pool:p,agent_reply:JSON.stringify({selected_ids:p.candidates.map(c=>c.candidate_id)}),case_timeline:timeline});
}
const items = r => r.case_page_data.overview.tabs.find(t => t.id === 'timeline').timeline_items;
test('仅修改两个代码字段，保留提示词、模型、连线、布局及应用配置', () => {
  const expected = structuredClone(base);
  for (const id of ['jKqMCN8eJKvkngnI','bJcPjyWI8hiwuVOS']) expected.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='code').value = code(workflow,id);
  assert.deepEqual(workflow, expected);
});
test('全部代码节点语法通过', () => {
  for(const n of workflow.nodes) for(const i of n.inputs||[]) if(i.key==='code') new vm.Script(i.value);
});
test('两阶段状态透传，保留未审核和不可发布标记', () => {
  assert.equal(pool.candidate_count,1);
  assert.equal(pool.groups[0].flow_publishable,false);
  assert.equal(pool.groups[0].output_ready,true);
  assert.equal(pool.groups[0].medical_review_status,'not_performed');
  const r = final('初诊时｜检查｜完成检查；等待报告');
  assert.equal(r.selection_report.medical_approval_confirmed,false);
  assert.equal(r.selection_report.medical_review_status,'not_performed');
  assert.equal(r.selection_report.editorial.scope,'original_candidate_text_preserved');
  assert.equal((r.quality_notice.match(/本流程未进行独立医学审核/g)||[]).length,1);
  assert(!/未提供与原题绑定的审核|20260910-two-level-test|original_reviewed_text_preserved/.test(JSON.stringify(r)));
});
test('新格式按行解析，保留标题、同事件分号及日期', () => {
  const got = items(final('2020年9月1日｜首次评估｜检查甲；检查乙;等待结果\r\n治疗后｜复查｜症状甲；处理乙'));
  assert.equal(got.length,2);
  assert.deepEqual(plain(got[0]),{date:'2020年9月1日',title:'首次评估',detail:'检查甲；检查乙;等待结果'});
  assert.equal(got[1].date,'治疗后');
});
test('五行含35个分句仍为五个事件', () => {
  const input=Array.from({length:5},(_,i)=>`2020年9月${i+1}日｜事件${i+1}｜`+Array.from({length:7},(_,j)=>`详情${j+1}`).join('；')).join('\n');
  assert.equal(items(final(input)).length,5);
});
test('旧格式仅在明确时间前缀前拆分，不按处理分句拆分', () => {
  const got=items(final('2020-09-01：检查甲；予禁食、止血；2020-09-02：复查；家属坚持自请出院'));
  assert.equal(got.length,2);
  assert.equal(got[1].date,'2020-09-02');
  assert(got[0].detail.includes('予禁食、止血'));
});
test('无时间处理不冒充date、不继承日期、不从正文抽取日期', () => {
  const got=items(final('2020年9月1日：住院\n予禁食、止血等治疗\n家属坚持自请出院\n电话随访获知于2020年10月18日死亡'));
  assert.deepEqual(plain(got.map(x=>x.date)),['2020年9月1日','时间未详','时间未详','时间未详']);
  assert(got[3].detail.includes('2020年10月18日'));
});
test('相对时间、中英文竖线、空输入兼容且不计算日期', () => {
  assert.equal(items(final('术后3个月｜复查｜等待结果'))[0].date,'术后3个月');
  assert.equal(items(final('第2周期后 | 复查 | 等待结果'))[0].title,'复查');
  assert.equal(items(final('时间不详｜检查｜结果未记载'))[0].date,'时间不详');
  assert.equal(items(final('')).length,0);
});
test('病程详情不在300字处截断', () => {
  const detail='检查信息；'.repeat(70)+'末尾处理仍待确定';
  assert.equal(items(final('初诊时｜评估｜'+detail))[0].detail,detail);
});
test('答案、顺序、逐项解析与引用保持不变', () => {
  const got=final('').final_data.questions[0];
  const old=vm.runInNewContext(code(base,'jKqMCN8eJKvkngnI')+'\nmain')({...packet,candidate_pool:pool,agent_reply:JSON.stringify({selected_ids:['G1_Q1']})});
  assert.deepEqual(plain(got),plain(old.final_data.questions[0]));
});
test('兼容旧审核记录，仍提示真实失败，缺记录不会虚报已审核', () => {
  const p=plain(pool); delete p.groups[0].medical_review_status; delete p.groups[0].workflow_revision;
  assert.equal(final('',p).selection_report.medical_review_status,'not_provided');
  p.candidates[0].source_question_audit={passed:false,problems:['测试问题']};
  const r=final('',p);
  assert.equal(r.selection_report.medical_approval_confirmed,false);
  assert.equal(r.selection_report.medical_review_status,'provided_not_confirmed');
  assert(r.quality_notice.includes('审核仍有问题：测试问题'));
});
test('零候选分支同样保留一次未审核说明', () => {
  const p=plain(pool);p.candidates=[];p.candidate_count=0;
  const r=final('',p);
  assert.equal(r.final_data.question_count,0);
  assert.equal((r.quality_notice.match(/本流程未进行独立医学审核/g)||[]).length,1);
});
test('前处理代码保留病程换行', () => {
  const timeline='初诊时｜检查｜检查甲；检查乙\n治疗后｜复查｜症状甲';
  const r=run('ogy1PAMdD268kXeo')({case_json:JSON.stringify({case_title:'脱敏测试',disease:'直肠癌',second_cancer_type:'直肠癌',case_timeline:timeline})});
  assert(JSON.stringify(r).includes(timeline.replaceAll('\n','\\n')));
});
test('用户最新两题结果经新旧展示代码处理一致，不删题或改答案解析', () => {
  const sample=load('C:/Users/admin/.codex/attachments/31f8aa9e-8596-4d37-9f3f-d7841a197c5f/已粘贴的文本.txt');
  const p=plain(pool);
  p.candidates=sample.final_data.questions.map((question,i)=>({candidate_id:'G1_Q'+(i+1),group_id:'G1',source_question_id:question.id,question}));
  p.candidate_count=p.candidates.length;
  const args={...packet,candidate_pool:p,agent_reply:JSON.stringify({selected_ids:p.candidates.map(c=>c.candidate_id)})};
  const old=vm.runInNewContext(code(base,'jKqMCN8eJKvkngnI')+'\nmain')(args);
  const got=run('jKqMCN8eJKvkngnI')(args);
  assert.equal(got.final_data.question_count,2);
  assert.deepEqual(plain(got.final_data.questions),plain(old.final_data.questions));
});
if(stageMode) {
  test('本次原始时间线11行对应11事件，日期阶段、标题和详情均保留',()=>{
    const sample=load('C:/Users/admin/.codex/attachments/e1eceb4c-4874-414d-9e4e-72d9308344d4/已粘贴的文本.txt');
    const payload=JSON.parse(sample.case_payload_json);
    assert.equal(Object.keys(payload).length,14);
    assert.equal(payload.case_timeline,sample.case_timeline);
    const lines=sample.case_timeline.split(/\r?\n/);
    const got=items(final(sample.case_timeline));
    assert.equal(got.length,11);
    lines.forEach((line,i)=>{
      const parts=line.split('｜');
      assert.equal(got[i].date,parts[0]);
      assert.equal(got[i].title,parts[1]);
      assert.equal(got[i].detail,parts.slice(2).join('｜'));
    });
  });
  test('相对上一交付仅增加后续阶段识别',()=>{
    const previous=load('outputs/病程轴与状态修复-20260928/HTML测试外层-病程轴与状态修复版.json');
    const input=previous.nodes.find(n=>n.nodeId==='jKqMCN8eJKvkngnI').inputs.find(i=>i.key==='code');
    input.value=input.value.replace('(?:初诊(?:时)?|首次就诊','(?:后续阶段|初诊(?:时)?|首次就诊');
    assert.deepEqual(workflow,previous);
  });
}
fs.writeFileSync(dir+'离线检查报告.json',JSON.stringify({checks:results,online_verified:false,medical_correctness_verified:false,actual_run_raw_timeline_available:stageMode},null,2));
console.log(results.length+' checks passed');
