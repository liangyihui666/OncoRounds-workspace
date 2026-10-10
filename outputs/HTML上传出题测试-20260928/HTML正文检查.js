function main({files,text,rows}) {
 if(!Array.isArray(files)||files.length!==1) throw new Error('请上传一份HTML病例文件后发送。');
 if(typeof text!=='string'||!text.trim()) throw new Error('文档解析没有返回正文，请检查HTML是否包含可提取的病例文字。');
 if(Array.isArray(rows)&&rows.some(r=>r&&r.error)) throw new Error('文档解析返回错误，请检查文档解析节点。');
 return {text:'【输入来源】HTML文件解析文本。仅依据可见正文；内嵌图片未经过OCR，不能推断图内数据。\n\n'+text};
}