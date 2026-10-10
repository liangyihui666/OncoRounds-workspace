const fs=require('fs'),path=require('path');
let test=fs.readFileSync('work/integration-repair-20260929/test.cjs','utf8');
test=test.replace("out='outputs/HTML与五题联动整改-20260929',base='outputs/完整工作流-Flash五题-20260929'","out='outputs/HTML原句排版修复-20260929',base='outputs/HTML与五题联动整改-20260929'");
// The fix restores source slices and separates paragraphs. Compare display text,
// not the old cleaner-selected line separators; every returned slice is checked separately.
test=test.replace("assert.equal(JSON.parse(result.case_payload_json).case_source_text,paragraph.trim());","assert.equal(normal(JSON.parse(result.case_payload_json).case_source_text).text,normal(paragraph.trim()).text);");
new Function('require','__dirname',test)(require,path.resolve('work/integration-repair-20260929'));
