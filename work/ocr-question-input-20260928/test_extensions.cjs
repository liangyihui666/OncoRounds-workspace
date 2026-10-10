const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const dir='outputs/延伸情境与逐项解析-20260928/';
const child=JSON.parse(fs.readFileSync(dir+'01-出题子应用.json','utf8')),outer=JSON.parse(fs.readFileSync(dir+'02-HTML测试外层.json','utf8'));
const helper=fs.readFileSync(dir+'解析检查.js','utf8');const validate=vm.runInNewContext(helper+'\nteachingErrors');
const explain=['A｜不正确：本例的条件不满足该方案适用范围。','B｜正确：当前病例条件与证据支持该方案优先。','C｜不正确：该方案适用另一治疗阶段，本例不符合。','D｜不正确：本例尚未满足采用该行动的前提。'].join('\n');
const q={id:'Q1',type:'治疗决策',question:'【延伸情境】假设后续出现某条件，应如何决策？',options:['甲方案','乙方案','丙方案','丁方案'],answer:1,answer_text:'乙方案',phase:'延伸情境·方案选择',timepoint:'假设后续',explain,keyPoint:'适用条件决定方案',guidelineRef:{evidence_type:'指南'}};
const results=[];function test(name,fn){fn();results.push({name,pass:true});}
test('全部代码节点语法有效',()=>{for(const d of [child,outer])for(const n of d.nodes)for(const i of n.inputs||[])if(i.key==='code')new vm.Script(i.value);});
test('四行正误与答案对应',()=>assert.equal(validate(q).length,0));
test('缺行、错误字母、多个正确项均拦截',()=>{assert(validate({...q,explain:explain.split('\n').slice(0,3).join('\n')}).length);assert(validate({...q,explain:explain.replace('D｜','A｜')}).length);assert(validate({...q,explain:explain.replace('A｜不正确','A｜正确')}).length);});
test('延伸标记须有明确假设',()=>assert(validate({...q,question:'【延伸情境】患者发生进展，如何决策？'}).length));
test('800字上限',()=>assert(validate({...q,explain:explain+'字'.repeat(801)}).length));
const code=id=>child.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='code').value;
test('两轮结构检查执行延伸题数量约束',()=>{
 for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2']){
  const s=code(id);const start=s.indexOf('  const extensionIds=');const end=s.indexOf('  for (let index',start);
  let errors=[];const scope={questions:[1,2,3].map(i=>({...q,id:'Q'+i})),setTask:(...a)=>a,fail:(msg)=>errors.push(msg)};
  vm.runInNewContext(s.slice(start,end),scope);assert.equal(errors.length,1);
  errors=[];scope.questions=scope.questions.slice(0,2);vm.runInNewContext(s.slice(start,end),{...scope});assert.equal(errors.length,0);
 }
});
test('最终输出保留原选项、答案与四行解析',()=>{
 const s=outer.nodes.find(n=>n.nodeId==='jKqMCN8eJKvkngnI').inputs.find(i=>i.key==='code').value;
 const a=s.indexOf('  const questions = source.questions.map'),b=s.indexOf('  prepared.report.option_style_checks',a);
 const prep={targets:[3],report:{selected:[{}],warnings:[]}};
 const result=vm.runInNewContext(helper+s.slice(a,b)+'\nquestions',{source:{questions:[q]},prepared:prep,letters:['A','B','C','D']});
 assert.equal(result[0].answer,'B');assert.equal(result[0].options.B,'乙方案');assert.equal(result[0].explain,explain);assert.equal(prep.report.selected[0].answer_mapping.order_preserved,true);
});
test('终稿拒绝模型再次改写解析或去掉假设',()=>{
 const s=outer.nodes.find(n=>n.nodeId==='jKqMCN8eJKvkngnI').inputs.find(i=>i.key==='code').value;
 const edit=vm.runInNewContext(s+'\napplyEditorialEdits');const selected=[q];const report={};assert.equal(edit(selected,'{}',report),selected);
});
test('最终状态拒绝格式错误候选而不偷换审核绑定',()=>{
 const main=vm.runInNewContext(code('v12FinalPublicationNormalize')+'\nmain');
 const bad={schema_version:'1.1',questions:[{...q,explain:'只有总解析'}]};
 const r=main({r1_candidate:JSON.stringify(bad)});assert.equal(r.output_ready,false);
});
fs.writeFileSync(dir+'离线验证报告.json',JSON.stringify({checks:results,online_verified:false},null,2));console.log(results.length+' checks passed; model performance not tested.');
