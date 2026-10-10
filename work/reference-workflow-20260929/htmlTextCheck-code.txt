function main({files,text,rows}) {
 function array(v){
   if(Array.isArray(v)) return v;
   if(typeof v==='string'&&v.trim()){try{const p=JSON.parse(v);return Array.isArray(p)?p:null;}catch(_){}}
   return null;
 }
 const uploads=array(files), records=array(rows);
 if(uploads&&uploads.length>1) throw new Error('当前测试每次只处理一份HTML，请仅保留一个附件。');
 if(records&&records.length>1) throw new Error('文档解析返回多份资料，请每次只上传一份病例HTML。');
 if(records&&records.some(r=>r&&r.error)) throw new Error('文档解析返回错误，请查看“文档解析”的原始响应。');
 let body=typeof text==='string'?text.trim():'';
 const row=records&&records.length===1?records[0]:null;
 if(row&&Object.prototype.hasOwnProperty.call(row,'text')) {
   if(typeof row.text!=='string'||!row.text.trim()) throw new Error('文档已上传，但解析返回空正文；请查看“文档解析”结果。');
   body=row.text.trim();
 }
 if(!body) throw new Error('未收到文档解析正文。请检查本节点text是否引用“文档解析→文档解析结果”，并查看该节点输出；这不代表未上传文件。');
 return {text:'【输入来源】HTML文件解析文本。仅依据可见正文；内嵌图片未经过OCR，不能推断图内数据。\n\n'+body};
}