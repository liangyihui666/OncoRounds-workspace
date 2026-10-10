from pathlib import Path
import json,copy,zipfile
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'outputs/病例JSON工作流引用版-44例'
DETAIL=ROOT/'outputs/病例详情精简版-20260916'
OUT=ROOT/'outputs/病例JSON摘要病程版-44例'
focus=dict(line.split('|',1) for line in (Path(__file__).parent/'case-focus.txt').read_text(encoding='utf-8').splitlines() if line)
details={}
for p in DETAIL.glob('题目*/*.json'):
    d=json.loads(p.read_text(encoding='utf-8-sig'));details[d['Questions']['case_id']]=d['detail']
OUT.mkdir(exist_ok=True)
stats={'cases':0,'questions':0,'summary_cards':0,'timeline_nodes':0}
for p in sorted(SRC.glob('*.json')):
    d=json.loads(p.read_text(encoding='utf-8-sig'));before=copy.deepcopy(d['Questions']);cid=before['case_id']
    detail=d['detail']; old=details[cid]
    oldtabs={t['id']:t for t in old['overview']['tabs']}
    summary=copy.deepcopy(oldtabs['summary']['summary_items'][:3])
    for item,label in zip(summary,['患者画像','诊断与检查','治疗经过']):item['label']=label
    summary.append({'order':4,'label':'核心难点','value':focus[cid]})
    timeline=copy.deepcopy(oldtabs['timeline']['timeline_items'])
    if cid=='CASE-46B8BDDE':
        timeline[0]['detail']='肝脏巨大病灶伴多发结节，病理诊断肝内胆管癌；现有资料对主病灶侧别的记载不一致。'
    # Retain the learner-neutral case title; restore factual disease course, not answer explanations.
    detail['overview']['hero']['subtitle']=focus[cid]
    detail['home']['description']=summary[0]['value']
    for tab in detail['overview']['tabs']:
        if tab['id']=='summary':tab['summary_items']=summary
        elif tab['id']=='timeline':tab['timeline_items']=timeline
    assert d['Questions']==before
    assert detail['cancer_type']==before['cancer_type']
    assert all(x['date'] and x['title'] and x['detail'] for x in timeline)
    assert len(summary)==4
    text=json.dumps(d,ensure_ascii=False,indent=2)
    assert '"second_cancer_type"' not in text
    (OUT/p.name).write_text(text+'\n',encoding='utf-8')
    stats['cases']+=1;stats['questions']+=len(before['questions']);stats['summary_cards']+=len(summary);stats['timeline_nodes']+=len(timeline)
assert stats['cases']==44 and stats['questions']==220
with zipfile.ZipFile(OUT.with_suffix('.zip'),'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(OUT.glob('*.json')):z.write(p,OUT.name+'/'+p.name)
(ROOT/'work/detail-edit/detail-restoration-validation.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(stats,ensure_ascii=False))
