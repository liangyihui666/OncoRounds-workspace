const fs=require('fs'),assert=require('assert/strict'),vm=require('vm'),path=require('path');
const source='C:/Users/admin/.codex/attachments/b6510a0c-01a5-4cb9-b288-5ce63a116e51/已粘贴的文本.txt';
const out='outputs/OCR文本清洗-完整工作流-20261008';
const original=JSON.parse(fs.readFileSync(source,'utf8')),w=structuredClone(original);
const get=id=>w.nodes.find(n=>n.nodeId===id),item=(id,key)=>get(id).inputs.find(i=>i.key===key);
const removedId='vyzKQjoc7z0gMCFM';
w.nodes=w.nodes.filter(n=>n.nodeId!==removedId);
w.edges=w.edges.filter(e=>e.source!==removedId&&e.target!==removedId);
w.edges.push({source:'448745',target:'htmlTextCheck',sourceHandle:'448745-source-right',targetHandle:'htmlTextCheck-target-left'});
const check=get('htmlTextCheck'),textInput=structuredClone(check.inputs.find(i=>i.key==='text'));
Object.assign(textInput,{key:'ocr_text',label:'ocr_text',valueType:'any',value:['448745','userChatInput']});
check.inputs=check.inputs.filter(i=>!['files','rows','text'].includes(i.key));check.inputs.push(textInput);
check.name='OCR文本输入整理';check.intro='接收上游OCR纯文本或文本数组，保留文字顺序；不读取文件或图片。';
item('htmlTextCheck','code').value=fs.readFileSync(__dirname+'/normalize.js','utf8');
const cleaner=get('glGeIMqOVaSRs5jF');cleaner.name='正文清洗（OCR文本）';
cleaner.intro='清洗已识别的OCR文字，分开患者事实、讨论意见和引用研究，保留OCR歧义。';
item(cleaner.nodeId,'systemPrompt').value=fs.readFileSync('outputs/OCR文本清洗提示词-20261008.txt','utf8').trim();
item(cleaner.nodeId,'maxToken').value=16000;
for(const id of [cleaner.nodeId,'t7eXTzfAM2QUzvvK'])for(const key of ['aiChatVision','aiChatAudio','aiChatVideo','aiChatExtractFiles'])item(id,key).value=false;
// Keep the downstream extraction schema, whitelist and supported-case interface.
const extractor=item('t7eXTzfAM2QUzvvK','systemPrompt');
const replacement='输入是上游OCR文字的清洗结果，不再读取图片。OCR不确定项进入evidence_notes；不得根据常识补小数点、分期、基因位点或阳性/阴性。取样属性、日期或方法未知时保留未知，不能补为胚系或体细胞。不同阶段的结果分别保留；不能用治疗后的尺寸补初诊cT。病例已做治疗、拟讨论方案和研究队列严格区分；引用研究不成为患者用药或疗效。若无足够可靠患者事实，保持字段为空或注明未明确，不补造病例。\n';
extractor.value=replacement+extractor.value;
w.name='OCR文本病例清洗与五题生成';
w.intro='上游OCR文字→输入整理→正文清洗→病例结构化→原有五题子应用→完整JSON返回。每次一例，输入纯文本或同一病例的字符串数组。';
const welcome='直接粘贴一例病例的OCR文字，或粘贴同一病例各页文字的JSON字符串数组，然后发送。上游已经完成OCR，这里不上传文件、不重新识别图片。';
w.chatConfig.welcomeText=welcome;w.chatConfig.welcomeConfig={...w.chatConfig.welcomeConfig,welcomeText:welcome};
w.chatConfig.fileSelectConfig={...w.chatConfig.fileSelectConfig,canSelectFile:false,canSelectImg:false};
// Do not send the entire OCR document as the transport-mode control flag.
const mode=item('jKqMCN8eJKvkngnI','transport_mode');
Object.assign(mode,{selectedType:'input',renderTypeList:['input','reference'],value:'ocr_text'});
fs.mkdirSync(out,{recursive:true});
const output=out+'/OCR文本清洗与五题生成-完整工作流.json';fs.writeFileSync(output,JSON.stringify(w,null,2));
const checks=[];function test(name,run){try{run();checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:e.message});}}
const normalize=vm.runInNewContext(item('htmlTextCheck','code').value+'\nmain');
test('完整JSON及全部代码语法有效',()=>{JSON.parse(fs.readFileSync(output));for(const n of w.nodes)for(const i of n.inputs)if(i.key==='code')new vm.Script(i.value);});
test('全部边连接和变量引用有效，无文档解析引用残留',()=>{
 const ids=new Set(w.nodes.map(n=>n.nodeId));for(const e of w.edges){assert(ids.has(e.source));assert(ids.has(e.target));}
 const ref=(a,b)=>{const n=get(a);assert(n&&n.outputs.some(o=>o.id===b),a+'.'+b);};
 for(const n of w.nodes)for(const i of n.inputs){if(i.selectedType==='reference'&&Array.isArray(i.value)){const refs=typeof i.value[0]==='string'?[i.value]:i.value;for(const r of refs)if(Array.isArray(r))ref(...r);}
  if(i.key!=='code'&&typeof i.value==='string')for(const m of i.value.matchAll(/\{\{\$([^.$]+)\.([^$]+)\$\}\}/g))ref(m[1],m[2]);}
 assert(!JSON.stringify(w).includes(removedId));assert.equal(w.nodes.length,10);assert.equal(w.edges.length,10);
});
test('纯文本及数组/序列化数组依序保留医学字符和日期',()=>{
 const pages=['2024-6-3 基线\nPD-L1 TPS 1%+，PIK3CA p.E542K，31.0%','2024-9-18 复查\n29x26，cT3N3MOIIC；同页cT3N3M0IIIC'];
 for(const input of [pages,JSON.stringify(pages)]){const r=normalize({ocr_text:input});assert(r.text.endsWith(pages.join('\n\n')));}
 assert(normalize({ocr_text:pages[0]}).text.endsWith(pages[0]));
 const malformed='["PS=0\\~1，29x26"]';assert(normalize({ocr_text:malformed}).text.endsWith(malformed));
});
test('空输入/错误类型/URL拒绝，不送入AI猜测',()=>{for(const input of ['',[],['  '],{text:'test'},[null],'https://example.com/case.png'])assert.throws(()=>normalize({ocr_text:input}));});
test('原有下游字段、出题应用绑定、候选检查及JSON组装代码逐字保持',()=>{
 for(const id of ['448745','ogy1PAMdD268kXeo','ddwhzFImUXV1QTsA','bJcPjyWI8hiwuVOS','d4esByk5Pccmn1gH','bTxgvHEhA8qEPFTa'])assert.deepEqual(get(id),original.nodes.find(n=>n.nodeId===id));
 assert.equal(item('jKqMCN8eJKvkngnI','code').value,original.nodes.find(n=>n.nodeId==='jKqMCN8eJKvkngnI').inputs.find(i=>i.key==='code').value);
 assert.equal(extractor.value.slice(replacement.length),original.nodes.find(n=>n.nodeId==='t7eXTzfAM2QUzvvK').inputs.find(i=>i.key==='systemPrompt').value);
});
test('只传文字，不启用模型文件/图片识别；使用附件原模型标识',()=>{for(const id of ['glGeIMqOVaSRs5jF','t7eXTzfAM2QUzvvK']){for(const key of ['aiChatVision','aiChatAudio','aiChatVideo','aiChatExtractFiles'])assert.equal(item(id,key).value,false);assert.equal(item(id,'model').value,original.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='model').value);}assert.equal(w.chatConfig.fileSelectConfig.canSelectFile,false);});
fs.writeFileSync(out+'/离线检查结果.json',JSON.stringify({checks,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,online_verified:false,medical_review_status:'not_performed',model_api_calls:0},null,2));
fs.writeFileSync(out+'/修改记录.json',JSON.stringify({source,removed_nodes:['文档解析'],updated_nodes:['OCR文本输入整理','正文清洗（OCR文本）','病例结构化提取','json生成的transport_mode'],nodes:w.nodes.length,edges:w.edges.length,models:w.nodes.filter(n=>n.flowNodeType==='chatNode').map(n=>({name:n.name,model:n.inputs.find(i=>i.key==='model').value})),model_selection:'preserved_from_uploaded_workflow',subapplication_binding_preserved:true},null,2));
console.log(JSON.stringify({output:path.resolve(output),checks},null,2));if(checks.some(c=>!c.pass))process.exitCode=1;
