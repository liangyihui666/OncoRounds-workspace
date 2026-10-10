const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source='outputs/解析内病例对照-不增字段-20261008/01-五题出题子应用-完整工作流.json';
const original=JSON.parse(fs.readFileSync(source,'utf8')),w=structuredClone(original);
const helper=`
function normalizeOptionPrefixes(candidate) {
  if(!candidate || !Array.isArray(candidate.questions)) return candidate;
  for(const q of candidate.questions) {
    if(!q || !Array.isArray(q.options) || q.options.length!==4) continue;
    const original=q.options.slice();
    q.options=original.map((text,index)=>{
      if(typeof text!=='string') return text;
      const match=text.match(/^\\s*([A-D])\\s*[)）.、：:]\\s*/);
      return match && match[1]==='ABCD'[index] ? text.slice(match[0].length) : text;
    });
    // Synchronize only a previously exact answer. Never conceal a mismatch.
    if(Number.isInteger(q.answer) && q.answer>=0 && q.answer<4 && q.answer_text===original[q.answer]) q.answer_text=q.options[q.answer];
  }
  return candidate;
}
`;
const anchor='const candidate = normalizeQuestionWording(normalizeExplanations(candidateResult.parsed));';
for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2']){
  const c=w.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='code');assert(c.value.includes(anchor));
  c.value=helper+'\n'+c.value.replace(anchor,'const candidate = normalizeOptionPrefixes(normalizeQuestionWording(normalizeExplanations(candidateResult.parsed)));');
  new vm.Script(c.value);
}
const normalize=vm.runInNewContext(helper+'\nnormalizeOptionPrefixes');
const question=(options,answer=1,answer_text=options[answer])=>({options,answer,answer_text,explain:'原解析',verification:{quotes:{A:['原引文']} }});
const five={questions:Array.from({length:5},()=>question(['A. 甲','B、乙','C：丙','D) 丁']))};
normalize(five);for(const q of five.questions){assert.deepEqual(q.options,['甲','乙','丙','丁']);assert.equal(q.answer_text,'乙');assert.equal(q.answer,1);assert.equal(q.explain,'原解析');assert.deepEqual(q.verification,{quotes:{A:['原引文']}});}
const wrong={questions:[question(['B. 甲','B. 乙','C. 丙','D. 丁'])]};normalize(wrong);assert.equal(wrong.questions[0].options[0],'B. 甲');
const mismatch={questions:[question(['A. 甲','B. 乙','C. 丙','D. 丁'],1,'错误答案文字')]};normalize(mismatch);assert.equal(mismatch.questions[0].answer_text,'错误答案文字');
const ordinary={questions:[question(['ALK阴性','BRAF突变','CT复查','DNA检测'])]};const copy=structuredClone(ordinary);normalize(ordinary);assert.deepEqual(ordinary,copy);
const twice=JSON.stringify(five);normalize(five);assert.equal(JSON.stringify(five),twice);
assert.deepEqual(w.edges,original.edges);assert.deepEqual(w.chatConfig,original.chatConfig);
const restored=structuredClone(w);for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2'])restored.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='code').value=original.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='code').value;assert.deepEqual(restored,original);
const dir='outputs/选项前缀兼容修复-20261008';fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(dir+'/五题出题子应用-完整工作流.json',JSON.stringify(w,null,2));
fs.copyFileSync('outputs/参考旧版病程阶段标题-20261008/外层完整工作流-病程阶段标题.json',dir+'/外层完整工作流-病程阶段标题.json');
fs.writeFileSync(dir+'/检查结果.json',JSON.stringify({five_question_prefix_normalization:true,answer_synced:true,wrong_letter_preserved_for_rejection:true,answer_mismatch_preserved_for_rejection:true,ordinary_gene_names_unchanged:true,idempotent:true,only_two_code_nodes_changed:true,api_calls:0,online_verified:false,medical_review_performed:false},null,2));
console.log(JSON.stringify({file:dir+'/五题出题子应用-完整工作流.json',checks:'passed',api_calls:0}));
