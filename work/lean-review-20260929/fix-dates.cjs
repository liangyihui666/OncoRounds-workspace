const fs=require('fs'),assert=require('assert/strict'),vm=require('vm');
const base='outputs/精简版-进阶决策优化-20260929',out='outputs/精简版-病程日期修复-20260930';
const file='02-HTML单例外层.json',w=JSON.parse(fs.readFileSync(base+'/'+file)),old=structuredClone(w);
const code=w.nodes.find(n=>n.nodeId==='jKqMCN8eJKvkngnI').inputs.find(i=>i.key==='code');
const previous=code.value;
const start=previous.indexOf('    const absolute = String.raw`'),end=previous.indexOf('\n    const relative',start);assert(start>0&&end>start);
const replacement='    const calendar = String.raw`(?:19|20)\\d{2}\\s*(?:年(?:\\s*\\d{1,2}\\s*月(?:\\s*\\d{1,2}\\s*日)?)?|[./-]\\s*\\d{1,2}(?:\\s*[./-]\\s*\\d{1,2})?)`;\n'+
 '    const rangeEnd = String.raw`(?:${calendar}|\\d{1,2}\\s*月(?:\\s*\\d{1,2}\\s*日)?)`;\n'+
 '    const absolute = String.raw`${calendar}(?:\\s*[-—–~～至]\\s*${rangeEnd})?`;';
code.value=previous.slice(0,start)+replacement+previous.slice(end);
function timelineRunner(text){const a=text.indexOf('  function buildTimelineItems()'),b=text.indexOf('\n  const timelineItems',a);assert(a>0&&b>a);return vm.runInNewContext('(function(case_timeline){'+text.slice(a,b)+';return buildTimelineItems();})');}
const run=timelineRunner(code.value),before=timelineRunner(previous);
const attachment=JSON.parse(fs.readFileSync('C:/Users/admin/.codex/attachments/867ac01c-260b-45da-b5a7-11359c85311f/已粘贴的文本.txt'));
const rows=attachment.detail.overview.tabs.find(t=>t.id==='timeline').timeline_items;
const input=rows.map(r=>r.detail).join('\n');
const result=run(input);
assert.equal(result.length,14);
for(let i=0;i<rows.length;i++){assert.equal(result[i].date,rows[i].detail.split('：')[0]);assert.equal(result[i].detail,rows[i].detail);}
const fixtures=[['2024年4月：复查','2024年4月'],['2024 年 4 月 9 日：复查','2024 年 4 月 9 日'],['2024 年 5 月 -2025 年 8 月：维持','2024 年 5 月 -2025 年 8 月'],['2024-04-09：复查','2024-04-09'],['2024年4月至8月：治疗','2024年4月至8月'],['术后：复查','术后'],['未注明：2024年4月曾就诊','时间未详'],['治疗期间剂量2024mg','时间未详']];
for(const [s,date]of fixtures)assert.equal(run(s)[0].date,date,s);
assert.equal(run('2024 年 4 月｜复查｜保留原文')[0].date,'2024 年 4 月');
assert.equal(run('2024 年 4 月：初诊；2024 年 5 月：复查').length,2);
new vm.Script(code.value);
const restored=structuredClone(w);restored.nodes.find(n=>n.nodeId==='jKqMCN8eJKvkngnI').inputs.find(i=>i.key==='code').value=previous;assert.deepEqual(restored,old);
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/'+file,JSON.stringify(w,null,2));
for(const f of ['01-出题子应用.json','03-批量生成.json'])fs.copyFileSync(base+'/'+f,out+'/'+f);
fs.writeFileSync(out+'/日期修复核对.json',JSON.stringify({case_id:attachment.Questions.case_id,changed_node:'json生成',scope:'leading_date_recognition_only',before_dates:before(input).map(r=>r.date),after_dates:result.map(r=>r.date),details_unchanged:true,additional_layout_checks:10,api_calls:0,online_verified:false},null,2));
console.log(JSON.stringify({out,before_unknown:before(input).filter(r=>r.date==='时间未详').length,after_unknown:result.filter(r=>r.date==='时间未详').length,rows:result.length}));
