const fs=require('fs'),vm=require('vm');
const dir='outputs/全流程复核优化-20260929/';
let suite=fs.readFileSync('work/full-workflow-audit-20260928/test.cjs','utf8');
suite=suite.replace("const slim=process.argv.includes('--slim');",'const slim=false;')
 .replace(/const dir=.*?;\n/,`const dir='${dir}';\n`)
 .replace(/const child=load\(dir.*?;\n/,`const child=load(dir+'01-出题子应用-全流程优化版.json'),outer=load(dir+'02-HTML单例外层-全流程优化版.json');\n`);
let extra=fs.readFileSync('work/structured-five-20260928/test.cjs','utf8').match(/const extra=String.raw`([\s\S]*?)`;\r?\n/)[1];
extra=extra.replace(/test\('修改六个节点[\s\S]*?\n\}\);/,`test('全流程修改范围明确，模型参数与原检索节点保持一致',()=>{
 const base=load('outputs/选项重复与答案布局修复-20260929/01-出题子应用-Flash选项去重复版.json');
 assert.deepEqual(child.edges,base.edges);
 const allowed=new Set(['sR35QbYF2xamDQR3','v12RevisionGenerator','v12RevisionInput','nWJ1txLnlLszyUU5','v12FinalPublicationNormalize']);
 for(const n of child.nodes){const b=base.nodes.find(x=>x.nodeId===n.nodeId);if(!allowed.has(n.nodeId))assert.deepEqual(n,b);assert.deepEqual(n.outputs,b.outputs);
  for(const i of b.inputs)if(!['code','systemPrompt'].includes(i.key))assert.deepEqual(n.inputs.find(j=>j.key===i.key),i);
  const added=n.inputs.filter(i=>!b.inputs.some(j=>j.key===i.key));assert.equal(added.length,n.nodeId==='v12FinalPublicationNormalize'?1:0);
  if(added.length)assert.deepEqual(added[0].value,['sR35QbYF2xamDQR3','answerText']);
 }
});`);
extra=extra.replaceAll('20260928-structured-five','20260929-full-review-five').replaceAll('outputs/批量五题兼容修复-20260928/批量生成-五题兼容修复版.json',dir+'03-批量生成-全流程优化版.json');
for(const file of ['work/applicability-five-20260928/cases.js','work/wording-facts-20260929/cases.js','work/uniqueness-five-20260929/cases.js','work/source-scope-20260929/cases.js','work/option-variety-20260929/cases.js','work/full-review-20260929/cases.js'])extra+='\n'+fs.readFileSync(file,'utf8').replace('n.inputs=b.inputs;','n.inputs=b.inputs;n.outputs=b.outputs;');
suite=suite.replace('const datasetConfig=',extra+'\nconst datasetConfig=');
fs.writeFileSync('work/full-review-20260929/compiled-test.cjs',suite);
vm.runInThisContext('(function(require){'+suite+'\n})',{filename:'full-review-suite.cjs'})(require);
