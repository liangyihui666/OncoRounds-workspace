const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const dir='outputs/证据公式与英文引文适配-20261008';fs.mkdirSync(dir,{recursive:true});
const source='outputs/选项前缀兼容修复-20261008/五题出题子应用-完整工作流.json';
const original=JSON.parse(fs.readFileSync(source,'utf8')),w=structuredClone(original);
for(const id of ['cmuTcUhJefVm2DC6','v12AssemblyR2']){
 const c=w.nodes.find(n=>n.nodeId===id).inputs.find(i=>i.key==='code');
 const anchor="    const tail=s.slice(i);let m;";assert(c.value.includes(anchor));
 c.value=c.value.replace(anchor,anchor+`
    if((m=tail.match(/^(?:\\\\)?\\$([^$\\n]+)\\$/))){
      const inner=m[1].replace(/\\\\$/,'');
      // Only a small whitelist of display commands; unknown formula commands remain literal.
      const plain=inner.replace(/\\\\(?:mathrm|mathbf|mathit)\\{([^{}]*)\\}/g,'$1')
        .replace(/\\\\%/g,'%').replace(/\\\\&/g,'&').replace(/\\\\sim\\b/g,'~')
        .replace(/\\\\geq?\\b/g,'≥').replace(/\\\\leq?\\b/g,'≤');
      if(!/[\\\\{}]/.test(plain)){
        for(const ch of plain.replace(/\\s+/g,''))tokens.push({c:ch,start:i,end:i+m[0].length,math:true});
        i+=m[0].length;continue;
      }
    }
`);
 const space='      if(!(cjk(left)&&cjk(right))&&!htmlCjkBreak&&flat.length)';assert(c.value.includes(space));
 c.value=c.value.replace(space,`      const mathEdge=(flat[flat.length-1]?.math&&/[\\u3400-\\u9fff，。；：]/.test(right||''))||(tokens[j]?.math&&cjk(left));
      const hyphenNumber=left==='-'&&/[A-Za-z0-9]/.test(flat[flat.length-2]?.c||'')&&/[0-9]/.test(right||'');
      if(!(cjk(left)&&cjk(right))&&!htmlCjkBreak&&!mathEdge&&!hyphenNumber&&flat.length)`);
 const length="if(!text(quote)||quote.trim().length<8||quote.length>180)";assert(c.value.includes(length));
 c.value=c.value.replace(length,"if(!text(quote)||quote.trim().length<8||quote.length>(/[\\u3400-\\u9fff]/.test(quote)?180:400))");
 c.value=c.value.replace("原句须为8至180字符的非空字符串，不是关键词或整篇复制。","原句须为非空字符串，中文8至180字符、英文8至400字符，不是关键词或整篇复制。");
 c.value=c.value.replace('display-layout-1.2-html-cjk-break-no-clinical-rewrite','display-layout-1.3-whitelist-math-no-cell-merge');
 new vm.Script(c.value);
}
// Keep the instructions consistent with the mechanical English quotation limit.
for(const n of w.nodes)for(const i of n.inputs||[])if(i.key==='systemPrompt'&&typeof i.value==='string'){
 i.value=i.value.replace('每段8至180字符','每段中文8至180字符、英文8至400字符');
 if(i.value.includes('quotes为A/B/C/D四键对象'))i.value+='\n引文格式：表格引文必须复制绑定正文中的连续片段，可以保留HTML标签；不能删除中间单元格或把多个单元格重排拼成一句话。条件与推荐跨单元格时，核对行列及rowspan归属；引用材料不足就缩小或更换考点。英文原句允许至400字符，直接复制，不为压缩字数改写原文。';
}
let raw=fs.readFileSync('C:/Users/admin/.codex/attachments/a2da3a75-c989-4220-9b4a-17a68d9867d4/已粘贴的文本.txt','utf8');
// The attachment contains invalid JSON escapes (e.g. \$). Recovery is for offline evidence only.
let recovered='';for(let i=0;i<raw.length;){if(raw[i]!=='\\'){recovered+=raw[i++];continue;}let j=i;while(raw[j]==='\\')j++;const count=j-i;recovered+='\\'.repeat(count+(count%2&&!/["\\/bfnrtu]/.test(raw[j]||'')?1:0));i=j;}raw=recovered;
let input;try{input=JSON.parse(raw);}catch(e){throw new Error('真实输入无法恢复，停止验证：'+e.message);}
const candidate=JSON.parse(input.candidate_json);
const getCode=workflow=>workflow.nodes.find(n=>n.nodeId==='cmuTcUhJefVm2DC6').inputs.find(i=>i.key==='code').value;
const funcs=workflow=>vm.runInNewContext(getCode(workflow)+'\n({sourceLayout,verifyCandidateEvidence})');
const prior=funcs(original),next=funcs(w);
console.log('input_keys',Object.keys(input));
const packet=input.case_packet||input.case_data||input;
const a=prior.verifyCandidateEvidence(candidate,input.evidence_pool,packet),b=next.verifyCandidateEvidence(candidate,input.evidence_pool,packet);
const optionErrors=r=>r.question_checks.flatMap(q=>q.errors.filter(e=>/^OPTION_/.test(e.code)).map(e=>q.question_id+' '+e.code+' '+e.message));
const oldErrors=optionErrors(a),newErrors=optionErrors(b);
assert(newErrors.length<oldErrors.length);
assert(b.question_checks.find(q=>q.question_id==='Q2').errors.some(e=>e.code==='OPTION_QUOTE_NOT_FOUND'));
assert(b.question_checks.find(q=>q.question_id==='Q4').errors.some(e=>e.code==='OPTION_QUOTE_NOT_FOUND'));
const layout=next.sourceLayout;
assert.notEqual(layout('$\\geq 1$').text,layout('$\\leq 1$').text);
assert.notEqual(layout('p40+').text,layout('p40-').text);
assert.notEqual(layout('未接受治疗').text,layout('接受治疗').text);
assert.notEqual(layout('<td>甲</td><td>乙</td>').text,layout('甲乙').text);
assert.equal(layout('BRES- 1').text,layout('BRES-1').text);
assert.equal(layout('在 $20\\% \\sim 30\\%$ 之间').text,layout('在20%~30%之间').text);
fs.writeFileSync(dir+'/五题出题子应用-完整工作流.json',JSON.stringify(w,null,2));
fs.writeFileSync(dir+'/真实输入离线检查.json',JSON.stringify({old_option_errors:oldErrors,new_option_errors:newErrors,question_checks:b.question_checks,api_calls:0,medical_review_performed:false,attachment_escape_recovery_for_offline_only:true},null,2));
console.log(JSON.stringify({old:oldErrors.length,new:newErrors.length,remaining:newErrors,dir}));
