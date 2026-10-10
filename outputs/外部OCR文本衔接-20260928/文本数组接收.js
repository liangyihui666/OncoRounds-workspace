function main({ocr_texts}) {
  let texts=ocr_texts;
  if(typeof texts==='string') {
    try {texts=JSON.parse(texts.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));}
    catch(_){throw new Error('请传入OCR接口返回的标准JSON字符串数组，例如 ["识别正文"]。');}
  }
  if(!Array.isArray(texts)||!texts.length||texts.some(t=>typeof t!=='string'||!t.trim()))
    throw new Error('OCR结果必须是非空字符串数组；含空项或错误项时请检查接口结果，不要静默丢弃。');
  if(texts.reduce((n,t)=>n+t.length,0)>65000)
    throw new Error('识别正文超过当前65000字符处理上限；请调整容量或拆分处理，未截断资料。');
  const materials=texts.map((text,i)=>({source:'OCR文本块'+(i+1),text}));
  return {sourceText:JSON.stringify({materials}),issues:'[]',ready:'true'};
}