const fs=require('fs'),cp=require('child_process');
const out='outputs/六例空返回排查-20260929',reports=[];
const normalize=s=>String(s).replace(/\s+/g,' ').trim();
for(const file of fs.readdirSync(__dirname).filter(n=>/^CASE-[A-Z0-9]+\.json$/.test(n))){
 const x=JSON.parse(fs.readFileSync(__dirname+'/'+file));const g=x.candidate_pool.groups[0],d=g.workflow_diagnostics,checks=[];
 for(const q of d.evidence_verification.question_checks){
  const records=d.cited_evidence_snapshot.filter(r=>r.evidence_id===q.evidence_id);
  for(const o of q.option_checks)for(const quote of o.quotes){const body=records[0]?.snippet||'';checks.push({question:q.question_id,option:o.option,quote:quote.quote,length_valid:typeof quote.quote==='string'&&quote.quote.trim().length>=8&&quote.quote.length<=180,literal_match:records.length===1&&normalize(body).includes(normalize(quote.quote)),reported_match:quote.matched});}
 }
 const row={case_id:x.case_id,status:g.flow_status,quote_count:checks.length,literal_matches:checks.filter(c=>c.literal_match).length,failed_quotes:checks.filter(c=>!c.literal_match||!c.length_valid)};
 if(x.candidate_pool.candidate_count===5){
  const replay=JSON.parse(fs.readFileSync(__dirname+'/'+x.case_id+'-replay.json'));
  fs.writeFileSync(__dirname+'/'+x.case_id+'-questions.json',JSON.stringify(replay.output_data.Questions));
  fs.writeFileSync(__dirname+'/'+x.case_id+'-evidence.json',JSON.stringify(d.cited_evidence_snapshot.map(r=>({...r,link:r.source_url||''}))));
  const audit=cp.spawnSync('C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',['C:/Users/admin/.codex/skills/fastgpt-oncology-grand-rounds/scripts/audit_questions.py',__dirname+'/'+x.case_id+'-questions.json','--evidence',__dirname+'/'+x.case_id+'-evidence.json','--require-developer-format'],{encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8'}});
  row.skill_audit={exit:audit.status,output:(audit.stdout||'')+(audit.stderr||'')};
 }
 reports.push(row);
}
fs.writeFileSync(out+'/六例证据检查.json',JSON.stringify({scope:'literal_source_presence_only_not_medical_approval',reports},null,2));
console.log(JSON.stringify(reports.map(r=>({...r,failed_quotes:r.failed_quotes.map(q=>({question:q.question,option:q.option,length_valid:q.length_valid,literal_match:q.literal_match}))})),null,2));
