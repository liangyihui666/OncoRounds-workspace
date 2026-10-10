const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const root='outputs/整合最新版-正文传递与日期展示-20261008/';
const original=JSON.parse(fs.readFileSync(root+'01-外层完整工作流.json','utf8')),outer=structuredClone(original);
const childOriginal=JSON.parse(fs.readFileSync(root+'02-五题出题子应用完整工作流.json','utf8')),child=structuredClone(childOriginal);
const c=outer.nodes.find(n=>n.nodeId==='jKqMCN8eJKvkngnI').inputs.find(i=>i.key==='code');
const old="    const time = '(?:' + absolute + '(?:起)?|' + relative + ')';";assert(c.value.includes(old));
const extra=String.raw`(?:发病|起病|症状出现|就诊|入院|出院|手术|术后|治疗|停药|复发|进展|随访|恢复)(?:(?:当|次|翌)日|当天|期间|前[一二三四五六七八九十百半\d]+(?:个?月|年|周|天|日)|后[一二三四五六七八九十百半\d]+(?:个?月|年|周|天|日)|第[一二三四五六七八九十百\d]+(?:天|日|周|个?月))`;
c.value=c.value.replace(old,"    const relativeExtended = String.raw`"+extra+"`;\n    const time = '(?:' + absolute + '(?:起)?|' + relativeExtended + '|' + relative + ')';");
const promptOld='病例缺少关键条件时，考查应补充的评估，或明确写条件性判断，不默认已满足；';
const promptNew='病例缺少关键条件时，优先考查应补充的评估、鉴别诊断或下一步处理，不默认已满足。培养待回报、未做BAL、诊断待鉴别及毒性等级未确定是当前决策条件，不自动否定整例出题；只有缺失确实导致本题无法唯一作答时才换题。不能将疑似CIP升级为确诊，也不能凭资料不足补定G2/G3、培养阴性或已用激素及剂量。若设定后续检查结果或毒性等级，必须标记【延伸情境】并使用“若/假设”，仍遵守最多2题的限制；';
for(const id of ['sR35QbYF2xamDQR3','v12RevisionGenerator']){
 const p=child.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='systemPrompt');assert(p.value.includes(promptOld));p.value=p.value.replace(promptOld,promptNew);
}
const pub=JSON.parse(fs.readFileSync('C:/Users/admin/.codex/attachments/b83d2a5a-0ac7-4d53-8056-a262299381e4/已粘贴的文本.txt','utf8'));
const pool={candidate_count:5,case_packet:{case_id:pub.Questions.case_id},groups:[{medical_review_status:'not_performed',upstream_missing_information:[]}],candidates:pub.Questions.questions.map((q,i)=>({candidate_id:'G1_Q'+(i+1),group_id:'G1',source_question_id:q.id,question:q}))};
const timeline=[['发病前5天','症状出现','发热、干咳，家属有感染史。'],['入院当日','急诊处理','低流量吸氧，培养待回报。'],['入院第2天','复查','原文复查结果待核对。'],['停药后1周','随访','原文记录。'],['2024年5月起','维持治疗','原方案维持。'],['2021-6起','术后辅助治疗','原文治疗。']];
const args={candidate_pool:pool,case_id:pub.Questions.case_id,case_title:'离线时间解析验证',disease:'肺癌',case_context:'患者背景',biomarkers:'未记载',case_timeline:timeline.map(r=>r.join('｜')).join('\n'),learning_points:'待鉴别条件',difficulty:'进阶',second_cancer_type:'肺癌'};
const run=vm.runInNewContext(c.value+'\nmain',{URL});const out=JSON.parse(run(args).response_json);
const rows=out.detail.overview.tabs.find(t=>t.id==='timeline').timeline_items;assert.deepEqual(rows.map(r=>[r.date,r.title,r.detail]),timeline);assert.deepEqual(out.Questions.questions,pub.Questions.questions);
const undated=JSON.parse(run({...args,case_timeline:'症状出现但未记载时间，不能据正文中的5天推定日期。'}).response_json).detail.overview.tabs.find(t=>t.id==='timeline').timeline_items;assert.equal(undated[0].date,'时间未详');
for(const w of [outer,child])for(const n of w.nodes)for(const i of n.inputs||[])if(i.key==='code')new vm.Script(i.value);
const restored=structuredClone(outer);restored.nodes.find(n=>n.nodeId==='jKqMCN8eJKvkngnI').inputs.find(i=>i.key==='code').value=original.nodes.find(n=>n.nodeId==='jKqMCN8eJKvkngnI').inputs.find(i=>i.key==='code').value;assert.deepEqual(restored,original);
const restoredChild=structuredClone(child);for(const id of ['sR35QbYF2xamDQR3','v12RevisionGenerator'])restoredChild.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='systemPrompt').value=childOriginal.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='systemPrompt').value;assert.deepEqual(restoredChild,childOriginal);
const dir='outputs/相对时间与不确定病例出题-20261010';fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(dir+'/01-外层完整工作流.json',JSON.stringify(outer,null,2));fs.writeFileSync(dir+'/02-五题出题子应用完整工作流.json',JSON.stringify(child,null,2));
fs.writeFileSync(dir+'/离线检查.json',JSON.stringify({relative_time_cases:timeline.map(r=>r[0]),dates_titles_details_preserved:true,undated_facts_not_assigned_dates:true,questions_unchanged:true,only_outer_display_code_and_two_generator_prompts_changed:true,evidence_verification_unchanged:true,api_calls:0,model_run_performed:false},null,2));
console.log(JSON.stringify({dir,checks:'passed',api_calls:0}));
