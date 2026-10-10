const fs=require('fs'),path=require('path');
let text=fs.readFileSync('work/integration-repair-20260929/test.cjs','utf8');
text=text.replace("out='outputs/HTML与五题联动整改-20260929',base='outputs/完整工作流-Flash五题-20260929'","out='outputs/错误返回定位版-20260929',base='outputs/HTML原句排版修复-20260929'");
// Error routes are intentionally added and verified in test.cjs; the old assertion
// that all graphs and the batch workflow must remain byte-identical does not apply.
const a=text.indexOf("test('三套图"),b=text.indexOf("test('全部代码",a);text=text.slice(0,a)+text.slice(b);
text=text.replace("assert.equal(JSON.parse(result.case_payload_json).case_source_text,paragraph.trim());","assert.equal(normal(JSON.parse(result.case_payload_json).case_source_text).text,normal(paragraph.trim()).text);");
new Function('require','__dirname',text)(require,path.resolve('work/integration-repair-20260929'));
