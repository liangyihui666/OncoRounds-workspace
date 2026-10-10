const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source='C:/Users/admin/.codex/attachments/c3b39f29-bdf5-444b-92bd-66c9a4b00022/已粘贴的文本.txt';
const original=JSON.parse(fs.readFileSync(source)),w=structuredClone(original),dir='outputs/日期与JSON转义修复-20261008';fs.mkdirSync(dir,{recursive:true});
const get=id=>w.nodes.find(n=>n.nodeId===id),code=id=>get(id).inputs.find(i=>i.key==='code');
// Carry forward the already-authorized interface fixes on the original attachment.
for(const [key,out]of[['group1','answerText'],['group1_error','system_error_text']])get('bJcPjyWI8hiwuVOS').inputs.find(i=>i.key===key).value=['i3gSaTAKKdSNhezB',out];
get('jKqMCN8eJKvkngnI').inputs=get('jKqMCN8eJKvkngnI').inputs.filter(i=>i.key!=='transport_mode');
const helper=fs.readFileSync(__dirname+'/normalize-structured.js','utf8');
const mapper=code('ogy1PAMdD268kXeo'),anchor='  const data = JSON.parse(raw.slice(start, end + 1));';assert(mapper.value.includes(anchor));
mapper.value=helper+'\n'+mapper.value.replace(anchor,anchor+`
  for(const field of ['case_context','case_timeline','biomarkers','learning_points_candidate','decision_points_candidate','adverse_events','evidence_notes','case_image_index']) data[field]=normalizeExtractedText(data[field],field);
`);
const c=code('jKqMCN8eJKvkngnI');
const timelineHelper=`
function explicitTimelineRow(value) {
  let row=value;
  if(typeof row==='string') { try { row=JSON.parse(row); } catch(_) { return null; } }
  if(!row || typeof row!=='object' || Array.isArray(row) || typeof row.date!=='string') return null;
  const str=v=>typeof v==='string'?v:'';
  const detail=str(row.details)||str(row.detail);
  const event=str(row.event);
  const title=str(row.title)||str(row.stage)||(detail?event:'');
  const used=new Set(['date','title','stage','event','details','detail']);
  const extras=Object.fromEntries(Object.entries(row).filter(([k])=>!used.has(k)));
  const lines=[detail||event];
  if(detail&&event&&event!==title) lines.unshift(event);
  if(str(row.stage)&&str(row.stage)!==title) lines.push('stage：'+row.stage);
  if(Object.keys(extras).length) lines.push('附加原字段：'+JSON.stringify(extras));
  return {date:row.date.trim()||'时间未详',title:title||'诊疗记录',detail:lines.filter(Boolean).join('；')};
}
`;
c.value=timelineHelper+'\n'+c.value;
const rawAnchor="    const raw = String(case_timeline ?? '').trim();";assert(c.value.includes(rawAnchor));
c.value=c.value.replace(rawAnchor,`    let value=case_timeline;
    if(typeof value==='string') { try { value=JSON.parse(value); } catch(_) {} }
    const raw=(Array.isArray(value)?value.map(v=>typeof v==='string'?v:JSON.stringify(v)).join('\\n'):value&&typeof value==='object'?JSON.stringify(value):String(value??'')).trim();`);
const rowAnchor='      const line = entry.trim();';assert(c.value.includes(rowAnchor));
c.value=c.value.replace(rowAnchor,rowAnchor+`\n      const structured=explicitTimelineRow(line);\n      if(structured) return structured;`);
const entriesAnchor="    const entries = lines.flatMap(line => /[｜|]/.test(line) ? [line] : line.split(legacyBoundary));";assert(c.value.includes(entriesAnchor));
c.value=c.value.replace(entriesAnchor,"    const entries = lines.flatMap(line => explicitTimelineRow(line) || /[｜|]/.test(line) ? [line] : line.split(legacyBoundary));");
const finalAnchor="  const response_json=JSON.stringify(inputs.transport_mode==='__ONCOROUNDS_BATCH_V2__'?transport:output_data);";assert(c.value.includes(finalAnchor));
c.value=c.value.replace(finalAnchor,`  const response_json=JSON.stringify(output_data);
  const serializedCheck=JSON.parse(response_json);
  if(!serializedCheck.Questions || !serializedCheck.detail || serializedCheck.Questions.question_count!==serializedCheck.Questions.questions.length) throw new Error('最终JSON序列化检查失败');`);
// Recover only demonstrably unescaped object literals in this pasted result's detail strings.
const raw=fs.readFileSync('C:/Users/admin/.codex/attachments/c1f2d220-a138-473f-9700-11c9a2acf4de/已粘贴的文本.txt','utf8');
function repairPastedDetails(text){
 let cursor=0,result='',repairs=0;
 while(true){const at=text.indexOf('"detail":"{',cursor);if(at<0){result+=text.slice(cursor);break;}
  const start=at+'"detail":"'.length;let depth=0,quoted=false,escaped=false,end=-1;
  for(let i=start;i<text.length;i++){const ch=text[i];if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;}else if(ch==='"')quoted=true;else if(ch==='{')depth++;else if(ch==='}'&&--depth===0){end=i+1;break;}}
  assert(end>start&&text[end]==='"','嵌套detail结构不明确，拒绝猜测');
  const row=JSON.parse(text.slice(start,end));result+=text.slice(cursor,start-1)+JSON.stringify(JSON.stringify(row));cursor=end+1;repairs++;
 }
 return {data:JSON.parse(result),repairs};
}
const recovered=repairPastedDetails(raw),fixed=structuredClone(recovered.data);
const rowFn=vm.runInNewContext(timelineHelper+'\nexplicitTimelineRow');
fixed.detail.overview.tabs.find(t=>t.id==='timeline').timeline_items=fixed.detail.overview.tabs.find(t=>t.id==='timeline').timeline_items.map(item=>JSON.parse(JSON.stringify(rowFn(item.detail)||item)));
const checks=[],test=(name,f)=>{f();checks.push({name,pass:true});};
const main=id=>vm.runInNewContext(code(id).value+'\nmain',{URL});
const packet=JSON.parse(fs.readFileSync(__dirname+'/actual-type-input.json'));
const actualRows=recovered.data.detail.overview.tabs.find(t=>t.id==='timeline').timeline_items.map(item=>JSON.parse(item.detail));
const pool={candidate_count:5,case_packet:{case_id:fixed.Questions.case_id},groups:[{medical_review_status:'not_performed',upstream_missing_information:[]}],candidates:fixed.Questions.questions.map((q,i)=>({candidate_id:'G1_Q'+(i+1),group_id:'G1',source_question_id:q.id,question:q}))};
function assemble(timeline){return main('jKqMCN8eJKvkngnI')({candidate_pool:pool,case_id:fixed.Questions.case_id,case_title:packet.case_title,disease:packet.disease,case_context:packet.case_context,biomarkers:'测试',case_timeline:timeline,learning_points:'测试',difficulty:'进阶',second_cancer_type:'肺癌'});}
test('本次五条date/event/stage均提取日期和阶段，不再输出JSON碎片',()=>{const output=JSON.parse(assemble(actualRows.map(r=>JSON.stringify(r)).join('\n')).response_json);const rows=output.detail.overview.tabs.find(t=>t.id==='timeline').timeline_items;assert.equal(rows.length,5);rows.forEach((r,i)=>{assert.equal(r.date,actualRows[i].date);assert.equal(r.title,actualRows[i].stage);assert.equal(r.detail,actualRows[i].event);});});
test('兼容序列化JSON数组和原date/event/details输入',()=>{const rows=JSON.parse(assemble(JSON.stringify(actualRows)).response_json).detail.overview.tabs.find(t=>t.id==='timeline').timeline_items;assert.equal(rows.length,5);assert.equal(rows[2].date,'2024-6至2024-9');const mapped=main('ogy1PAMdD268kXeo')({case_json:JSON.stringify(packet)});assert.equal(JSON.parse(assemble(mapped.case_timeline).response_json).detail.overview.tabs.find(t=>t.id==='timeline').timeline_items[0].date,'2024-6-3');});
test('双引号、反斜杠及换行正确序列化并可还原，五题不改',()=>{const rows=[{date:'2024-09-18',event:'记录写“PR”；原词 "test"，路径 C:\\report\\x\n第二行',stage:'复查'}],out=JSON.parse(assemble(JSON.stringify(rows)).response_json);assert.equal(out.detail.overview.tabs.find(t=>t.id==='timeline').timeline_items[0].detail,rows[0].event);assert.deepEqual(out.Questions.questions, fixed.Questions.questions);});
test('真实粘贴结果仅修复5处detail转义和5条时间轴，题目不改',()=>{assert.equal(recovered.repairs,5);assert.deepEqual(fixed.Questions,recovered.data.Questions);assert.equal(fixed.detail.overview.tabs.find(t=>t.id==='timeline').timeline_items.filter(r=>r.date==='时间未详').length,0);assert.deepEqual(JSON.parse(JSON.stringify(fixed)),fixed);});
test('全部代码、引用及边有效，draftData和应用绑定保持',()=>{for(const n of w.nodes)for(const i of n.inputs){if(i.key==='code')new vm.Script(i.value);if(i.selectedType==='reference'&&Array.isArray(i.value))for(const r of typeof i.value[0]==='string'?[i.value]:i.value)if(Array.isArray(r)){if(r[0]==='VARIABLE_NODE_ID')assert(w.chatConfig.variables.some(v=>v.key===r[1]));else assert(get(r[0])?.outputs.some(o=>o.id===r[1]));}}assert.deepEqual(w.edges,original.edges);assert.deepEqual(w.chatConfig,original.chatConfig);assert.deepEqual(get('i3gSaTAKKdSNhezB'),original.nodes.find(n=>n.nodeId==='i3gSaTAKKdSNhezB'));});
fs.writeFileSync(dir+'/外层完整工作流-日期与JSON修复.json',JSON.stringify(w,null,2));
fs.writeFileSync(dir+'/本次五题结果-仅日期与JSON修复.json',JSON.stringify(fixed,null,2));
fs.writeFileSync(dir+'/检查结果.json',JSON.stringify({checks,pasted_detail_escape_repairs:recovered.repairs,api_calls:0,online_verified:false,medical_content_changed:false,medical_review_status:'not_performed'},null,2));
fs.writeFileSync(dir+'/使用说明.md','# 日期与JSON修复\n\n只替换外层工作流，子应用与本地页面不变。保留draftData必填及现有应用绑定，承接此前字段类型和引用修复。\n\n时间轴支持date/event/stage、date/event/details记录及序列化JSON数组。保留原始日期及输入顺序，不推测缺失日期。\n\n最终输出由JSON.stringify生成，再JSON.parse检查；双引号、反斜杠及换行交给原生序列化，不手工拼接。原流程已使用JSON.stringify，因此无法仅凭粘贴文本确定转义是在生成、展示还是复制阶段丢失；请保存原始response_json，不对整个JSON做取消转义。\n\n另提供本次五题结果修复文件：只修5条时间轴和嵌套detail字符串的转义，题目及医学陈述不变；此前指出的医学内容问题仍存在，不能据格式修复视为医学审核通过。\n');
console.log(JSON.stringify({dir,checks},null,2));
