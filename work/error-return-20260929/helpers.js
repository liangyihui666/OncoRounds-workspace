function safeDiagnostic(value){
  let s=typeof value==='string'?value:value==null?'':JSON.stringify(value);
  s=s.replace(/\bBearer\s+[^\s"',;}]+/gi,'Bearer [REDACTED]').replace(/\bsk-[A-Za-z0-9_-]+/g,'[REDACTED]');
  s=s.replace(/((?:api[_-]?key|access[_-]?token|authorization|password|secret|signature|credential)\s*["']?\s*[:=]\s*["']?)[^\s"'&,;}]+/gi,'$1[REDACTED]');
  return s.length>2000?s.slice(0,2000)+'…[truncated]':s;
}
function failureEnvelope(stage,message,code){
  return {record_type:'oncorounds_execution_error',transport_version:'1.0',workflow_revision:'20260929-error-return',
    status:'UPSTREAM_ERROR',publishable:false,medical_review_status:'not_performed',
    error:{code:code||'UPSTREAM_NODE_ERROR',node:stage,message:safeDiagnostic(message)||'节点失败但平台未提供错误文本'}};
}
