const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..');
const baseFile='outputs/Qwen3.5Plus对照试跑-20260929/01-出题子应用-Qwen3.5Plus对照版.json';
const out=path.join(root,'outputs/五题唯一性与进阶修复-20260929');fs.mkdirSync(out,{recursive:true});
const base=JSON.parse(fs.readFileSync(path.join(root,baseFile),'utf8')),child=structuredClone(base);
const input=(id,key)=>child.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key===key);
const once=(s,a,b)=>{assert.equal(s.split(a).length,2,'anchor: '+a);return s.replace(a,b);};
const old=input('sR35QbYF2xamDQR3','systemPrompt').value;
const protocol=old.slice(old.indexOf('输出协议：')).replace('该项不优先的具体理由','该项与题干已知条件矛盾的具体理由');
const prompt=fs.readFileSync(path.join(__dirname,'rules.txt'),'utf8').trim()+'\n\n'+protocol;
input('sR35QbYF2xamDQR3','systemPrompt').value=prompt;
input('v12RevisionGenerator','systemPrompt').value=`这是第二轮也是最后一轮模型调用，只输出完整修订JSON。程序PASS只代表格式与引用身份检查，不代表医学合格。
按review_plan处理：先看set_review去除重复或过浅考点，再逐题检查option_review四行；这些都是复核任务，不是程序作出的医学结论。对照case_packet、对应完整证据和题干时点，分别核对四项是否成立、排除依据及解析是否对应本选项。即使无关键词命中也须检查全部四项。存在第二个成立选项或无法支持的排除理由，整题重写，不能只润色解析或用“不优先”判错。
structural_defects为须修复的格式问题。复核事实、癌种分期、具体药物及研究终点；不能补患者事实制造唯一答案，不能把待核查线索当作医学裁决。缺依据在missing_information披露，已有5题也不清空核心缺口。删内部编号须保留自足理由。合格题保留选项顺序；仅在重写或补写题时分散正确位置。
以下为共同规则：\n\n`+prompt;
let code=fs.readFileSync(path.join(__dirname,'review.js'),'utf8')+'\n'+input('v12RevisionInput','code').value;
code=once(code,"structural_defects,applicability_review_cues:quality.review_cues,","structural_defects,applicability_review_cues:quality.review_cues,option_review:buildOptionReview(q),");
code=once(code,'review_all_questions:true,','review_all_questions:true,set_review:buildSetReview(questions),');
code=once(code,'同一记录是否也允许另一选项？无法区分就换题；避免将某亚组推荐反推其他亚组绝无获益。','逐项检查是否存在第二个成立的选项、上位与下位包含关系；不优先或未提及不能判错，无法唯一作答就整题重写。');
input('v12RevisionInput','code').value=code;
input('v12FinalPublicationNormalize','code').value=once(input('v12FinalPublicationNormalize','code').value,'20260929-wording-facts-five','20260929-unique-advanced-five');
const changed=child.nodes.filter((n,i)=>JSON.stringify(n)!==JSON.stringify(base.nodes[i]));assert.equal(changed.length,4);assert.deepEqual(child.edges,base.edges);
fs.writeFileSync(path.join(out,'01-出题子应用-Qwen3.5Plus质量修复版.json'),JSON.stringify(child,null,2));
for(const n of changed){const key=n.inputs.some(i=>i.key==='code')?'code':'systemPrompt';fs.writeFileSync(path.join(out,n.name+(key==='code'?'-代码.js':'-系统提示词.txt')),n.inputs.find(i=>i.key===key).value);}
fs.writeFileSync(path.join(out,'修改记录.json'),JSON.stringify({revision:'20260929-unique-advanced-five',base:baseFile,changed_nodes:changed.map(n=>({id:n.nodeId,name:n.name})),node_count:child.nodes.length,edge_count:child.edges.length,core_generation_calls:2,public_schema_changed:false,retrieval_unchanged:true,online_verified:false,medical_correctness_verified:false,prompt_lengths:{first_before:old.length,first_after:prompt.length,revision_before:base.nodes.find(n=>n.nodeId==='v12RevisionGenerator').inputs.find(i=>i.key==='systemPrompt').value.length,revision_after:input('v12RevisionGenerator','systemPrompt').value.length}},null,2));
console.log('Built '+out);
