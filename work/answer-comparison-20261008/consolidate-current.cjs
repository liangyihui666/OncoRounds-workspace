const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const path='outputs/参考旧版病程阶段标题-20261008/外层完整工作流-病程阶段标题.json';
const original=JSON.parse(fs.readFileSync(path,'utf8')),w=structuredClone(original);
const node=id=>w.nodes.find(n=>n.nodeId===id),code=id=>node(id).inputs.find(i=>i.key==='code');
const mapper=node('ogy1PAMdD268kXeo'),input=structuredClone(mapper.inputs.find(i=>i.key==='case_json'));
input.key='cleaned_case_text';input.label='cleaned_case_text';input.value=['glGeIMqOVaSRs5jF','answerText'];input.required=false;mapper.inputs.push(input);
const sourceHelper=`
function patientSourceSection(cleaned) {
  if(typeof cleaned!=='string')return '';
  const match=cleaned.match(/【患者病例正文】([\\s\\S]*?)(?=\\n\\s*【[^】]+】|$)/);
  // No fallback to unchecked OCR or expert/research text.
  return match?match[1].trim():'';
}
`;
const m=code('ogy1PAMdD268kXeo');const anchor=' return {...result,case_payload_json:JSON.stringify(payload)};';assert(m.value.includes(anchor));
m.value=sourceHelper+'\n'+m.value.replace(anchor," payload.case_source_text=patientSourceSection(args.cleaned_case_text);\n"+anchor);
const c=code('jKqMCN8eJKvkngnI');
const time="const time = '(?:' + absolute + '|' + relative + ')';";assert(c.value.includes(time));
c.value=c.value.replace(time,"const time = '(?:' + absolute + '(?:起)?|' + relative + ')';");
const line='  return text.split(/\\r?\\n/).map(line=>{';assert(c.value.includes(line));
c.value=c.value.replace(line,line+"\n    try{const row=JSON.parse(line.trim());if(row&&typeof row==='object')return render(row);}catch(_){}");
const labels="const labels={pathology:";assert(c.value.includes(labels));
c.value=c.value.replace(labels,"const labels={name:'检测项目',marker:'标志物',value:'结果',sample_type:'标本类型',pathology:");
for(const n of w.nodes)for(const i of n.inputs)if(i.key==='code')new vm.Script(i.value);
assert.deepEqual(w.edges,original.edges);assert.deepEqual(w.chatConfig,original.chatConfig);
const packet=JSON.parse(fs.readFileSync(__dirname+'/actual-type-input.json','utf8'));
const mapped=vm.runInNewContext(m.value+'\nmain',{URL})({case_json:JSON.stringify(packet),cleaned_case_text:'【清洗状态】clean\n【患者病例正文】\n患者真实正文。\n既往治疗原文。\n【专家观点】\n尚未实施方案。'});
assert.equal(JSON.parse(mapped.case_payload_json).case_source_text,'患者真实正文。\n既往治疗原文。');
assert(!JSON.parse(mapped.case_payload_json).case_source_text.includes('尚未实施'));
const section=vm.runInNewContext(sourceHelper+'\npatientSourceSection');assert.equal(section('无区块的OCR数据'),'');
const published=JSON.parse(fs.readFileSync('C:/Users/admin/.codex/attachments/b83d2a5a-0ac7-4d53-8056-a262299381e4/已粘贴的文本.txt','utf8'));
const pool={candidate_count:5,case_packet:{case_id:published.Questions.case_id},groups:[{medical_review_status:'not_performed',upstream_missing_information:[]}],candidates:published.Questions.questions.map((q,i)=>({candidate_id:'G1_Q'+(i+1),group_id:'G1',source_question_id:q.id,question:q}))};
const args={candidate_pool:pool,case_id:published.Questions.case_id,case_title:'排版验证',disease:'食管癌',case_context:'患者资料',biomarkers:[{name:'PD-L1 TPS',value:'5%',method:'免疫组化',date:'2024.12.05'},{name:'ALK',status:'阴性'}].map(x=>JSON.stringify(x)).join('\n'),case_timeline:'2021-6起｜术后辅助治疗｜参加原文临床研究。\n2021-02-26起｜转化治疗｜原文方案。',learning_points:'病例教学点',difficulty:'进阶',second_cancer_type:'食管癌'};
const run=vm.runInNewContext(c.value+'\nmain',{URL});const out=JSON.parse(run(args).response_json);
const rows=out.detail.overview.tabs.find(t=>t.id==='timeline').timeline_items;
assert.deepEqual(rows.map(r=>[r.date,r.title]),[['2021-6起','术后辅助治疗'],['2021-02-26起','转化治疗']]);
const bio=out.detail.overview.tabs.find(t=>t.id==='summary').summary_items.find(r=>r.label==='分子与病理').value;
assert(!/[{}]|"name"|"sample_type"/.test(bio));assert(bio.includes('PD-L1 TPS')&&bio.includes('5%')&&bio.includes('阴性'));
assert.deepEqual(out.Questions.questions,published.Questions.questions);
const dir='outputs/整合最新版-正文传递与日期展示-20261008';fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(dir+'/01-外层完整工作流.json',JSON.stringify(w,null,2));
fs.copyFileSync('outputs/出题引文规则优化-20261008/五题出题子应用-完整工作流.json',dir+'/02-五题出题子应用完整工作流.json');
fs.writeFileSync(dir+'/离线检查结果.json',JSON.stringify({patient_text_forwarded:true,expert_text_excluded:true,date_start_suffix_preserved:true,json_line_biomarkers_readable:true,questions_unchanged:true,global_variables_and_edges_unchanged:true,api_calls:0,online_verified:false,medical_review_performed:false},null,2));
fs.writeFileSync(dir+'/使用说明.md','# 同一套最新版\n\n先更新既有五题子应用（02文件），再更新既有外层（01文件）。在既有应用中替换，保持现有题目生成节点引用的应用身份。外层保留原应用绑定，不新建应用，不修改本地页面。\n\n外层补传清洗结果中的患者病例正文到已有可选case_source_text，不包含专家观点或研究资料；这不是未经清洗的OCR原文。修复日期末尾“起”的识别，并将病理JSON行对象转换为中文展示。子应用包含选项前缀兼容、公式和英文引文适配，以及最新两轮引文提示词。\n\nQ5缺失绑定或verification、拼接引文及真实证据不足仍会拦截。此文件未修复本次缺失的题目，不代表批量生成或医学审核已通过。未调用付费模型。\n');
console.log(JSON.stringify({dir,checks:'passed',api_calls:0}));
