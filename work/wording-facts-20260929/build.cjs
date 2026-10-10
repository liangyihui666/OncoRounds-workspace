const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'outputs/题干措辞与病例事实修复-20260929');fs.mkdirSync(out,{recursive:true});
const base=JSON.parse(fs.readFileSync(path.join(root,'outputs/五题适用性与主题修复-20260928/01-出题子应用-五题适用性与主题修复版.json'),'utf8'));
const child=structuredClone(base),input=(id,key)=>child.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key===key);
const once=(s,a,b)=>{assert.equal(s.split(a).length,2,'anchor '+a);return s.replace(a,b);};
let prompt=input('sR35QbYF2xamDQR3','systemPrompt').value;
prompt=once(prompt,'先选5个有证据的决策再写完整题。','题干用自然临床语言，通常以“下列哪项正确？”“以下处理正确的是？”结尾；不问“最符合指南推荐/指南建议的是”，不把推荐级别、研究数字或指南原句记忆当作核心考点。指南名称及依据放在解析和引用中；确需研究适用性判断时可在题干保留研究名称、设计和人群。不能只换问法而保留多个同时正确的选项。\n\n先选5个有证据的决策再写完整题。');
prompt=once(prompt,'3. 决策前提：','3. 决策前提：所有患者特异事实须能在case_packet找到对应原句。不能把指南定义中的阈值填成患者实测值，不能将总疗程数当作某部位疗程数；检查已完成与尚未记载分开。白细胞减少、贫血、中性粒细胞减少及各自分级不能互换；心功能分级不能代替LVEF数值，体能良好不能直接补成PS 0。');
prompt=once(prompt,'4. 论证范围：','4. 论证范围：原文“可考虑/可能需要/根据病情”的限定词和并列备选措施必须保留，不能删去“或减量”等选项后把永久停药设为唯一答案。原文“首次且在特定时间内恢复可不减量”不能缩成“已缓解均可原剂量”。后线序贯研究不能支持治疗中加药；一般综合评估原则不能独自支持停药、不恢复、引流或其他具体处置。');
prompt=once(prompt,'若正确项依据不足或不能排除合理竞争项，','解析对三个错误选项的排除同样逐句追溯：不借另一个未绑定记录增加突变门槛、药物禁忌、统计显著性、分期或剂量结论；免疫组化替代分型与基因表达内在分型须区分，原记录未给具体TNM数字时不自行举例补出。\n若正确项依据不足或不能排除合理竞争项，');
const old=input('sR35QbYF2xamDQR3','systemPrompt').value;
input('sR35QbYF2xamDQR3','systemPrompt').value=prompt;
let revision=input('v12RevisionGenerator','systemPrompt').value;
revision=once(revision,old,prompt);
revision=once(revision,'逐题核对药物、治疗阶段、必需前提、实际已完成检查、首次/再次毒性、竞争方案。','逐题核对题干及解析中每个患者数值、检查、诊断、分级、部位、疗程是否有病例原句；找不到则删除该条件或在确有适用证据时明确改成延伸情境，不得因该条件有利于唯一作答就补入。对照证据保留限定词及备选措施，检查排除理由有没有新增来源不支持的断言。最后按自然临床问法改写题干，不问最符合指南推荐。');
input('v12RevisionGenerator','systemPrompt').value=revision;
const newSignals=`  if(/可能|可考虑|根据病情|视.{0,8}(?:情况|病情)|或減量|或减量/.test(source)&&/永久|无需|必须|立即|直接|原剂量|引流|不恢复/.test(text))cues.push('QUALIFIER_LOSS_CHECK：证据含可能、可考虑或条件限制；核对答案与所有排除理由是否删去条件或并列备选措施，不将可能处置升级为唯一必做。');
  if(/中性粒|白细胞|PS\\s*[0-4]|ECOG|LVEF|心功能|放疗|强膜染色|\\d+%/.test(stem))cues.push('CASE_FACT_TRACE：将题干中的指标类型、等级、数值、部位及疗程逐项对照病例原句，不能拿指南阈值或另一指标补成患者事实。');
  if(/序贯|后线|二线|进展后/.test(source)&&/治疗期间|加用|联合/.test(stem))cues.push('SEQUENCE_VS_COMBINATION：核对停前药后换线与保留前药加药的区别；序贯后线证据不能自动支持同期联合。');
`;
for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2','v12RevisionInput']){
 let code=input(id,'code').value;
 code=once(code,'  return {format_errors:errors,review_cues:cues};',newSignals+'  return {format_errors:errors,review_cues:cues};');
 if(id!=='v12RevisionInput'){
   code=fs.readFileSync(path.join(__dirname,'wording.js'),'utf8')+'\n'+code;
   code=once(code,'const candidate = normalizeExplanations(candidateResult.parsed);','const candidate = normalizeQuestionWording(normalizeExplanations(candidateResult.parsed));');
 }else{
   code=once(code,"structural_defects,applicability_review_cues:quality.review_cues,",`structural_defects,applicability_review_cues:quality.review_cues,
      wording_review:/最符合|符合.{0,12}(?:指南|共识)|按指南/.test(q?.question||'')?'改为临床情境加下列哪项正确，依据放解析和引用；不改变题意或选项顺序':'',
      fact_review:'逐项核对患者数值、分级、检查、部位和疗程的病例原句；缺少记录不能补成事实',`);
 }
 input(id,'code').value=code;
}
input('v12FinalPublicationNormalize','code').value=input('v12FinalPublicationNormalize','code').value.replace('20260928-applicability-five','20260929-wording-facts-five');
const changed=child.nodes.filter((n,i)=>JSON.stringify(n)!==JSON.stringify(base.nodes[i]));assert.equal(changed.length,6);assert.deepEqual(child.edges,base.edges);
fs.writeFileSync(path.join(out,'01-出题子应用-题干措辞与病例事实修复版.json'),JSON.stringify(child,null,2));
for(const n of changed){const key=n.inputs.some(i=>i.key==='code')?'code':'systemPrompt';fs.writeFileSync(path.join(out,n.name+(key==='code'?'-代码.js':'-系统提示词.txt')),n.inputs.find(i=>i.key===key).value);}
fs.writeFileSync(path.join(out,'修改记录.json'),JSON.stringify({revision:'20260929-wording-facts-five',changed_nodes:changed.map(n=>({id:n.nodeId,name:n.name})),node_count:child.nodes.length,edge_count:child.edges.length,model_calls:2,public_schema_changed:false,retrieval_unchanged:true,online_verified:false,medical_correctness_verified:false},null,2));
console.log('Built '+out);
