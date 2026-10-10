function main({files}) {
  if (!Array.isArray(files) || files.length < 1 || files.length > 10) {
    throw new Error('请在病例文件上传框选择 1–10 个文件；超过 10 个请分批提交。');
  }
  if (files.some(f => typeof f !== 'string' || !f.trim())) {
    throw new Error('文件列表包含无效项，请重新选择文件。');
  }
  return {file_batches:files.map(f=>[f]), expected_count:files.length};
}