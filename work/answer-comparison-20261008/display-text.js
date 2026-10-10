// Display formatting only. The complete original packet remains the generation input.
function shortCoverText(value, max=50) {
  const text=String(value||'').replace(/\s+/g,' ').trim();
  if(text.length<=max)return text;
  const first=text.split(/(?<=[。！？])/)[0];
  if(first.length<=max)return first;
  const prefix=text.slice(0,max),boundary=Math.max(prefix.lastIndexOf('；'),prefix.lastIndexOf('，'));
  return (boundary>=12?prefix.slice(0,boundary):prefix)+'…';
}
function readableBiomarkers(value) {
  const labels={pathology:'病理',histology:'组织学',pd_l1:'PD-L1',pd_l1_tps:'PD-L1 TPS',driver_genes:'驱动基因检测',alk_status:'ALK检测',sampling_method:'取样方式',ngs_somatic:'体细胞变异',ngs_germline:'胚系检测',tmb_msi:'TMB与MSI',sample_site:'标本部位',sample_date:'取样日期',date:'日期',details:'记录',result:'结果',status:'状态',method:'检测方法',note:'备注',notes:'备注',initial_biopsy:'初次活检',revised_pathology:'病理复核',post_surgery_pathology:'术后病理',biopsy:'活检',surgery_pathology:'手术病理'};
  function label(key){
    if(labels[key])return labels[key];
    const m=key.match(/^(.*?)[_-]((?:19|20)\d{2})[_-](\d{1,2})(?:[_-](\d{1,2}))?$/);
    if(m)return (labels[m[1]]||'检查记录')+'（'+m[2]+'年'+m[3]+'月'+(m[4]?m[4]+'日':'')+'）';
    if(/[\u3400-\u9fff]/.test(key)||/^(?:EGFR|ALK|ROS1|RET|BRAF|KRAS|HER2|MET|NTRK|PD-L1|TMB|MSI)$/i.test(key))return key;
    return '补充记录';
  }
  function render(v){
    if(typeof v==='string')return v;
    if(v===null)return 'null';
    if(Array.isArray(v))return v.map(render).join('；');
    if(v&&typeof v==='object')return Object.entries(v).map(([k,x])=>label(k)+'：'+render(x)).join('；');
    return String(v);
  }
  if(value&&typeof value==='object')return render(value);
  const text=String(value||'');
  try{const parsed=JSON.parse(text);if(parsed&&typeof parsed==='object')return render(parsed);}catch(_){}
  return text.split(/\r?\n/).map(line=>{
    const m=line.match(/^\s*([^：:]+)[：:]\s*(.+?)\s*$/);
    if(!m)return line;
    let contents=m[2];try{contents=JSON.parse(contents);}catch(_){}
    return label(m[1].trim())+'：'+render(contents);
  }).join('\n');
}
