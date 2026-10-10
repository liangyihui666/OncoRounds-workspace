const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const dir=__dirname,out='outputs/HTML与五题联动整改-20260929',base='outputs/完整工作流-Flash五题-20260929';fs.mkdirSync(out,{recursive:true});
const files={child:'01-出题子应用.json',outer:'02-HTML单例外层.json',batch:'03-批量生成.json'};
const original=Object.fromEntries(Object.entries(files).map(([r,f])=>[r,JSON.parse(fs.readFileSync(base+'/'+f))]));const w=structuredClone(original);
const read=f=>fs.readFileSync(path.join(dir,f),'utf8'),node=(r,id)=>w[r].nodes.find(n=>n.nodeId===id),inp=(r,id,k)=>node(r,id).inputs.find(i=>i.key===k);
const once=(s,a,b)=>{assert.equal(s.split(a).length,2,a);return s.replace(a,()=>b);};
function ref(r,id,key,value,type='string'){const n=node(r,id),t=n.inputs.find(i=>i.selectedType==='reference');n.inputs.push({...structuredClone(t),key,label:key,valueType:type,required:false,value});}
function output(r,id,key,type='string'){node(r,id).outputs.push({id:key,key,type:'dynamic',valueType:type,label:key});}
const contract=read('contract.js'),layout=read('layout.js');
let verify=fs.readFileSync('work/evidence-depth-20260929/verification.js','utf8');
verify=verify.replace("const fields=['disease'","const fields=['case_source_text','disease'");
const start=verify.indexOf("    let compact='',positions=[];"),end=verify.indexOf('let offset=0,count=0;',start);
verify=verify.slice(0,start)+`    const normalized=sourceLayout(body),compact=normalized.text,positions=normalized.tokens.map(t=>t.start);
    const needle=sourceLayout(quote).text;`+verify.slice(end);
verify=verify.replace('end=positions[at+needle.length-1]+1','end=normalized.tokens[at+needle.length-1].end').replace("'layout_whitespace_only'","'display_layout_only'");
verify=verify.replace("semantic_support:'not_independently_verified',errors:[]","semantic_support:'not_independently_verified',normalization_policy:'display-layout-1.1-no-clinical-rewrite',errors:[]");
for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2','v12RevisionInput']){
 let c=inp('child',id,'code').value;const oldHelper=fs.readFileSync('work/evidence-depth-20260929/verification.js','utf8');c=once(c,oldHelper,layout+'\n'+verify+'\n'+contract);
 if(id!=='v12RevisionInput'){
  const a=c.indexOf('  function parseCandidate(value)'),b=c.indexOf('  function parsePool(value)',a);assert(a>0&&b>a);
  c=c.slice(0,a)+'  function parseCandidate(value) { return parseQuestionContract(value); }\n\n'+c.slice(b);
  c=once(c,'  const candidate = normalizeQuestionWording(normalizeExplanations(candidateResult.parsed));',"  warnings.push(...(candidateResult.warnings||[]));\n  const candidate = normalizeQuestionWording(normalizeExplanations(candidateResult.parsed));");
 }else{
  c=once(c,'  const previous=parse(inputs.previous_candidate);','  const contractResult=parseQuestionContract(inputs.previous_candidate);\n  const previous=contractResult.parsed;');
  c=once(c,"case_packet:casePacket,previous_candidate_raw:inputs.previous_candidate||'',","case_packet:casePacket,previous_candidate:previous,previous_candidate_raw:previous?'':inputs.previous_candidate||'',contract_error:contractResult.error,contract_warnings:contractResult.warnings,");
  c=once(c,"required_action:'逐题核对内容与证据，不因程序PASS保留错误题；修订或换题后补齐五题，真实方向不足检查最多2个明确假设的延伸方向。'","required_action:'返回完整替换稿：合格题仍原样包含，不是只输出修改题。Q1至Q5全部置于唯一questions数组；不能增加根级Q2等属性。真实方向不足时保留实际完整草稿及缺口，不能虚报5。'");
 }
 inp('child',id,'code').value=c;
}
const common=read('generator.txt').trim();inp('child','sR35QbYF2xamDQR3','systemPrompt').value=common;
inp('child','v12RevisionGenerator','systemPrompt').value='这是第二轮也是最后一轮。返回完整替换稿，不是修订片段。对照contract_error、program_precheck与绑定原文修订；已有合格题必须同样放进输出数组，不能只返回Q1或修订题。原稿有重复questions时重新组织唯一数组，不直接追加第二个questions。每题核对适用边界后再输出，真实引文不等于结论成立。\n\n'+common;
for(const id of ['sR35QbYF2xamDQR3','v12RevisionGenerator'])inp('child',id,'temperature').value=0.1;
let firstInput=inp('child','lUxTeIqSf0zHu2BL','system_textareaInput').value;
firstInput=firstInput.replace('直接接收 OCR 病例字段，保留原文与待核实说明','病例结构化字段与可选患者原文，保留待核实说明').replace('先布局五个不同决策，首轮不足由第二轮补齐','首轮即输出完整五个不同决策；第二轮返回包含合格题的完整替换稿；证据不足须明确缺口，不能承诺后续一定补齐');
inp('child','lUxTeIqSf0zHu2BL','system_textareaInput').value=firstInput;
let packet=inp('child','v12CasePacket','code').value;
packet=once(packet,'"cancer_type", "second_cancer_type"]','"cancer_type", "second_cancer_type", "case_source_text"]');
packet=packet.replaceAll('14字段病例JSON','病例JSON（含可选原文）');
inp('child','v12CasePacket','code').value=packet;
let final=inp('child','v12FinalPublicationNormalize','code').value;
final=final.replace('20260929-evidence-depth-five','20260929-html-five-contract');
// Remove conflicting legacy display mapping: reuse the current outer taxonomy map.
const outerTax=inp('outer','ogy1PAMdD268kXeo','code').value.match(/const TUMOR_DISPLAY_MAP = .*?;/)[0];
final=final.replace(/const TUMOR_DISPLAY_MAP = .*?;/,outerTax);inp('child','v12FinalPublicationNormalize','code').value=final;

inp('outer','glGeIMqOVaSRs5jF','systemPrompt').value=read('html-cleaner.txt');
const extractor=inp('outer','t7eXTzfAM2QUzvvK','systemPrompt').value,whitelist=extractor.slice(extractor.indexOf('["乳腺叶状肿瘤"'));
inp('outer','t7eXTzfAM2QUzvvK','systemPrompt').value=read('extract-core.txt')+whitelist;
for(const id of ['glGeIMqOVaSRs5jF','t7eXTzfAM2QUzvvK']){inp('outer',id,'temperature').value=0;inp('outer',id,'maxToken').value=16000;}
inp('outer','t7eXTzfAM2QUzvvK','aiChatResponseFormat').value='json_object';
inp('outer','d4esByk5Pccmn1gH','code').value=contract+'\n'+read('extraction-json.js');
let html=inp('outer','htmlTextCheck','code').value;
html=once(html," return {text:'【输入来源】HTML文件解析文本。仅依据可见正文；内嵌图片未经过OCR，不能推断图内数据。\\n\\n'+body};",` if(/<(?:html|body|article|main|div|p|section|table|ul|ol|h[1-6])\\b/i.test(body)){
   body=body.replace(/<(script|style|noscript)\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>/gi,'').replace(/<!--[\\s\\S]*?-->/g,'');
   body=body.replace(/<br\\s*\\/?\\s*>/gi,'\\n').replace(/<\\/tr\\s*>/gi,' |\\n').replace(/<\\/(?:p|div|section|article|h[1-6]|li)\\s*>/gi,'\\n').replace(/<\\/(?:td|th)\\s*>/gi,' | ').replace(/<\\/?[a-z][a-z0-9]*(?:\\s[^>]*)?>/gi,'');
   body=body.replace(/&#(x[0-9a-f]+|[0-9]+);/gi,(m,n)=>{const v=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return v>0&&v<=0x10ffff?String.fromCodePoint(v):m;});
   const entities={'&nbsp;':' ','&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"};body=body.replace(/&(?:nbsp|amp|lt|gt|quot|apos);/g,m=>entities[m]).trim();
 }
 if(!body.trim())throw new Error('文档清理后无正文。');
 let h=2166136261;const identity=body.replace(/\\s+/g,' ').trim();for(let i=0;i<identity.length;i++){h^=identity.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
 return {text:'【输入来源】文档解析文本。图片未经OCR，不推断图内数据。\\n\\n'+body,document_text:body,source_id:'CASE-'+h.toString(16).toUpperCase()};`);
inp('outer','htmlTextCheck','code').value=html;output('outer','htmlTextCheck','document_text');output('outer','htmlTextCheck','source_id');
ref('outer','ogy1PAMdD268kXeo','document_text',['htmlTextCheck','document_text']);ref('outer','ogy1PAMdD268kXeo','source_id',['htmlTextCheck','source_id']);
let c=inp('outer','ogy1PAMdD268kXeo','code').value;
// Drop the old constraint-only append helper. Complete patient source now travels separately.
c=c.slice(c.indexOf('const TUMOR_DISPLAY_MAP'));
c=layout+'\n'+read('extraction-guard.js')+'\n'+c;
c=once(c,' const result=buildOriginalCase(args);'," const trace=checkCaseSource(args.cleaned_text,args.document_text);\n const result=buildOriginalCase(args);");
c=once(c,' const extraction_check=preserveConstraintExcerpts(source,args.cleaned_text);'," const extraction_check=trace.report;\n source.case_source_text=trace.body;\n if(args.source_id){source.case_id=args.source_id;result.case_id=source.case_id;}\n source.evidence_notes=[source.evidence_notes||'','【事实来源】case_source_text保留患者原文。结构化字段仅作索引；疑似、时间点、分期冲突须回原文核对。'].filter(Boolean).join('\\n');");
c=once(c,"'cancer_type','second_cancer_type'];","'cancer_type','second_cancer_type','case_source_text'];");
inp('outer','ogy1PAMdD268kXeo','code').value=c;
// Keep compact response; expose extraction revision through existing diagnostic report.
inp('outer','jKqMCN8eJKvkngnI','code').value=inp('outer','jKqMCN8eJKvkngnI','code').value.replaceAll('20260929-full-review-five-outer','20260929-html-five-contract-outer');
const changes=[];
for(const [role,wf] of Object.entries(w)){
 assert.deepEqual(wf.edges,original[role].edges);for(const n of wf.nodes)if(JSON.stringify(n)!==JSON.stringify(original[role].nodes.find(b=>b.nodeId===n.nodeId)))changes.push({role,id:n.nodeId,name:n.name});
 fs.writeFileSync(out+'/'+files[role],JSON.stringify(wf,null,2));
}
fs.writeFileSync(out+'/修改记录.json',JSON.stringify({version:'20260929-html-five-contract',base,files,changes,online_verified:false,retrieval_unchanged:true,batch_unchanged:true,public_contract_unchanged:true,internal_case_source_added:true,prompt_chars:{first_before:inpFrom(original,'child','sR35QbYF2xamDQR3','systemPrompt').length,first_after:common.length,second_after:inp('child','v12RevisionGenerator','systemPrompt').value.length}},null,2));
function inpFrom(v,r,id,k){return v[r].nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key===k).value;}
fs.writeFileSync(out+'/首轮提示词.txt',common);fs.writeFileSync(out+'/第二轮提示词.txt',inp('child','v12RevisionGenerator','systemPrompt').value);
console.log(JSON.stringify({out,changes,prompt_chars:common.length},null,2));
