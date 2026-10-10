import json,copy,zipfile,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'outputs/病例JSON六类癌种版-44例'
OUT=ROOT/'outputs/病例JSON原题指南恢复版-44例'
rows=json.loads((ROOT/'work/detail-edit/original-guidelines-recovery-inventory.json').read_text(encoding='utf-8'))
OUT.mkdir(exist_ok=True)
audit=[]
for row in rows:
    p=SRC/row['file'];before=json.loads(p.read_text(encoding='utf-8-sig'));d=copy.deepcopy(before)
    questions=copy.deepcopy(row['original_questions'])
    d['Questions']['questions']=questions
    d['Questions']['question_count']=len(questions)
    assert len(questions)==5
    assert [q['id'] for q in questions]==['Q1','Q2','Q3','Q4','Q5']
    assert all(q['answer_text']==q['options'][q['answer']] for q in questions)
    assert all(q['guidelineRef']['doc_id'] and q['guidelineRef']['split_index'] is not None for q in questions)
    assert d['detail']==before['detail']
    assert {k:v for k,v in d['Questions'].items() if k not in ['questions','question_count']}=={k:v for k,v in before['Questions'].items() if k not in ['questions','question_count']}
    text=json.dumps(d,ensure_ascii=False,indent=2)
    assert '"second_cancer_type"' not in text
    target=OUT/p.name;target.write_text(text+'\n',encoding='utf-8')
    check=json.loads(target.read_text(encoding='utf-8'))
    assert check['Questions']['questions']==row['original_questions']
    audit.append({'case_id':d['Questions']['case_id'],'file':p.name,'workflow_original_source':row['original_source'],'question_count':len(questions),'full_questions_and_references_exactly_restored':True,'detail_unchanged':True,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
assert len(list(OUT.iterdir()))==44
with zipfile.ZipFile(OUT.with_suffix('.zip'),'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(OUT.glob('*.json')):z.write(p,OUT.name+'/'+p.name)
report={'cases':44,'questions':sum(r['question_count'] for r in audit),'original_url_count':sum(bool(q['guidelineRef'].get('source_url')) for row in rows for q in row['original_questions']),'added_external_urls':0,'all_answers_match_options':True,'question_reference_pairing':'原工作流题目与引用整体原样恢复，不按润色后题号拼接','medical_revalidation_performed':False,'files':audit}
(ROOT/'work/detail-edit/original-question-pairs-recovery-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='files'},ensure_ascii=False))
