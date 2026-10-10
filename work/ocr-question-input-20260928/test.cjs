const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const dir = path.resolve(__dirname, '../../outputs/OCR衔接出题-20260928');
const d = JSON.parse(fs.readFileSync(path.join(dir, '题目生成-OCR结果直连-测试版.json'), 'utf8'));
const old = JSON.parse(fs.readFileSync(path.join(dir, '原始工作流备份.json'), 'utf8'));
const main = vm.runInNewContext(fs.readFileSync(path.join(dir,'接收OCR病例字段.js'),'utf8') + '\nmain');
const data = {case_id:'',case_title:'测试病例',disease:'肺癌',case_context:'原文相同段落\n日期待核实',learning_points:'',case_mode:'全程管理',case_timeline:'原文相同段落\n治疗时间未载明',biomarkers:'',decision_points:'治疗评估',adverse_events:'',evidence_notes:'原文冲突：不自行消解',case_intro_images:[],cancer_type:'肺癌',second_cancer_type:''};
const results=[];
function check(name, fn) {fn();results.push({name,pass:true});}
check('14字段逐字保留，跨字段相同段落及待核实说明保留',()=>assert.equal(JSON.stringify(main({ocr_result:JSON.stringify(data)}).case_packet),JSON.stringify(data)));
check('支持JSON代码块',()=>assert.equal(main({ocr_result:'```json\n'+JSON.stringify(data)+'\n```'}).case_title,data.case_title));
check('拒绝普通聊天文本和错误JSON',()=>assert.throws(()=>main({ocr_result:'开始'})));
check('拒绝多个病例数组',()=>assert.throws(()=>main({ocr_result:'[]'})));
check('必填缺失拦截',()=>assert.throws(()=>main({ocr_result:JSON.stringify({...data,case_context:''})})));
check('错误字段类型拦截',()=>assert.throws(()=>main({ocr_result:JSON.stringify({...data,biomarkers:[]})})));
check('全程管理缺时间线拦截',()=>assert.throws(()=>main({ocr_result:JSON.stringify({...data,case_timeline:''})})));
check('单时间点允许无时间线',()=>assert.equal(main({ocr_result:JSON.stringify({...data,case_mode:'单时间点',case_timeline:''})}).case_mode,'单时间点'));
check('上游失败对象不得当作病例',()=>assert.throws(()=>main({ocr_result:'{"ready":"false","issues":["失败"]}'})));
check('不再显示全局变量表单',()=>assert.equal(d.chatConfig.variables.length,0));
check('所有入口先经过字段检查',()=>assert.deepEqual(d.edges.filter(e=>e.source==='448745').map(e=>e.target),['v12CasePacket']));
check('模型配置与医学提示词不变',()=>{
 for(const n of d.nodes.filter(n=>n.flowNodeType==='chatNode')) assert.deepEqual(n,old.nodes.find(x=>x.nodeId===n.nodeId));
});
check('工具配置不变',()=>{
 for(const n of d.nodes.filter(n=>['tool','datasetSearchNode'].includes(n.flowNodeType))) assert.deepEqual(n,old.nodes.find(x=>x.nodeId===n.nodeId));
});
check('字段引用输出存在',()=>{
 const n=d.nodes.find(n=>n.nodeId==='v12CasePacket');
 for(const node of d.nodes) for(const i of node.inputs||[]) if(Array.isArray(i.value)&&i.value[0]==='v12CasePacket') assert(n.outputs.some(o=>o.id===i.value[1]));
 assert(!JSON.stringify(d).includes('VARIABLE_NODE_ID'));
});
check('图无环、节点与连线数未增加',()=>{
 assert.equal(d.nodes.length,old.nodes.length);assert.equal(d.edges.length,old.edges.length);
 const visited=new Set(),active=new Set();
 function visit(id){if(active.has(id))throw Error('cycle');if(visited.has(id))return;active.add(id);for(const e of d.edges.filter(e=>e.source===id))visit(e.target);active.delete(id);visited.add(id);}
 visit('448745');assert.equal(visited.size,d.nodes.length);
});
fs.writeFileSync(path.join(dir,'离线检查报告.json'),JSON.stringify({status:'offline_pass',online_verified:false,checks:results},null,2));
console.log(`${results.length} checks passed; online verification not performed.`);
