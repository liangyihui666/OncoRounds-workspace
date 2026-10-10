const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source='C:/Users/admin/.codex/attachments/c3b39f29-bdf5-444b-92bd-66c9a4b00022/已粘贴的文本.txt';
const original=JSON.parse(fs.readFileSync(source)),w=structuredClone(original),dir='outputs/基于最新上传-引用修复-20261008';fs.mkdirSync(dir,{recursive:true});
const get=id=>w.nodes.find(n=>n.nodeId===id),node=get('bJcPjyWI8hiwuVOS');
for(const [key,out]of[['group1','answerText'],['group1_error','system_error_text']]){const i=node.inputs.find(i=>i.key===key);i.selectedType='reference';i.value=['i3gSaTAKKdSNhezB',out];}
get('jKqMCN8eJKvkngnI').inputs=get('jKqMCN8eJKvkngnI').inputs.filter(i=>i.key!=='transport_mode');
const checks=[];const check=(name,f)=>{f();checks.push({name,pass:true});};
check('新题目生成正常及错误输出引用有效',()=>{assert.deepEqual(node.inputs.find(i=>i.key==='group1').value,['i3gSaTAKKdSNhezB','answerText']);assert.deepEqual(node.inputs.find(i=>i.key==='group1_error').value,['i3gSaTAKKdSNhezB','system_error_text']);});
check('全部节点/全局变量引用及代码语法有效',()=>{
 const ref=(a,b)=>{if(a==='VARIABLE_NODE_ID')return assert(w.chatConfig.variables.some(v=>v.key===b));assert(get(a)?.outputs.some(o=>o.id===b),a+'.'+b);};
 for(const n of w.nodes)for(const i of n.inputs){if(i.key==='code')new vm.Script(i.value);if(i.selectedType==='reference'&&Array.isArray(i.value))for(const r of typeof i.value[0]==='string'?[i.value]:i.value)if(Array.isArray(r))ref(...r);if(i.key!=='code'&&typeof i.value==='string')for(const m of i.value.matchAll(/\{\{\$([^.$]+)\.([^$]+)\$\}\}/g))ref(m[1],m[2]);}
});
check('draftData必填、当前应用绑定、连线、模型和其他节点原样保留',()=>{assert.deepEqual(w.chatConfig,original.chatConfig);assert(w.chatConfig.variables.some(v=>v.label==='draftData'&&v.required));assert.deepEqual(get('i3gSaTAKKdSNhezB'),original.nodes.find(n=>n.nodeId==='i3gSaTAKKdSNhezB'));assert.deepEqual(w.edges,original.edges);for(const n of w.nodes)if(!['bJcPjyWI8hiwuVOS','jKqMCN8eJKvkngnI'].includes(n.nodeId))assert.deepEqual(n,original.nodes.find(o=>o.nodeId===n.nodeId));});
fs.writeFileSync(dir+'/02-外层完整工作流-基于本次上传.json',JSON.stringify(w,null,2));
fs.copyFileSync('outputs/解析内病例对照-不增字段-20261008/01-五题出题子应用-完整工作流.json',dir+'/01-出题子应用-解析内对照.json');
fs.writeFileSync(dir+'/检查及修改记录.json',JSON.stringify({source,changes:['group1引用新题目生成.answerText','group1_error引用新题目生成.system_error_text','删除transport_mode输入'],checks,api_calls:0,online_verified:false,local_frontend_changed:false},null,2));
fs.writeFileSync(dir+'/使用说明.md','# 基于本次上传的修复版\n\n02文件直接以本次上传c3b39f29附件为基础。修复group1和group1_error未绑定输出，删除transport_mode。保留draftData必填、新题目生成节点、现有子应用绑定、节点位置、模型与连线。\n\n导入02文件即可修复外层引用。01文件沿用此前不增加字段、将病例对照写入现有解析的出题子应用版本；已经更新过子应用则不用重复导入。外层附件不包含子应用内部提示词，无法仅靠外层文件修改内部出题逻辑。\n\n在draftData中填入病例OCR文案，再发送开始。未改本地页面、未修改在线应用、未调用付费模型。引用与语法检查通过，未进行线上模型运行或医学审核。\n');
console.log(JSON.stringify({dir,checks},null,2));
