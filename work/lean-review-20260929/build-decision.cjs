const fs=require('fs'),assert=require('assert/strict');
const base='outputs/精简版-表格换行修复-20260929',out='outputs/精简版-进阶决策优化-20260929';
const child=JSON.parse(fs.readFileSync(base+'/01-出题子应用.json')),before=structuredClone(child);
const prompt=fs.readFileSync(__dirname+'/decision-prompt.txt','utf8').trim();
const prefix='这是第二轮也是最后一轮。逐题核对必要条件是否完整、竞争选项能否被本例排除、绑定证据是否适用。program_precheck的PASS只表示程序检查通过；发现内容缺陷时重写对应整题，其余合格题及选项顺序保留。返回包含全部题目的完整替换稿，不只返回修改题。\n\n';
const edits=[];
for(const [id,value] of [['sR35QbYF2xamDQR3',prompt],['v12RevisionGenerator',prefix+prompt]]){
 const node=child.nodes.find(n=>n.nodeId===id),input=node.inputs.find(i=>i.key==='systemPrompt');
 const previous=input.value;
 assert.equal(previous.slice(previous.indexOf('输出协议')),value.slice(value.indexOf('输出协议')),'输出协议必须逐字保持');
 input.value=value;
 edits.push({id,name:node.name,field:'systemPrompt',before_chars:previous.length,after_chars:value.length});
}
// Verify the mutation boundary instead of rerunning unchanged code or paid models.
const restored=structuredClone(child);
for(const e of edits)restored.nodes.find(n=>n.nodeId===e.id).inputs.find(i=>i.key===e.field).value=before.nodes.find(n=>n.nodeId===e.id).inputs.find(i=>i.key===e.field).value;
assert.deepEqual(restored,before,'除两段提示词之外所有配置必须保持');
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(out+'/01-出题子应用.json',JSON.stringify(child,null,2));
for(const f of ['02-HTML单例外层.json','03-批量生成.json']){fs.copyFileSync(base+'/'+f,out+'/'+f);assert(fs.readFileSync(base+'/'+f).equals(fs.readFileSync(out+'/'+f)));}
fs.writeFileSync(out+'/首轮完整提示词.txt',prompt);
fs.writeFileSync(out+'/第二轮完整提示词.txt',prefix+prompt);
for(const f of ['01-出题子应用.json','02-HTML单例外层.json','03-批量生成.json'])JSON.parse(fs.readFileSync(out+'/'+f));
const report={base,edits,checks:{json_parse:true,only_two_system_prompts_changed:true,output_contract_unchanged:true,outer_and_batch_byte_identical:true},model_api_calls:0,online_verified:false,question_quality_verified:false};
fs.writeFileSync(out+'/修改记录.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
