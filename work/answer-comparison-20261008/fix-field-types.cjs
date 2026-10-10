const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const base='outputs/基于最新上传-引用修复-20261008/02-外层完整工作流-基于本次上传.json';
const w=JSON.parse(fs.readFileSync(base)),original=structuredClone(w),dir='outputs/病例文本数组兼容-20261008';fs.mkdirSync(dir,{recursive:true});
const input=w.nodes.find(n=>n.nodeId==='ogy1PAMdD268kXeo').inputs.find(i=>i.key==='code');
const anchor='  const data = JSON.parse(raw.slice(start, end + 1));';assert(input.value.includes(anchor));
input.value=input.value.replace(anchor,anchor+`
  // Normalize a textual list without summarizing, reordering or inventing facts.
  const textFields=['case_context','case_timeline','biomarkers','learning_points_candidate','decision_points_candidate','adverse_events','evidence_notes','case_image_index'];
  for(const field of textFields){
    const value=data[field];
    if(value==null){data[field]='';continue;}
    if(typeof value==='string')continue;
    if(Array.isArray(value)&&value.every(row=>typeof row==='string')){
      data[field]=value.join('\\n');continue;
    }
    throw new Error('病例字段类型错误：'+field+'；仅接受字符串或字符串数组，实际为'+(Array.isArray(value)?'含非文本元素的数组':typeof value));
  }
`);
const checks=[],test=(name,f)=>{f();checks.push({name,pass:true});};
const fn=code=>vm.runInNewContext(code+'\nmain',{URL});
const run=fn(input.value),before=fn(original.nodes.find(n=>n.nodeId==='ogy1PAMdD268kXeo').inputs.find(i=>i.key==='code').value);
const fixture={case_title:'非医学结构测试',disease:'测试疾病',second_cancer_type:'乳腺癌',case_context:'患者资料未详',learning_points_candidate:'教学点一\n教学点二',decision_points_candidate:'决策点一',case_mode:'全程管理',case_timeline:'2024-6-15｜检查',biomarkers:'未详',adverse_events:'',evidence_notes:'原文未记载',case_image_index:'',difficulty:'进阶'};
const plain=v=>JSON.parse(JSON.stringify(v)),args=d=>({case_json:JSON.stringify(d)});
test('原字符串病例逐字段输出不变',()=>assert.deepEqual(plain(run(args(fixture))),plain(before(args(fixture)))));
test('learning_points文本数组按原序合并，生产字段及JSON载荷一致',()=>{const r=run(args({...fixture,learning_points_candidate:['教学点一','教学点二']}));assert.equal(r.learning_points,'教学点一\n教学点二');assert.equal(r.production_variables.learning_points,r.learning_points);assert.equal(JSON.parse(r.case_payload_json).learning_points,r.learning_points);});
test('决策点、时间轴和标志物文本数组保留日期、数值与否定',()=>{const d={...fixture,decision_points_candidate:['决策一','决策二'],case_timeline:['2024-6-15｜检查','2024-9-18｜复查'],biomarkers:['PD-L1 TPS 1%+','ALK阴性']},r=run(args(d));for(const [key,source]of[['decision_points','decision_points_candidate'],['case_timeline','case_timeline'],['biomarkers','biomarkers']])assert.equal(r[key],d[source].join('\n'));});
test('空数组/null归空，不补病例事实；错误对象/混合数组仍拒绝',()=>{for(const v of [[],null])assert.equal(run(args({...fixture,learning_points_candidate:v})).learning_points,'');for(const v of [{text:'教学点'},['教学点',7],7])assert.throws(()=>run(args({...fixture,learning_points_candidate:v})),/病例字段类型错误/);});
test('仅病例映射代码改变，所有模型、引用、必填变量和连接不变',()=>{const restored=structuredClone(w);restored.nodes.find(n=>n.nodeId==='ogy1PAMdD268kXeo').inputs.find(i=>i.key==='code').value=original.nodes.find(n=>n.nodeId==='ogy1PAMdD268kXeo').inputs.find(i=>i.key==='code').value;assert.deepEqual(restored,original);for(const n of w.nodes)for(const i of n.inputs)if(i.key==='code')new vm.Script(i.value);});
fs.writeFileSync(dir+'/外层完整工作流-病例文本数组兼容.json',JSON.stringify(w,null,2));
fs.writeFileSync(dir+'/代码运行-完整替换代码.txt',input.value);
fs.writeFileSync(dir+'/检查结果.json',JSON.stringify({checks,api_calls:0,online_verified:false,real_failed_input_available:false,medical_review_status:'not_performed'},null,2));
console.log(JSON.stringify({dir,checks},null,2));
