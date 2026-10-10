import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
OUT=ROOT/'outputs/病例资料预处理-20260924'
source=OUT/'大查房-病例资料预处理-图片PDFHTML-测试版.json'
w=json.loads(source.read_text(encoding='utf-8'))
original=(HERE/'finalize.js').read_text(encoding='utf-8').replace('function main(', 'function validateInternal(', 1)
adapter=r'''
function main(args) {
  const internal = JSON.parse(validateInternal(args).output);
  if (internal.extraction_status !== 'draft_requires_confirmation') {
    // Do not return an apparently usable case when parsing or verification failed.
    throw new Error(internal.message || '病例资料提取未通过核对，请查看节点运行记录。');
  }
  const v = internal.case_variables;
  const notes = internal.data_quality_notes.filter(x => typeof x === 'string' && x.trim());
  const result = {
    case_id: v.case_id,
    case_title: v.case_title,
    disease: v.disease,
    case_context: v.case_context,
    learning_points: v.learning_points,
    case_mode: v.case_mode,
    case_timeline: v.case_timeline,
    biomarkers: v.biomarkers,
    decision_points: v.decision_points,
    adverse_events: v.adverse_events,
    evidence_notes: [v.evidence_notes, notes.length ? '原文缺失或待核实：\n' + notes.join('\n') : ''].filter(Boolean).join('\n'),
    case_intro_images: [],
    cancer_type: v.cancer_type,
    second_cancer_type: v.second_cancer_type
  };
  return {output: JSON.stringify(result)};
}
'''
code=original+'\n'+adapter
(HERE/'finalize-fields-only.js').write_text(code,encoding='utf-8')
n=next(n for n in w['nodes'] if n['nodeId']=='finalize')
n['name']='出题字段输出检查'
next(i for i in n['inputs'] if i['key']=='code')['value']=code
w['name']='大查房-病例预处理-仅出题字段-测试版'
w['intro']='上传图片、PDF或HTML，输出扁平的出题病例字段JSON；核对在内部执行。'
welcome='请上传同一病例的图片、PDF或HTML，发送“整理病例”。最终只输出出题所需的病例字段JSON。'
w['chatConfig']['welcomeText']=welcome
w['chatConfig']['welcomeConfig']={'welcomeText':welcome}
(OUT/'大查房-病例预处理-仅出题字段-测试版.json').write_text(json.dumps(w,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
