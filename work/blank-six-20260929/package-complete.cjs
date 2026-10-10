const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm'),assert=require('assert/strict');
const out='outputs/完整工作流-Flash五题-20260929';fs.mkdirSync(out,{recursive:true});
const items=[
 ['01-出题子应用.json','outputs/证据原句核对与进阶出题-20260929/01-出题子应用-证据与进阶加强版.json'],
 ['02-HTML单例外层.json','outputs/六例空返回排查-20260929/02-HTML单例外层-精简返回版.json'],
 ['03-批量生成.json','outputs/证据原句核对与进阶出题-20260929/03-批量生成-配套版.json']
];
const manifest=[];
for(const [name,src] of items){const data=fs.readFileSync(src),w=JSON.parse(data);let codeCount=0;
 for(const n of w.nodes)for(const i of n.inputs||[]){if(i.key==='code'){new vm.Script(i.value);codeCount++;}
  if(i.key!=='code'&&typeof i.value==='string')for(const m of i.value.matchAll(/\{\{\$([^.$]+)\.([^$]+)\$\}\}/g)){const source=w.nodes.find(s=>s.nodeId===m[1]);assert(source&&source.outputs.some(o=>o.id===m[2]),n.name+'文本引用失效');}
  if(i.selectedType==='reference'&&Array.isArray(i.value)){const refs=typeof i.value[0]==='string'?[i.value]:i.value;for(const r of refs){if(!Array.isArray(r))continue;if(r[0]==='VARIABLE_NODE_ID'){assert(w.chatConfig.variables.some(v=>v.key===r[1]));continue;}const source=w.nodes.find(s=>s.nodeId===r[0]);assert(source&&source.outputs.some(o=>o.id===r[1]),n.name+'变量引用失效');}}
 }
 fs.copyFileSync(src,path.join(out,name));assert(fs.readFileSync(path.join(out,name)).equals(data));
 manifest.push({file:name,source:src,sha256:crypto.createHash('sha256').update(data).digest('hex'),nodes:w.nodes.length,edges:w.edges.length,code_nodes_syntax_checked:codeCount,calls:w.nodes.filter(n=>n.flowNodeType==='appModule').map(n=>({name:n.name,pluginId:n.pluginId}))});
}
for(const [src,name] of [
 ['outputs/六例空返回排查-20260929/离线重放报告.json','外层六例离线重放报告.json'],
 ['outputs/证据原句核对与进阶出题-20260929/进阶出题建议与20分复核标准.md','进阶出题建议与20分复核标准.md'],
 ['outputs/六例空返回排查-20260929/检查结论与使用说明.md','本批问题检查记录.md']
])fs.copyFileSync(src,path.join(out,name));
fs.writeFileSync(path.join(out,'文件来源与检查.json'),JSON.stringify({package_version:'20260929-flash-five-compact-outer',online_verified:false,files:manifest},null,2));
console.log(JSON.stringify({out,files:manifest},null,2));
