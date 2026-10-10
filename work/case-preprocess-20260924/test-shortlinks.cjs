const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const out=path.resolve(__dirname,'../../outputs/病例资料预处理-20260924');
const w=JSON.parse(fs.readFileSync(path.join(out,'大查房-病例预处理-仅上传文件-短链接修复版.json'),'utf8'));
const old=JSON.parse(fs.readFileSync(path.join(out,'大查房-病例预处理-仅上传文件-测试版.json'),'utf8'));
const code=id=>w.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='code').value;
const run=(id,args)=>vm.runInNewContext(code(id)+'\nmain(args)',{args});
const a='https://example.test/api/system/file/d/sample.expiry.signature_A';
const b='https://example.test/api/system/file/d/sample.expiry.signature_B';
const checks=[];function test(name,fn){fn();checks.push({name,result:'PASS'});}
test('平台短链接不按token后缀拦截',()=>{const r=run('routeFiles',{urls:[a]});assert.equal(r.routeIssues,'[]');assert.equal(r.docUrls[0],a);assert.equal(r.unknownUrls[0],a);});
test('Markdown包装的链接被正确取出',()=>assert.equal(run('routeFiles',{urls:[`[文件](${a})`]}).docUrls[0],a));
test('普通PDF HTML 图片仍正确分流',()=>{const r=run('routeFiles',{urls:['https://x/a.pdf?token=1','https://x/a.HTML','https://x/b.png']});assert.equal(r.docUrls.length,2);assert.equal(r.imgUrls.length,1);});
test('filename查询参数可识别',()=>assert.equal(run('routeFiles',{urls:['https://x/download?filename=report.PDF']}).docUrls.length,1));
test('不支持格式仍明确报错',()=>assert.ok(run('routeFiles',{urls:['https://x/a.exe']}).routeIssues.includes('不是可识别')));
test('PDF短链接解析成功后不进入OCR',()=>{const r=run('collectFiles',{docUrls:[a],unknownUrls:[a],docText:'患者57岁',docRaw:[{url:a,filename:'case.pdf',text:'患者57岁'}]});assert.equal(r.ocrUrls.length,0);assert.equal(r.issues,'[]');});
test('平台过滤的图片短链接进入OCR',()=>{const r=run('collectFiles',{docUrls:[a],unknownUrls:[a],docText:'',docRaw:[]});assert.equal(r.ocrUrls[0],a);assert.equal(r.issues,'[]');});
test('PDF和图片混传分别处理',()=>{const r=run('collectFiles',{docUrls:[a,b],unknownUrls:[a,b],docText:'患者57岁',docRaw:[{url:a,text:'患者57岁'}]});assert.equal(r.ocrUrls.length,1);assert.equal(r.ocrUrls[0],b);});
test('PDF解析报错不得假装图片绕过',()=>{const r=run('collectFiles',{docUrls:[a],unknownUrls:[a],docText:'error',docRaw:[{url:a,text:'',error:'parse failed'}]});assert.equal(r.ocrUrls.length,0);assert.ok(r.issues.includes('失败或为空'));});
test('缺少原始响应不得推断图片',()=>{const r=run('collectFiles',{docUrls:[a],unknownUrls:[a]});assert.equal(r.ocrUrls.length,0);assert.ok(r.issues.includes('原始响应'));});
test('节点整体错误不得回退OCR',()=>{const r=run('collectFiles',{docUrls:[a],unknownUrls:[a],docRaw:[],docError:'fail'});assert.equal(r.ocrUrls.length,0);assert.notEqual(r.issues,'[]');});
test('响应链接不匹配时阻止自动分流',()=>{const r=run('collectFiles',{docUrls:[a],unknownUrls:[a],docText:'病例',docRaw:[{url:b,text:'病例'}]});assert.equal(r.ocrUrls.length,0);assert.ok(r.issues.includes('无法对应'));});
test('HTML文档的内嵌报告继续OCR',()=>{const r=run('collectFiles',{docUrls:[a],unknownUrls:[a],docText:'<p>病例</p><img src="https://x/r.png">',docRaw:[{url:a,text:'病例'}]});assert.equal(r.ocrUrls[0],'https://x/r.png');});
test('无前置表单且最终输出代码未改变',()=>{assert.equal(w.chatConfig.variables.length,0);assert.deepEqual(w.nodes.find(n=>n.nodeId==='finalize'),old.nodes.find(n=>n.nodeId==='finalize'));});
test('代码语法和所有变量引用完整',()=>{
 const map=new Map(w.nodes.map(n=>[n.nodeId,n]));
 for(const n of w.nodes){
  if(n.flowNodeType==='code')new vm.Script(code(n.nodeId));
  for(const i of n.inputs){
   if(i.selectedType==='reference'&&Array.isArray(i.value)&&i.value.length){
    const refs=Array.isArray(i.value[0])?i.value:[i.value];
    for(const r of refs)assert.ok(map.get(r[0]).outputs.some(o=>o.id===r[1]||o.key===r[1]),r.join('.'));
   }
  }
 }
});
fs.writeFileSync(path.join(out,'短链接修复-离线校验报告.json'),JSON.stringify({scope:'离线模拟平台响应；未对用户的签名链接发出请求，未验证部署版本和线上解析服务',passed:checks.length,checks},null,2));
console.log(checks.length+' checks passed');
