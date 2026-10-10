const fs=require('fs'),crypto=require('crypto'),path=require('path');
const out='outputs/HTML与五题联动整改-20260929',base='outputs/完整工作流-Flash五题-20260929';
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const files=['01-出题子应用.json','02-HTML单例外层.json','03-批量生成.json'];
const manifest={version:'20260929-html-five-contract',generated_at:new Date().toISOString(),base,workflows:files.map(f=>{const p=path.join(out,f),w=JSON.parse(fs.readFileSync(p));return {file:f,bytes:fs.statSync(p).size,sha256:hash(p),base_sha256:hash(path.join(base,f)),nodes:w.nodes.length,edges:w.edges.length,unchanged_from_base:hash(p)===hash(path.join(base,f))};}),reproduce:{build:'node work/integration-repair-20260929/build.cjs',test:'node work/integration-repair-20260929/test.cjs'},validation:JSON.parse(fs.readFileSync(out+'/回归检查.json'))};
fs.writeFileSync(out+'/文件来源与检查.json',JSON.stringify(manifest,null,2));
console.log(JSON.stringify({files:manifest.workflows.map(f=>({file:f,nodes:f.nodes,edges:f.edges,unchanged:f.unchanged_from_base})),checks:manifest.validation.passed,failed:manifest.validation.failed},null,2));
