from pathlib import Path
import json, copy, shutil, hashlib, zipfile, re, html
from html.parser import HTMLParser

ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'outputs/病例封面调整版-20260916'
OUT=ROOT/'outputs/病例详情精简版-20260916'
WORK=Path(__file__).parent
OUT.mkdir(exist_ok=True)
briefs={}
for line in (WORK/'briefs.txt').read_text(encoding='utf-8').splitlines():
    parts=line.split('|')
    assert len(parts)==6,(len(parts),parts[0])
    briefs[parts[0]]=parts[1:]
briefs['CASE-BE8833A9'][-1]='2023年肝胃联合切除证实肝转移直接侵犯胃部；原文报告随访8年、生活质量良好。'
timelines={};cid=None
for line in (WORK/'timelines.txt').read_text(encoding='utf-8').splitlines():
    if line.startswith('CASE-'):cid=line;timelines[cid]=[]
    else:
        date,title,detail=line.split('|')
        timelines[cid].append(dict(date=date,title=title,detail=detail))
later={}
for line in (WORK/'later-timeline-details.txt').read_text(encoding='utf-8').splitlines():
    parts=line.split('|');later[parts[0]]=parts[1:]

class Extract(HTMLParser):
    def __init__(self):super().__init__();self.parts=[]
    def handle_data(self,s):
        if s.strip():self.parts.append(s.strip())

sources=json.loads((ROOT/'work/detail-sources.json').read_text(encoding='utf-8'))
prefix_map={'CASE-82A82F9C':'153882','CASE-6A44390F':'155245','CASE-6E309B6B':'162417','CASE-8EB5623E':'153018','CASE-DB524C69':'169499','CASE-8C6E34E9':'135868','CASE-A8792225':'137559','CASE-55BF9202':'139352','CASE-B5FF3EFE':'141249','CASE-902F741C':'154097'}
for cid,prefix in prefix_map.items():
    candidates=list((ROOT/'outputs').rglob(prefix+'*.html'))+list(Path('C:/Users/admin/Desktop/新建文件夹').glob(prefix+'*.html'))
    if candidates:
        p=candidates[0];parser=Extract();parser.feed(p.read_text(encoding='utf-8-sig'))
        sources[cid]={'path':str(p),'text':'\n'.join(parser.parts)}
(WORK/'matched-source-texts.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2),encoding='utf-8')
shutil.copytree(SRC/'assets',OUT/'assets',dirs_exist_ok=True)
records=[];before_chars=after_chars=0;before_nodes=after_nodes=0;count=0;render=[]
for p in sorted(SRC.glob('题目*/*.json')):
    raw=p.read_bytes();old=json.loads(raw.decode('utf-8-sig'));d=copy.deepcopy(old)
    cid=d['Questions']['case_id'];title,bg,diagnosis,course,outcome=briefs[cid]
    dt=d['detail'];ov=dt['overview'];oldtabs=copy.deepcopy(ov['tabs'])
    dt['home']['display_title']=title
    dt['home']['description']=bg
    ov['hero']={'title':title,'subtitle':course}
    summary=next(t for t in ov['tabs'] if t['id']=='summary')
    summary['summary_items']=[{'order':i,'label':label,'value':value} for i,(label,value) in enumerate(zip(['就诊背景','关键诊断','治疗经过','随访结局'],[bg,diagnosis,course,outcome]),1)]
    timeline=next(t for t in ov['tabs'] if t['id']=='timeline')
    original_timeline=copy.deepcopy(timeline['timeline_items'])
    if cid in timelines:
        timeline['timeline_items']=timelines[cid]
        timeline_map={}
    else:
        assert len(original_timeline)==len(later[cid]),cid
        for item,text in zip(timeline['timeline_items'],later[cid]):item['detail']=text
        timeline_map={json.dumps(a,sort_keys=True,ensure_ascii=False):b for a,b in zip(original_timeline,timeline['timeline_items'])}
    if cid=='CASE-14D22BE9':timeline['timeline_items'][3]['title']='确认胰腺病灶来源'
    if cid=='CASE-E9E45955':timeline['timeline_items'][3]['title']='确认卵巢转移'
    image_changes=[]
    images=next(t for t in ov['tabs'] if t['id']=='images')
    for idx,item in enumerate(images['image_items'],1):
        prior=copy.deepcopy(item)
        caption=item.get('caption','').strip()
        # Prefer the existing short image heading. Never infer scan findings from filenames.
        if len(caption)>75 or '……' in caption:
            heading=re.split(r'[。\n（(]',caption,maxsplit=1)[0].strip()
            caption=heading if 3<=len(heading)<=65 and '……' not in heading else f'病例资料图{idx}'
        if not caption:caption=f'病例资料图{idx}'
        item['caption']=caption;item['alt']=caption
        related=item.get('related_timeline')
        if related:
            match=timeline_map.get(json.dumps(related,sort_keys=True,ensure_ascii=False))
            if match:item['related_timeline']=copy.deepcopy(match)
            else:item['related_timeline']=None;item['mapping_status']='caption_only'
        if prior!=item:image_changes.append({'id':item.get('id'),'before':prior,'after':item})
    dest=OUT/p.parent.name/p.name;dest.parent.mkdir(exist_ok=True)
    dest.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    assert d['Questions']==old['Questions']
    for key in dt:
        if key not in {'home','overview'}:assert dt[key]==old['detail'][key],(cid,key)
    oldimgs=next(t for t in oldtabs if t['id']=='images')['image_items']
    assert [x['src'] for x in images['image_items']]==[x['src'] for x in oldimgs]
    assert len(summary['summary_items'])==4
    assert all(len(x['value'])<=85 for x in summary['summary_items'])
    assert 4<=len(timeline['timeline_items'])<=8
    assert all(len(x['detail'])<=95 for x in timeline['timeline_items'])
    assert hashlib.sha256(p.read_bytes()).digest()==hashlib.sha256(raw).digest()
    before_nodes+=len(original_timeline);after_nodes+=len(timeline['timeline_items'])
    def visible(detail):
        texts=[detail['home']['display_title'],detail['home']['description'],*detail['overview']['hero'].values()]
        for tab in detail['overview']['tabs']:
            for key in ['summary_items','timeline_items']:
                for item in tab.get(key,[]):texts.extend(str(v) for v in item.values())
        return sum(map(len,texts))
    bc=visible(old['detail']);ac=visible(dt);before_chars+=bc;after_chars+=ac;count+=len(d['Questions']['questions'])
    records.append({'file':str(dest.relative_to(OUT)),'case_id':cid,'source':sources.get(cid,{}).get('path','未匹配到HTML；依据现有JSON，保留不确定性'),'before_chars':bc,'after_chars':ac,'before_timeline_nodes':len(original_timeline),'after_timeline_nodes':len(timeline['timeline_items']),'original_detail':old['detail'],'image_changes':image_changes})
    esc=html.escape
    render.append('<article><small>'+esc(p.parent.name+' / '+cid)+'</small><h2>'+esc(title)+'</h2>'+''.join('<p><b>'+esc(x['label'])+'：</b>'+esc(x['value'])+'</p>' for x in summary['summary_items'])+'<details><summary>查看精简病程轴</summary>'+''.join('<p><b>'+esc(x['date']+' · '+x['title'])+'</b><br>'+esc(x['detail'])+'</p>' for x in timeline['timeline_items'])+'</details></article>')
assert len(records)==44 and set(briefs)=={r['case_id'] for r in records}
report={'cases':len(records),'questions_unchanged':count,'matched_source_files':sum(r['case_id'] in sources for r in records),'before_chars':before_chars,'after_chars':after_chars,'reduction_percent':round((1-after_chars/before_chars)*100,1),'before_timeline_nodes':before_nodes,'after_timeline_nodes':after_nodes,'case_records':records}
(OUT/'核对与变更记录.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'详情预览.html').write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>OncoRounds 病例详情精简预览</title><style>body{max-width:850px;margin:40px auto;background:#f5f6fa;color:#283041;font:16px/1.8 system-ui;padding:20px}article{background:white;padding:24px;margin:22px 0;border-radius:12px}h1{font-size:26px}h2{font-size:22px}small{color:#6c6c80}details{border-top:1px solid #eee;padding-top:12px}summary{cursor:pointer;color:#6657ba}</style><h1>44份病例详情 · 精简预览</h1><p>病例摘要与实际诊疗经过；原始资料存在的关键不确定性已保留。此次未重审题目答案。</p>'+''.join(render)+'</html>',encoding='utf-8')
(OUT/'说明.md').write_text(f'''# 病例详情精简版

共44份JSON，220道题保持原样。沿用上一版封面：27份有插画资源，17份封面地址留空。原文件未覆盖。

- 标题缩短为病例核心事件；首页简介只保留就诊背景。
- 病例摘要统一为就诊背景、关键诊断、治疗经过、随访结局，每条一句至两句。
- 病程轴从{before_nodes}个节点合并为{after_nodes}个，每例4至8个；保留重要治疗调整与结局。
- 去除拼接表格、重复分型和内部校对话术；保留关键的不确定性、待核对分期、疑似诊断和未提供结局。
- 保留所有病例图片URL，仅精简过长图注。原长图注在核对与变更记录中保留。
- 病程轴合并后无法可靠匹配的图片关联设为caption_only、related_timeline为空，不猜测时点。后期病例可明确对应的关联同步更新。

本批摘要、首页文案和病程轴文字总量减少约{report['reduction_percent']}%。字段结构保留；summary_items的label为展示文案，前端应读取value，不应按旧标签硬编码。

## 内容核对

匹配到{report['matched_source_files']}份本地HTML。重点回查食管癌肺部不同部位的取样、乳腺癌受体演变、食管ESD后追加手术及分期/疗程矛盾；其余优先依据现有经过校订的JSON精简。未匹配到HTML的早期病例未补造事实，也不代表已完成全量原文医学复核。

- 食管癌左上肺穿刺阳性与左下肺支气管镜阴性分开记录。
- 乳腺癌受体演变末次积液只明确ER阴性，其余受体未测全；不写成完整确认三阴性。
- 心包填塞归为肿瘤相关急症经过，不直接定性为药物不良反应。
- 计划治疗与已实施治疗分别表述，未提供后续结局的明确留空缺说明。
- 原文分期或周期存在矛盾的仅保留可靠事实与简短待核对说明，不自行重新定级。

未修改题干、答案、解析及引文，不代表题目已完成医生审核。完整原始详情与逐例来源记录见核对与变更记录.json。

图片为包内相对路径，正式接入需上传现有资源并替换线上URL。空封面显示占位，不回退到病例检查影像。
''',encoding='utf-8')
zip_path=OUT.with_suffix('.zip')
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(OUT.rglob('*')):
        if p.is_file():z.write(p,arcname=str(Path(OUT.name)/p.relative_to(OUT)))
print(json.dumps({k:v for k,v in report.items() if k!='case_records'},ensure_ascii=False))
