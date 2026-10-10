function main({urls}) {
  const imgUrls=[],docUrls=[],unknownUrls=[],issues=[],manifest=[];
  const seen=new Set();
  for(const value of Array.isArray(urls)?urls:[]) {
    let u=typeof value==='string'?value.trim():'';
    const markdown=u.match(/^\[[\s\S]*\]\((https?:\/\/[\s\S]+)\)$/i);
    if(markdown) u=markdown[1];
    if(!/^https?:\/\/[^\s]+$/i.test(u)){issues.push('存在无效文件链接，请通过文件上传入口重新上传。');continue;}
    if(seen.has(u))continue;
    seen.add(u);
    let p=u.split(/[?#]/)[0];
    try{p=decodeURIComponent(p);}catch(_){}
    const source='F'+(manifest.length+1);
    // Signed alias dots belong to the token, not a filename extension.
    if(/\/api\/system\/file\/d\/[^/]+$/i.test(p)){
      docUrls.push(u);unknownUrls.push(u);manifest.push({source,type:'platform_file',index:docUrls.length});continue;
    }
    let filename=p;
    const nameParam=u.match(/[?&]filename=([^&#]+)/i);
    if(nameParam){try{filename=decodeURIComponent(nameParam[1].replace(/\+/g,' '));}catch(_){}}
    const ext=(filename.match(/\.([a-z0-9]+)$/i)||[,''])[1].toLowerCase();
    if(['jpg','jpeg','png','webp','bmp','tif','tiff'].includes(ext)){
      imgUrls.push(u);manifest.push({source,type:'image',index:imgUrls.length});
    }else if(['pdf','html','htm'].includes(ext)){
      docUrls.push(u);manifest.push({source,type:ext==='pdf'?'pdf':'html',index:docUrls.length});
    }else{manifest.push({source,type:'unsupported',index:0});issues.push(source+'不是可识别的图片/PDF/HTML链接或平台上传短链接。');}
  }
  if(seen.size>8)issues.push('本次文件超过8个，请减少数量后重试，不会截断处理。');
  if(!seen.size)issues.push('请上传同一病例的图片、PDF或HTML。');
  return {imgUrls,docUrls,unknownUrls,manifest:JSON.stringify(manifest),routeIssues:JSON.stringify(issues)};
}
