const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'outputs/批量五题兼容修复-20260928');
const source='C:/Users/admin/.codex/attachments/98fdca72-1835-4c6a-83d9-65c1eb5a32e9/已粘贴的文本.txt';
const d=JSON.parse(fs.readFileSync(source,'utf8'));
const node=id=>d.nodes.find(n=>n.nodeId===id);
const input=(id,key)=>node(id).inputs.find(i=>i.key===key);
input('iW8Qg5stNA8T2Qp9','fileUrlList').value=[['kWC4W3Kz5lNbIlo8','loopStartInput']];
// Normalize array references to the editor's multiple-reference representation.
for(const n of d.nodes)for(const i of n.inputs||[]){
 if(i.selectedType==='reference'&&i.valueType?.startsWith('array')&&Array.isArray(i.value)&&typeof i.value[0]==='string')i.value=[i.value];
}
input('batchFinal20260909','code').value=fs.readFileSync(path.join(__dirname,'final.js'),'utf8');
const outputTemplate=node('batchFinal20260909').outputs.find(o=>o.key==='output_json');
for(const [key,type,label] of [['batch_report','object','批量完成情况'],['batch_report_json','string','批量完成情况JSON']]){
 node('batchFinal20260909').outputs.push({...structuredClone(outputTemplate),id:key,key,label,valueType:type});
}
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'批量生成-五题兼容修复版.json'),JSON.stringify(d,null,2));
console.log(out);
