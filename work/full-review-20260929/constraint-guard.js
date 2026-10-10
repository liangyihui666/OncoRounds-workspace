// Literal excerpts from the already cleaned patient section, never expert opinions or image inference.
function preserveConstraintExcerpts(source, cleaned) {
  const match=String(cleaned||'').match(/【患者病例正文】([\s\S]*?)(?=【[^】\r\n]+】|$)/);
  const report={scope:'literal_excerpt_coverage_not_medical_validation',patient_section_found:!!match,matched_count:0,retained_excerpts:[],warnings:[]};
  if(!match){report.warnings.push('未找到清洗后的患者正文，未自动补写任何事实。');return report;}
  // Keep each full paragraph: dates, negation and speaker context must travel with the constraint.
  const paragraphs=match[1].split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const pattern=/拒绝|不同意|不可及|可及性|获取.{0,25}受限|无法耐受|不能耐受|既往.{0,15}放疗/;
  const normalized=s=>String(s||'').replace(/\s+/g,'');
  const existing=normalized(['case_context','case_timeline','biomarkers','adverse_events','evidence_notes'].map(k=>source[k]||'').join('\n'));
  const excerpts=[...new Set(paragraphs.filter(s=>pattern.test(s)))];
  report.matched_count=excerpts.length;
  for(const text of excerpts){
    if(existing.includes(normalized(text)))continue;
    // This is a source note, not a new timeline assertion or a prescription.
    report.retained_excerpts.push(text);
  }
  if(report.retained_excerpts.length){
    source.evidence_notes=[source.evidence_notes||'','【清洗正文限制原句，保留时点及范围】',...report.retained_excerpts].filter(Boolean).join('\n');
    report.warnings.push('以下限制原句未被逐字完整保留，已附入evidence_notes供核对；可能与提取后的同义表述重复。');
  }
  return report;
}
