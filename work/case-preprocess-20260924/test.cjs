const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const base=__dirname,root=path.resolve(base,'../..');
const out=path.join(root,'outputs/病例资料预处理-20260924');
const report=[];
function run(file,args){return vm.runInNewContext(fs.readFileSync(path.join(base,file),'utf8')+'\nmain(args)',{args});}
function test(name,fn){fn();report.push({name,result:'PASS'});}
const route=a=>run('route.js',a),collect=a=>run('collect.js',a),agg=a=>run('aggregate.js',a);
const finish=a=>JSON.parse(run('finalize.js',a).output);
test('PDF/HTML/图片正确分流，支持大写扩展名及签名参数',()=>{
 const r=route({urls:['https://x/a.PDF?token=t','https://x/b.HTML#p','https://x/c.JpG?v=1']});
 assert.equal(r.docUrls.length,2);assert.equal(r.imgUrls.length,1);assert.equal(r.routeIssues,'[]');
});
test('不将未知文件误当图片',()=>{const r=route({urls:['https://x/file','https://x/a.docx']});assert.equal(r.imgUrls.length,0);assert.equal(JSON.parse(r.routeIssues).length,2);});
test('重复链接只读取一次',()=>assert.equal(route({urls:['https://x/a.pdf','https://x/a.pdf']}).docUrls.length,1));
test('空输入明确报缺失',()=>assert.ok(JSON.parse(route({}).routeIssues).length));
test('本地路径不作为远程图片',()=>assert.equal(route({urls:['C:/temp/a.png']}).imgUrls.length,0));
test('8份以上标记问题而非静默截断',()=>assert.ok(route({urls:Array.from({length:9},(_,i)=>`https://x/${i}.pdf`)}).routeIssues.includes('超过8')));
test('原始HTML可作为独立输入',()=>assert.equal(route({draftData:'<p>患者57岁</p>'}).routeIssues,'[]'));
test('HTML内嵌图片和Markdown图片提取去重',()=>{
 const r=collect({rawHtml:'<p>病例</p><img src="https://x/a.png?a=1&amp;b=2">',docText:'![报告](https://x/b.png)',imgUrls:['https://x/b.png'],routeIssues:'[]'});
 assert.equal(r.ocrUrls.length,2);assert.equal(r.ocrUrls[1],'https://x/a.png?a=1&b=2');
});
test('无法读取的相对图片路径不静默忽略',()=>assert.ok(collect({rawHtml:'<img src="a.png">'}).issues.includes('不是绝对')));
test('清洗脚本但保留医疗不等式',()=>{
 const r=collect({rawHtml:'<script>discard()</script><p>PD-L1<1%；肿物>4cm</p>'});
 assert.ok(!r.textBlocks.includes('discard'));assert.ok(r.textBlocks.includes('PD-L1<1%'));assert.ok(r.textBlocks.includes('>4cm'));
});
test('文档解析空结果和错误均提示',()=>{const r=collect({docUrls:['https://x/a.pdf'],docText:'',docError:'fail'});assert.equal(JSON.parse(r.issues).length,2);});
test('图片数量超限不静默截断OCR',()=>{const r=collect({imgUrls:Array.from({length:25},(_,i)=>`https://x/${i}.jpg`)});assert.equal(r.ocrUrls.length,0);assert.ok(r.issues.includes('超过24'));});
test('OCR少返回一页会阻止提取',()=>assert.equal(agg({expectedImages:2,texts:['患者57岁'],imageLabels:'["图片1","图片2"]',textBlocks:'[]'}).ready,'false'));
test('OCR空页会阻止提取',()=>assert.equal(agg({expectedImages:1,texts:[''],textBlocks:'[]'}).ready,'false'));
test('超长输入不静默截断',()=>{const r=agg({textBlocks:JSON.stringify([{text:'字'.repeat(65001)}])});assert.equal(r.ready,'false');assert.ok(r.sourceText.length>65000);});
test('图片与文档一起聚合，保留来源',()=>{const r=agg({textBlocks:'[{"source":"文档","text":"初诊57岁"}]',expectedImages:1,texts:['后续复查'],imageLabels:'["上传图片1"]'});assert.equal(r.ready,'true');assert.equal(JSON.parse(r.sourceText).materials.length,2);});
const variables=Object.fromEntries(['case_title','disease','case_context','case_timeline','biomarkers','decision_points','adverse_events','evidence_notes','cancer_type','second_cancer_type'].map(k=>[k,'']));
variables.case_title='肺癌病例';variables.case_context='初诊57岁女性';variables.case_mode='全程管理';
const draft={source_sufficiency:'sufficient',patient_count_conflict:false,case_variables:variables,data_quality_notes:[],source_notes:[{field:'case_context',source:'上传图片1'}]};
const good={draft:JSON.stringify(draft),review:'{"decision":"PASS","issues":[]}',ready:'true',issues:'[]'};
test('核对PASS仍为待人工确认草稿，不自动放行',()=>{const r=finish(good);assert.equal(r.extraction_status,'draft_requires_confirmation');assert.equal(r.ready_for_generation,false);assert.equal(r.case_variables.case_intro_images.length,0);});
test('核对异常不伪装PASS',()=>assert.equal(finish({...good,review:'broken'}).extraction_status,'needs_review'));
test('PASS带问题不放行',()=>assert.equal(finish({...good,review:'{"decision":"PASS","issues":["年龄未核实"]}'}).extraction_status,'needs_review'));
test('多个患者拒绝输出合并病例',()=>{const r=finish({...good,draft:JSON.stringify({...draft,patient_count_conflict:true})});assert.equal(r.extraction_status,'insufficient');assert.equal(Object.keys(r.case_variables).length,0);});
test('提取结构错误拒绝',()=>assert.equal(finish({...good,draft:'{}'}).extraction_status,'insufficient'));
test('独立核对不足时清空变量',()=>{const r=finish({...good,review:'{"decision":"STOP_INSUFFICIENT","issues":["正文无病例"]}'});assert.equal(Object.keys(r.case_variables).length,0);});
test('输出显式身份标签拦截',()=>{const d=JSON.parse(good.draft);d.case_variables.case_context='姓名：张三';assert.equal(finish({...good,draft:JSON.stringify(d)}).extraction_status,'insufficient');});
test('预处理失败不使用模型结果',()=>assert.equal(finish({...good,ready:'false',issues:'["OCR不完整"]'}).extraction_status,'insufficient'));
const workflow=JSON.parse(fs.readFileSync(path.join(out,'大查房-病例资料预处理-图片PDFHTML-测试版.json'),'utf8'));
const map=new Map(workflow.nodes.map(n=>[n.nodeId,n]));
function ref(a){assert.equal(a.length,2);if(a[0]==='VARIABLE_NODE_ID'){assert.ok(workflow.chatConfig.variables.some(v=>v.key===a[1]));return;}assert.ok(map.has(a[0]),a[0]);assert.ok(map.get(a[0]).outputs.some(o=>o.id===a[1]||o.key===a[1]),a.join('.'));}
test('节点ID、连线、变量引用完整',()=>{
 assert.equal(map.size,workflow.nodes.length);
 for(const e of workflow.edges){assert.ok(map.has(e.source));assert.ok(map.has(e.target));}
 for(const n of workflow.nodes){
  for(const i of n.inputs){
   if(i.selectedType==='reference'&&Array.isArray(i.value)&&i.value.length){if(Array.isArray(i.value[0]))i.value.forEach(ref);else ref(i.value);}
   if(typeof i.value==='string')for(const m of i.value.matchAll(/\{\{\$([^.]+)\.([^$]+)\$\}\}/g))ref([m[1],m[2]]);
   if(i.key==='ifElseList')for(const c of i.value)for(const x of c.list)ref(x.variable);
  }
 }
});
test('每个条件节点均有有内容和无内容出口',()=>{for(const n of workflow.nodes.filter(n=>n.flowNodeType==='ifElseNode')){for(const b of ['IF','ELSE'])assert.ok(workflow.edges.some(e=>e.source===n.nodeId&&e.sourceHandle.endsWith('-'+b)));}});
test('中间模型不直接输出且历史为零',()=>{for(const n of workflow.nodes.filter(n=>n.flowNodeType==='chatNode')){assert.equal(n.inputs.find(i=>i.key==='isResponseAnswerText').value,false);assert.equal(n.inputs.find(i=>i.key==='history').value,0);}});
test('导出不含原OCR头像签名，保留工具绑定及PDF增强配置',()=>{const s=JSON.stringify(workflow);assert.ok(!s.includes('OSSAccessKeyId'));assert.ok(s.includes('systemTool-lyhOcr/advanced'));assert.equal(workflow.chatConfig.fileSelectConfig.customPdfParse,true);});
const reportData={scope:'离线代码与导出结构校验；不代表FastGPT导入、分支调度、OCR服务、PDF增强服务或模型结果已验证',checks:report,total:report.length,passed:report.length};
fs.writeFileSync(path.join(out,'离线校验报告.json'),JSON.stringify(reportData,null,2));
console.log(`${report.length} checks passed`);
