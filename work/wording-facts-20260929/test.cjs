const fs=require('fs'),vm=require('vm');
let test=fs.readFileSync('work/structured-five-20260928/test.cjs','utf8');
test=test.replaceAll('outputs/五题结构与证据边界修复-20260928/','outputs/题干措辞与病例事实修复-20260929/').replaceAll('01-出题子应用-五题结构与证据边界修复版.json','01-出题子应用-题干措辞与病例事实修复版.json').replaceAll('20260928-structured-five','20260929-wording-facts-five');
const anchor="extra+'\\nconst datasetConfig='";if(!test.includes(anchor))throw Error('missing anchor');
test=test.replace(anchor,"extra+fs.readFileSync('work/applicability-five-20260928/cases.js','utf8')+fs.readFileSync('work/wording-facts-20260929/cases.js','utf8')+'\\nconst datasetConfig='");
vm.runInThisContext('(function(require){'+test+'\n})',{filename:'wording-facts-suite.cjs'})(require);
