const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'outputs/五题适用性与主题修复-20260928');fs.mkdirSync(out,{recursive:true});
const base=JSON.parse(fs.readFileSync(path.join(root,'outputs/五题结构与证据边界修复-20260928/01-出题子应用-五题结构与证据边界修复版.json'),'utf8'));
const child=structuredClone(base),input=(id,k)=>child.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key===k);
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8').trim();
function once(s,a,b){assert.equal(s.split(a).length,2,'anchor '+a);return s.replace(a,b);}
let prompt=input('sR35QbYF2xamDQR3','systemPrompt').value;
const start=prompt.indexOf('每题绑定1个实际evidence_id'),end=prompt.indexOf('\n输出协议：');assert(start>=0&&end>start);
prompt=prompt.slice(0,start)+`从case_packet的decision_points、learning_points、adverse_events及病程识别病例独特决策，优先至少2题覆盖核心问题；这些字段只是线索，须与原文核对。不可用检查清单、推荐级别或药名记忆替代特殊人群、关键并发症及换线取舍。核心方向缺依据时，先找同一现有证据池中可支持的相关决策或明确假设；仍缺时在missing_information写清未覆盖内容，即使已有5题也不得清空该缺口。

每题仅绑定一个实际evidence_id，以完整正文检查以下边界：
1. 药物和事件：抗菌药、化疗、AKT/PI3K抑制剂、ICI不能因同叫皮疹而共享停药、激素或再激发规则。跨癌种毒性证据仅在致病药物/类别、事件及管理阶段匹配时可用。药物机制不同或个案换药成功不能独自证明再激发安全。
2. 人群和阶段：明确新辅助、术后辅助、复发转移、转化后状态；不能把III期术后试验直接用于IV期转化后，也不能把新辅助检查频率当作所有晚期治疗的频率。“初始治疗”须核实所处章节；指南收录不等于任何适应证及联合方式均获批。
3. 决策前提：已完成的检查不要写成待补；未记载不是阴性、轻度、已控制或可切除。毒性未分级先补所需评估，不从激素使用或AFP下降推出永久停药。首次与复发性毒性规则分别核对，联合用药须辨别责任药。活动性感染或出血不能仅按一般“不适合强化”表格直接许可化疗、TKI或手术。
4. 论证范围：正确选项每个措施和所有排除理由均须由所绑定记录支持。列表不等于人人必检，未提及不等于反对，未禁止不等于推荐；不能由某亚组不敏感反推另一亚组必须强化，不能由ctDNA预后相关性推出特定方案监测必需。数字趋势或未显著不等于优效、等效、非劣。不同治疗策略不能因为都被指南提及就擅自排优先级。
5. 病例时点：不得用后回报结果支持此前选择，不改写日期、周期、序贯/联合、疾病进展/毒性停药、缓解/维持。不补PS、疗效或分级；疑似保留疑似，点评不作患者事实。假设必须在题干开头标【延伸情境】，即使只加一个未来条件也计入最多2题。
若正确项依据不足或不能排除合理竞争项，整体换成可支持的决策，不能只改解析措辞或删掉限制。clinical_reasoning只应用原文明示原则；只支持急性处理就不附带后续治疗。hard要求记录有hard_evidence_type，clinical_reasoning要求reasoning_eligible=true。来源元数据由程序装配，不写guidelineRef，不借模型记忆补证据。
`+prompt.slice(end);
prompt=prompt.replace('内部证据ID不写入解析。','题干、选项、解析、keyPoint及evidence_summary都不得出现GA01/GB02/GS03/CS01/IR01等内部编号；evidence_id字段正常填写。');
prompt=prompt.replace('新题答案位置自然分散，已有合格题不调序。','首次构思选项时让五题正确位置覆盖至少3个位置，不默认全A。第二轮保留合格题顺序；重写/补写题时分散位置，不为均衡调换合格选项。');
input('sR35QbYF2xamDQR3','systemPrompt').value=prompt;
input('v12RevisionGenerator','systemPrompt').value=`这是第二轮也是最后一轮模型调用，只输出完整修订JSON。先完成每题keyPoint与A/B/C/D理由，再核对5个独立决策。
逐题处理review_plan中的structural_defects和applicability_review_cues。前者为需修复的格式问题，后者只是文字线索，须对照病例与对应完整证据确认，不能据关键词直接删题。程序PASS不代表医学合格。
逐题核对药物、治疗阶段、必需前提、实际已完成检查、首次/再次毒性、竞争方案。出现证据错配时连同题干、选项、解析、知识点和引用整体重写，不能只去掉错误词。删内部编号时必须保留自足论证，不得删成“指南支持”。
检查case_focus是否真正被考查；不能只在题干提到核心并发症却仍问常规检查清单。缺证据在missing_information明确保留，已有5题也不得清空未覆盖的核心问题。答案过度集中时优先修正本来就需要重写的题，不调换内容合格题的选项。保留全部病例限制条件，不得为了成题默认感染控制、毒性轻度或具备手术条件。
以下为共同规则：\n\n`+prompt;
const signals=read('quality_signals.js');
for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2']){
 let code=input(id,'code').value;
 code=signals+'\n'+code;
 code=once(code,"for(const message of teachingErrors(question))", "for(const message of questionQualitySignals(question).format_errors) fail(taskId+'：'+message,questionTask(taskId,'VISIBLE_CONTENT_FORMAT',['question','explain','keyPoint','evidence_summary'],message));\n    for(const message of teachingErrors(question))");
 code=once(code,'  const medicalAuditable =',`  if(questions.length===5 && new Set(questions.map(q=>q?.answer)).size<3) warnings.push('ANSWER_POSITION_CONCENTRATION：答案位置少于3种；新写或重写题时分散，不机械调换合格题选项');
  const medicalAuditable =`);
 input(id,'code').value=code;
}
let rev=input('v12RevisionInput','code').value;
rev=signals+'\n'+rev;
rev=once(rev,'const previous=parse(inputs.previous_candidate);',`const casePacket=parse(inputs.case_packet)||{};
  const previous=parse(inputs.previous_candidate);`);
rev=once(rev,'const matches=full.filter(r=>r.evidence_id===q?.evidence_id);',`const matches=full.filter(r=>r.evidence_id===q?.evidence_id);
    const quality=questionQualitySignals(q,matches.length===1?matches[0]:null);
    structural_defects.push(...quality.format_errors);`);
rev=once(rev,'structural_defects,matching_record_count:', 'structural_defects,applicability_review_cues:quality.review_cues,matching_record_count:');
rev=once(rev,"case_packet:parse(inputs.case_packet),",`case_packet:casePacket,`);
rev=once(rev,"answer_counts:counts,",`case_focus:{decision_points:casePacket.decision_points||'',learning_points:casePacket.learning_points||'',adverse_events:casePacket.adverse_events||'',instruction:'与病例原文核对核心决策，优先至少2题；无法覆盖时在missing_information保留具体缺口，不能用普通题静默替代'},
      answer_position_warning:questions.length===5&&counts.filter(n=>n>0).length<3?'正确位置少于3种；重写/补题时分散，保留合格题选项顺序':'',
      answer_counts:counts,`);
input('v12RevisionInput','code').value=rev;
input('v12FinalPublicationNormalize','code').value=input('v12FinalPublicationNormalize','code').value.replace('20260928-structured-five','20260928-applicability-five');
assert.deepEqual(child.edges,base.edges);
const changed=child.nodes.filter((n,i)=>JSON.stringify(n)!==JSON.stringify(base.nodes[i]));assert.equal(changed.length,6);
fs.writeFileSync(path.join(out,'01-出题子应用-五题适用性与主题修复版.json'),JSON.stringify(child,null,2));
for(const n of changed){const key=n.inputs.some(i=>i.key==='code')?'code':'systemPrompt';fs.writeFileSync(path.join(out,n.name+(key==='code'?'-代码.js':'-系统提示词.txt')),n.inputs.find(i=>i.key===key).value);}
fs.writeFileSync(path.join(out,'修改记录.json'),JSON.stringify({revision:'20260928-applicability-five',base:'20260928-structured-five',changed_nodes:changed.map(n=>({id:n.nodeId,name:n.name})),knowledge_base_and_queries_unchanged:true,checkmate_source_conflict:'out_of_scope_per_user',public_schema_unchanged:true,model_calls:2,online_verified:false,medical_correctness_verified:false},null,2));
console.log('Built '+out);
