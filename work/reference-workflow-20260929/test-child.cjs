const fs=require('fs'),path=require('path');let s=fs.readFileSync('work/integration-repair-20260929/test.cjs','utf8');
s=s.replace("out='outputs/HTML与五题联动整改-20260929',base='outputs/完整工作流-Flash五题-20260929'","out='outputs/参考版恢复-五题适配-20260929',base='outputs/错误返回定位版-20260929'");
const a=s.indexOf("test('三套图"),b=s.indexOf("test('全部代码",a);s=s.slice(0,a)+s.slice(b);
s=s.slice(0,s.indexOf("const html=fn('outer'"))+`\nfs.writeFileSync(out+'/五题核心回归.json',JSON.stringify({checks,passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,actual_structure_replay:actual,online_verified:false},null,2));console.log(JSON.stringify({passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass)},null,2));if(checks.some(x=>!x.pass))process.exitCode=1;`;
new Function('require','__dirname',s)(require,path.resolve('work/integration-repair-20260929'));
