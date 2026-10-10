const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source='outputs/封面精简与病理中文展示-20261008/外层完整工作流-封面精简与中文病理.json';
const original=JSON.parse(fs.readFileSync(source,'utf8')),w=structuredClone(original);
const dir='outputs/病程事件标题与答案展示-20261008';fs.mkdirSync(dir,{recursive:true});
const node=id=>w.nodes.find(n=>n.nodeId===id);
const prompt=node('t7eXTzfAM2QUzvvK').inputs.find(i=>i.key==='systemPrompt');
const anchor='case_timeline按原文顺序列出日期/阶段、检查、方案、疗效、不良事件。';assert(prompt.value.includes(anchor));
prompt.value=prompt.value.replace(anchor,anchor+'采用字符串，每行固定为“原文日期或阶段｜具体事件短标题｜原文支持的事实”。标题概括该行真实事件，如“胸部CT检查”“病理活检”“启动新辅助治疗”，不能写“诊疗节点1”“诊疗记录”等编号或泛化标题。日期只保留原文精度；没有日期写“时间未详”，不能补日期。');
const code=node('jKqMCN8eJKvkngnI').inputs.find(i=>i.key==='code');
const helper=`
function eventTitle(item) {
  const title=String(item.title||'').trim();
  if(title && !/^(?:诊疗节点|诊疗记录|诊疗事件|节点|事件)\\s*[0-9一二三四五六七八九十]*$/.test(title)) return title;
  const text=String(item.detail||'').replace(/^(?:19|20)\\d{2}(?:年\\d{1,2}月(?:\\d{1,2}日)?|[.\\/-]\\d{1,2}(?:[.\\/-]\\d{1,2})?)\\s*[:：]\\s*/,'').trim();
  const rules=[
    [/启动.{0,8}新辅助治疗|开始.{0,8}新辅助治疗/,'启动新辅助治疗'],
    [/EBUS[-－]?TBNA/i,'EBUS-TBNA检查'],
    [/PET\\s*[/－-]?\\s*CT/i,'PET/CT检查'],
    [/病理.{0,6}活检|活检.{0,6}病理/,'病理活检'],
    [/胸部CT/i,'胸部CT检查'],
    [/启动.{0,8}辅助治疗|开始.{0,8}辅助治疗/,'启动辅助治疗'],
    [/启动.{0,8}化疗|开始.{0,8}化疗/,'启动化疗'],
    [/启动.{0,8}放疗|开始.{0,8}放疗/,'启动放疗']
  ];
  for(const [pattern,label] of rules) if(pattern.test(text)) return label;
  // Unknown events use a source-text excerpt, rather than an inferred medical event.
  const first=text.split(/[，。；;\\n]/)[0].trim();
  return first?(Array.from(first).slice(0,18).join('')+(Array.from(first).length>18?'…':'')):'原文事件未明确';
}
`;
const timeline='  const timelineItems =\n    buildTimelineItems();';assert(code.value.includes(timeline));
code.value=helper+'\n'+code.value.replace(timeline,'  const timelineItems =\n    buildTimelineItems().map(item => ({...item, title:eventTitle(item)}));');
const run=vm.runInNewContext(code.value+'\nmain',{URL}),before=vm.runInNewContext(original.nodes.find(n=>n.nodeId==='jKqMCN8eJKvkngnI').inputs.find(i=>i.key==='code').value+'\nmain',{URL});
const published=JSON.parse(fs.readFileSync('outputs/日期与JSON转义修复-20261008/本次五题结果-仅日期与JSON修复.json'));
const pool={candidate_count:5,case_packet:{case_id:published.Questions.case_id},groups:[{medical_review_status:'not_performed',upstream_missing_information:[]}],candidates:published.Questions.questions.map((q,i)=>({candidate_id:'G1_Q'+(i+1),group_id:'G1',source_question_id:q.id,question:q}))};
const facts=['2024.11.27: 胸部CT示右下肺占位','2024.11: PET/CT示右肺下叶背段肿块，考虑MT','2024.12.05: 病理活检示低分化腺癌伴坏死','2024.12: EBUS-TBNA示4R组淋巴结见极个别异型细胞，考虑转移可能','2024.12.11: 启动新辅助治疗：原文药物及剂量'];
const args={candidate_pool:pool,case_id:published.Questions.case_id,case_title:'排版检查',disease:'肺癌',case_context:'仅用于离线排版检查',biomarkers:'原文未明确',case_timeline:facts.join('\n'),learning_points:'原文教学点',difficulty:'进阶',second_cancer_type:'肺癌'};
const a=JSON.parse(before(args).response_json),b=JSON.parse(run(args).response_json);
const rows=x=>x.detail.overview.tabs.find(t=>t.id==='timeline').timeline_items;
assert.deepEqual(rows(b).map(r=>r.title),['胸部CT检查','PET/CT检查','病理活检','EBUS-TBNA检查','启动新辅助治疗']);
assert.deepEqual(rows(b).map(r=>[r.date,r.detail]),rows(a).map(r=>[r.date,r.detail]));
assert.deepEqual(a.Questions,b.Questions);
for(const q of b.Questions.questions) assert.equal(q.answer_text,q.options[q.answer]);
const oldStructured=JSON.parse(run({...args,case_timeline:JSON.stringify([{date:'2024.12',title:'诊疗节点 4',detail:'EBUS-TBNA见异型细胞，考虑转移可能'},{date:'时间未详',event:'原文事件标题',details:'待核对'}])}).response_json);
assert.equal(rows(oldStructured)[0].title,'EBUS-TBNA检查');assert.equal(rows(oldStructured)[1].title,'原文事件标题');
for(const n of w.nodes)for(const i of n.inputs)if(i.key==='code')new vm.Script(i.value);
assert.deepEqual(w.edges,original.edges);assert.deepEqual(w.chatConfig,original.chatConfig);
fs.writeFileSync(dir+'/外层完整工作流-具体事件标题.json',JSON.stringify(w,null,2));
fs.writeFileSync(dir+'/离线检查结果.json',JSON.stringify({timeline_titles:rows(b).map(r=>r.title),dates_and_facts_unchanged:true,questions_unchanged:true,answer_text_matches_option:true,api_calls:0,online_verified:false},null,2));
fs.writeFileSync(dir+'/正确答案展示接入说明.md',`# 正确答案展示\n\n现有字段保持不变，answer 是正确选项字母，options[answer] 是已经生成的选项原文，answer_text 必须与此原文相同。复盘页不要重新概括答案，也不要用解析作为答案。\n\n页面显示建议：\n\n\`\`\`js\nconst letter = question.answer;\nconst answerLabel = letter + '. ' + question.options[letter];\n// 正确答案：{answerLabel}\n\`\`\`\n\n截图只显示答案原文，没有字母。工作流目前无法确认页面取的是 answer_text 还是 options[answer]，因此不把字母塞进 answer_text，避免破坏答案匹配。开发只需在复盘页显示时组合已有字段，无需新字段。未修改本地页面。\n\n本次完整外层工作流仅更改病例结构化提取的时间轴格式要求和 json生成 的通用标题兜底。保留已有具体标题、原始日期及正文；不新增节点、不调用付费模型、无需替换五题子应用。历史已生成病例不会被重新生成。\n`);
console.log(JSON.stringify({file:dir+'/外层完整工作流-具体事件标题.json',checks:'passed',titles:rows(b).map(r=>r.title),api_calls:0}));
