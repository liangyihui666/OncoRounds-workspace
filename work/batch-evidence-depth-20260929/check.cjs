const fs=require('fs'),path=require('path'),cp=require('child_process');
const dir=__dirname,out='outputs/原句核对新版批次复核-20260929';fs.mkdirSync(out,{recursive:true});
const normalize=s=>String(s).replace(/\s+/g,' ').trim(),reports=[];
for(const index of [4,5,6,10]){
 const x=JSON.parse(fs.readFileSync(path.join(dir,'item-'+index+'.json'),'utf8'));
 const q=x.output_data.Questions,d=x.execution_report.source_groups[0].workflow_diagnostics;
 const checks=[];
 for(const c of d.evidence_verification.question_checks){
  const matches=d.cited_evidence_snapshot.filter(r=>r.evidence_id===c.evidence_id);
  for(const option of c.option_checks)for(const quote of option.quotes){const found=matches.length===1&&normalize(matches[0].snippet).includes(normalize(quote.quote));checks.push({question_id:c.question_id,option:option.option,matched:found});}
 }
 fs.writeFileSync(path.join(dir,'questions-'+index+'.json'),JSON.stringify(q,null,2));
 // The skill script consumes raw retrieval `link`; this export uses equivalent `source_url`.
 fs.writeFileSync(path.join(dir,'evidence-'+index+'.json'),JSON.stringify(d.cited_evidence_snapshot.map(r=>({...r,link:r.source_url||''})),null,2));
 const audit=cp.spawnSync('C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',[
  'C:/Users/admin/.codex/skills/fastgpt-oncology-grand-rounds/scripts/audit_questions.py',path.join(dir,'questions-'+index+'.json'),'--evidence',path.join(dir,'evidence-'+index+'.json'),'--require-developer-format'],{encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8'}});
 const log=(audit.stdout||'')+(audit.stderr||'')+(audit.error?String(audit.error):'');fs.writeFileSync(path.join(dir,'skill-audit-'+index+'.txt'),log);
 reports.push({file_index:index,case_id:q.case_id,question_count:q.question_count,declared_workflow_revision:x.execution_report.source_groups[0].workflow_revision,quote_count:checks.length,matched_count:checks.filter(x=>x.matched).length,quote_failures:checks.filter(x=>!x.matched),skill_script_exit:audit.status,skill_script_output:log});
}
fs.writeFileSync(path.join(out,'原句重放检查.json'),JSON.stringify({scope:'returned_evidence_literal_presence_only',case_fields_not_independently_replayed:true,original_paste_has_invalid_escapes:true,reports},null,2));
console.log(JSON.stringify(reports,null,2));
