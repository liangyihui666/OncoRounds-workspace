// Conservative display normalization with offsets back to the unmodified source.
// Cell/row boundaries are not removed. English word boundaries and medical signs remain.
function sourceLayout(value) {
  const s=String(value||''),tokens=[];
  const emit=(text,start,end)=>{for(const c of text)tokens.push({c,start,end});};
  for(let i=0;i<s.length;){
    const tail=s.slice(i);let m;
    if((m=tail.match(/^<br\s*\/?\s*>/i))){emit(' ',i,i+m[0].length);i+=m[0].length;continue;}
    if((m=tail.match(/^<\/?(?:b|strong|em|i|span)(?:\s[^>]*)?>/i))){i+=m[0].length;continue;}
    if((m=tail.match(/^&(?:nbsp|amp|lt|gt|quot|apos);/))){const map={'&nbsp;':' ','&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"};emit(map[m[0]],i,i+m[0].length);i+=m[0].length;continue;}
    if((m=tail.match(/^\\+(\$|%|~|sim\b)/))){emit(m[1]==='$'?'':m[1]==='sim'?'~':m[1],i,i+m[0].length);i+=m[0].length;continue;}
    emit(s[i],i,i+1);i++;
  }
  const cjk=c=>/[\u3400-\u9fff]/.test(c||''),flat=[];
  for(let i=0;i<tokens.length;i++){
    if(/\s/.test(tokens[i].c)){
      let j=i+1;while(j<tokens.length&&/\s/.test(tokens[j].c))j++;
      if(!(cjk(flat[flat.length-1]?.c)&&cjk(tokens[j]?.c))&&flat.length)flat.push({c:' ',start:tokens[i].start,end:tokens[j-1].end});
      i=j-1;
    }else flat.push(tokens[i]);
  }
  if(flat[flat.length-1]?.c===' ')flat.pop();
  return {text:flat.map(t=>t.c).join(''),tokens:flat};
}
