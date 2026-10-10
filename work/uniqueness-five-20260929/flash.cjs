const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const source='outputs/五题唯一性与进阶修复-20260929/01-出题子应用-Qwen3.5Plus质量修复版.json';
const dir='outputs/五题唯一性与进阶修复-Qwen3.8Flash-20260929';
const destination=path.join(dir,'01-出题子应用-Qwen3.8Flash质量修复版.json');
const original=JSON.parse(fs.readFileSync(source,'utf8')),workflow=structuredClone(original);
const changes=['sR35QbYF2xamDQR3','v12RevisionGenerator'].map(id=>{
 const n=workflow.nodes.find(n=>n.nodeId===id),m=n.inputs.find(i=>i.key==='model');
 assert.equal(m.value,'qwen3.5-plus');m.value='qwen3.8-flash';
 return {nodeId:id,name:n.name,field:'model',from:'qwen3.5-plus',to:m.value};
});
const reversed=structuredClone(workflow);
for(const c of changes)reversed.nodes.find(n=>n.nodeId===c.nodeId).inputs.find(i=>i.key==='model').value=c.from;
assert.deepEqual(reversed,original);
fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(destination,JSON.stringify(workflow,null,2)+'\n');
assert.deepEqual(JSON.parse(fs.readFileSync(destination,'utf8')),workflow);
fs.writeFileSync(path.join(dir,'修改核对.json'),JSON.stringify({source,destination,changes,verification:'仅两处模型字段变化，其他字段完全一致；保存后JSON回读一致',quality_rules_revision:'20260929-unique-advanced-five',online_run:false,kb_selection_required:true},null,2));
fs.writeFileSync(path.join(dir,'使用说明.md'),'# Qwen3.8 Flash 质量修复版\n\n将本目录工作流 JSON 导入原出题子应用。首轮生成和第二轮修订均已切回 qwen3.8-flash，保留刚修改的答案唯一性、四项解析复核和进阶考点规则。五题要求、知识库检索、参数、连线及外层接口保持不变，辅助节点模型不变。\n\n导入后，在「知识库搜索」节点选回原有知识库（本地 datasets 为空）。\n\n已验证只有两处模型字段变化，其余字段与质量修复版完全一致；未线上导入或重新调用模型。\n');
console.log(destination+'\nVerified: exactly two model fields changed.');
