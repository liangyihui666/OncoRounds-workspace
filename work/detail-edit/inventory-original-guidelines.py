import json
from pathlib import Path
from collections import Counter
ROOT=Path(__file__).resolve().parents[2]
paths=[ROOT/'tmp/polish-six-20260909/input.json',ROOT/'tmp/polish-20260910/input.json',ROOT/'work/new-batch.json',ROOT/'work/incoming-check.json',Path('C:/Users/admin/.codex/attachments/34148321-1a54-409c-b7a5-ffdd036b485b/pasted-text.txt')]
originals={}
for p in paths:
    data=json.loads(p.read_text(encoding='utf-8-sig'))
    if not isinstance(data,list):continue
    for item in data:
        if not isinstance(item,dict) or not isinstance(item.get('Questions'),dict):continue
        qs=item['Questions'];cid=qs.get('case_id')
        if cid and qs.get('questions'):
            originals[cid]={'source':str(p),'Questions':qs}
report=[]
for p in sorted((ROOT/'outputs/病例JSON六类癌种版-44例').glob('*.json')):
    d=json.loads(p.read_text(encoding='utf-8-sig'));qs=d['Questions'];cid=qs['case_id'];original=originals.get(cid)
    before=json.loads((ROOT/'outputs/病例JSON单文件导入版-44例'/p.name).read_text(encoding='utf-8-sig'))['Questions']
    original_questions=original['Questions']['questions'] if original else []
    report.append({'case_id':cid,'file':p.name,'original_source':original['source'] if original else '', 'original_questions':original_questions,'polished_questions_before_reference_deletion':before['questions'],'same_question_text_count':sum(any(q['question']==o['question'] for o in original_questions) for q in before['questions'])})
out=ROOT/'work/detail-edit/original-guidelines-recovery-inventory.json'
out.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'cases':len(report),'original_cases_found':sum(bool(x['original_questions']) for x in report),'original_questions_found':sum(len(x['original_questions']) for x in report),'identical_question_texts':sum(x['same_question_text_count'] for x in report),'missing_cases':[x['case_id'] for x in report if not x['original_questions']]},ensure_ascii=False))
