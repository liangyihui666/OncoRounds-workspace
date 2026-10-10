const fs=require('fs'),assert=require('assert/strict');
const source='outputs/证据公式与英文引文适配-20261008/五题出题子应用-完整工作流.json';
const original=JSON.parse(fs.readFileSync(source,'utf8')),w=structuredClone(original);
const previous='quotes为A/B/C/D四键对象，每项含1至2段绑定正文连续原句，每段中文8至180字符、英文8至400字符。引文须覆盖决定该选项的条件、措施或结果，只有标题、研究名或无关真句不够。非连续文字分为两个元素，不拼接、翻译或改写；保留否定、数值、不等号及表格归属。';
const replacement=`quotes为A/B/C/D四键对象，每项1至2个字符串，每段中文8至180字符、英文8至400字符。先在本题绑定记录中找到支持正确项及排除干扰项的原文，再据此编写题目；没有足够依据就缩小考点或换题。
题干、选项、explain和evidence_summary可忠实概括、翻译或改写；verification.quotes只复制绑定正文中的连续片段。错误项的引文应支持排除理由，不要求原文重复错误主张。可从原句中截取足够完整的连续部分，但必须包含决定判断的条件、否定、数值、单位及推荐强度。不得删中间文字后接合；两个不连续片段分为两个数组元素，不以省略号拼接，不借用其他记录。
表格先核对行标题、列标题及rowspan/colspan归属，再取材。引文可保留原始HTML，跨单元格引用时连同中间标签按原顺序复制；不能将表头、行条件和推荐删标签、跳格或重排成新的“原句”。条件与结论可用两段连续片段分别引用，但解释只能应用同一明确行列关系；两段仍无法保留关键归属时换考点，不让程序猜表格关系。
公式和研究名称照原文复制，保留LaTeX标记、阳性/阴性及排版字符；展示时的可读表达写在解析中，不自行修正引文的检测符号、研究编号或不等号。引文过长优先选完整的关键连续片段，不能为符合长度限制改写。原句存在不等于支持结论，最终仍须核对人群、时点、条件和所作判断。`;
const trailing='\n引文格式：表格引文必须复制绑定正文中的连续片段，可以保留HTML标签；不能删除中间单元格或把多个单元格重排拼成一句话。条件与推荐跨单元格时，核对行列及rowspan归属；引用材料不足就缩小或更换考点。英文原句允许至400字符，直接复制，不为压缩字数改写原文。';
const changes=[];
for(const id of ['sR35QbYF2xamDQR3','v12RevisionGenerator']){
 const n=w.nodes.find(n=>n.nodeId===id),p=n.inputs.find(i=>i.key==='systemPrompt');assert(p.value.includes(previous));
 p.value=p.value.replace(previous,replacement).replace(trailing,'');
 p.value=p.value.replace('options为4个不同字符串，answer为0至3整数','options为4个不同字符串，正文不写A./B./C./D.等字母前缀；answer为0至3整数');
 if(id==='v12RevisionGenerator')p.value=p.value.replace('内部核对材料','引文错误的修订顺序\n收到OPTION_QUOTE_NOT_FOUND时，先定位本题绑定正文：若只需重新摘录即可完整支持原结论，只修verification，保留合格题干、选项、答案及顺序；不得重复提交已失败引文。若条件、表格归属或结论没有来源支持，整体重写该题并同步选项、答案、解析及引文。OPTION_QUOTE_LENGTH应重新选取足够完整且长度合规的连续片段，不改写原文或机械截断关键条件。\n\n内部核对材料');
 changes.push({node:n.name,key:'systemPrompt'});
}
const restored=structuredClone(w);for(const id of ['sR35QbYF2xamDQR3','v12RevisionGenerator'])restored.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='systemPrompt').value=original.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='systemPrompt').value;assert.deepEqual(restored,original);
const dir='outputs/出题引文规则优化-20261008';fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(dir+'/五题出题子应用-完整工作流.json',JSON.stringify(w,null,2));
for(const id of ['sR35QbYF2xamDQR3','v12RevisionGenerator']){const n=w.nodes.find(n=>n.nodeId===id);fs.writeFileSync(dir+'/'+n.name+'-完整提示词.txt',n.inputs.find(i=>i.key==='systemPrompt').value);}
fs.writeFileSync(dir+'/检查结果.json',JSON.stringify({changes,other_nodes_and_code_unchanged:true,schemas_unchanged:true,api_calls:0,model_run_performed:false},null,2));
console.log(JSON.stringify({dir,changes,checks:'passed',api_calls:0}));
