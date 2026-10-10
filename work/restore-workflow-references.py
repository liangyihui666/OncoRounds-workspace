import json, copy, zipfile
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
src = ROOT/'outputs/病例JSON单文件导入版-44例'
out = ROOT/'outputs/病例JSON工作流引用版-44例'
mapping = {x['second_cancer_type']:x['cancer_type'] for x in json.loads((ROOT/'config/tumor-taxonomy/tumor-display-mapping-draft.json').read_text(encoding='utf-8-sig'))}
sources = list(Path('C:/Users/admin/.codex/attachments').glob('*/pasted-text.txt'))
sources += [ROOT/'work/new-batch.json',ROOT/'work/incoming-check.json',ROOT/'tmp/polish-six-20260909/input.json']
original_refs = {}
def collect(obj, path):
    if isinstance(obj, list):
        for x in obj: collect(x,path)
    elif isinstance(obj, dict):
        qs = obj.get('Questions')
        if isinstance(qs,dict):
            for q in qs.get('questions',[]):
                r=q.get('guidelineRef',{})
                if isinstance(r,dict) and r.get('doc_id') and r.get('split_index') is not None:
                    key=(qs.get('case_id'),r['doc_id'],str(r['split_index']))
                    original_refs.setdefault(key,[]).append((r,str(path)))
        for k,v in obj.items():
            if k != 'Questions': collect(v,path)
for p in sources:
    try: collect(json.loads(p.read_text(encoding='utf-8-sig')),p)
    except (ValueError,OSError): pass

out.mkdir(exist_ok=True)
audit=[]
stats=Counter()
for p in sorted(src.glob('*.json')):
    d=json.loads(p.read_text(encoding='utf-8-sig')); old=copy.deepcopy(d)
    qs=d['Questions']; cid=qs['case_id']; second=qs['second_cancer_type']
    assert mapping.get(second), (cid,second)
    first=mapping[second]
    for container in (qs,d.get('detail')):
        if isinstance(container,dict) and container:
            container['cancer_type']=first
            container.pop('second_cancer_type',None)
    for q in qs['questions']:
        r=q.get('guidelineRef',{})
        key=(cid,r.get('doc_id'),str(r.get('split_index')))
        matches=original_refs.get(key,[])
        # Only retain metadata from the same case and exact workflow locator.
        exact=next(((v,f) for v,f in matches if v==r),None)
        selected=exact or (matches[0] if matches else None)
        if selected:
            q['guidelineRef']=copy.deepcopy(selected[0]); action='retained_workflow_record'; source=selected[1]
        else:
            q['guidelineRef']={}; action='cleared_untraceable_or_added_reference'; source=''
        stats[action]+=1
        audit.append(dict(case_id=cid,question_id=q['id'],action=action,source=source,before=r,after=q['guidelineRef']))
    assert qs['question_count']==len(qs['questions'])
    assert all(q['answer_text']==q['options'][q['answer']] for q in qs['questions'])
    # No question text, options, answers, or explanations are changed in this pass.
    for a,b in zip(old['Questions']['questions'],qs['questions']):
        assert {k:v for k,v in a.items() if k!='guidelineRef'}=={k:v for k,v in b.items() if k!='guidelineRef'}
    text=json.dumps(d,ensure_ascii=False,indent=2)
    assert '"second_cancer_type"' not in text
    (out/p.name).write_text(text+'\n',encoding='utf-8')
assert len(list(out.glob('*.json')))==44
(ROOT/'work/workflow-reference-restore-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
with zipfile.ZipFile(out.with_suffix('.zip'),'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(out.glob('*.json')): z.write(p,out.name+'/'+p.name)
print(json.dumps(dict(files=44,questions=sum(stats.values()),references=dict(stats),output=str(out)),ensure_ascii=False))
