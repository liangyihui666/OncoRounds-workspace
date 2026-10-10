from pathlib import Path
import json,copy,shutil,hashlib,zipfile,html

ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'outputs/病例详情精简版-20260916'
OUT=ROOT/'outputs/分阶段作答版-20260916'
OUT.mkdir(exist_ok=True)
intros={}
for line in (Path(__file__).parent/'learning-intros.txt').read_text(encoding='utf-8').splitlines():
    cid,title,background=line.split('|');intros[cid]=(title,background)
# Move earlier diagnostic decisions ahead of treatment/outcome questions.
orders={
 'CASE-F5639B6F':[4,5,1,2,3],
 'CASE-B559946D':[3,1,2,4,5],
 'CASE-51D1DA57':[2,4,1,3,5],
 'CASE-BD2810E1':[2,1,3,5,4],
 'CASE-95977E69':[4,1,2,3,5],
 'CASE-8EB5623E':[2,1,3,4,5],
}
# Only revise the information boundary or make an existing condition explicit.
# Answers, options, explanation and citations are retained verbatim.
patches={
 ('CASE-29CA171F','Q3'):'患者因持续血液学毒性停用CAPOX，停药时影像尚未达到CR。仅依据这一时点的信息，如何评价停药决定？',
 ('CASE-6A44390F','Q4'):'T-DXd治疗后，病例报告2级白细胞减少和贫血，但未提供当前ANC、血小板计数及是否发热。决定下一次给药及是否使用升白支持前，应首先核对什么？',
 ('CASE-6A44390F','Q5'):'拟制定T-DXd治疗期间的呼吸系统风险预案，当前未记录ILD。哪项安排最恰当？',
 ('CASE-C54DD4A4','Q4'):'髌骨骨皮质破坏并持续疼痛，团队正在讨论刮除、骨水泥填充及放疗等局部处理。制定方案前，最应评估什么？',
 ('CASE-95977E69','Q5'):'卡匹色替治疗中皮疹反复，停药后消退，现需评估阿培利司这一后续选择。对类似患者，哪项评估仍不可省略？',
 ('CASE-46B8BDDE','Q1'):'原文将肝内胆管癌记为T4N0M0，但现有影像描述主要为巨大肝内病灶及其他肝内结节。核对AJCC第8版T4时，最需要确认哪项依据？',
 ('CASE-6E309B6B','Q3'):'患者使用TMP-SMX后出现皮疹，曾因考虑药物过敏而换药，现需评估是否可以再次使用。最需要先明确什么？',
 ('CASE-8EB5623E','Q2'):'患者有乳腺癌病史，现出现十二指肠狭窄与梗阻。内镜显示腔外压迫和黏膜水肿，表浅活检未取得确诊组织。下一步更合理的是？',
 ('CASE-8DC486E7','Q3'):'胆管癌患者尚未接受抗肿瘤治疗，住院中出现肾功能恶化、高钾、低钙和高尿酸，且肿瘤负荷巨大。哪种诊断思路最合理？',
 ('CASE-E920FEFC','Q4'):'帕博利珠单抗相关治疗期间出现尿路刺激症状及肌酐升高，团队怀疑免疫介导性膀胱炎。进一步处理最应遵循哪项原则？',
 ('CASE-CC5590E2','Q1'):'直肠癌术后14个月发现盆腔复发肿块，侵犯宫颈、阴道及邻近组织。确定复发后的治疗策略前，哪项评估最关键？',
 ('CASE-CC5590E2','Q2'):'复发后FOLFOXIRI治疗期间出现坏死性筋膜炎，病情严重并需ICU救治。此时处理重点是什么？',
 ('CASE-14D22BE9','Q5'):'双HER2治疗12周后，胰腺病灶及假性囊肿改善，CEA和CA19-9下降，但未提供靶病灶径线总和及完整全身复评。哪项疗效表述最合适？',
 ('CASE-E251EF18','Q2'):'纳武利尤单抗相关治疗期间肌酐升高，原文考虑免疫相关肾毒性，但现有资料缺少基线肌酐和完整尿检。最合适的评估是？',
}
records=[];public=[];answer_private={};post_private={};changed_stems=0
source_hashes={}
for p in sorted(SRC.glob('题目*/*.json')):
    source_hashes[str(p)]=hashlib.sha256(p.read_bytes()).hexdigest()
    original=json.loads(p.read_text(encoding='utf-8'));cid=original['Questions']['case_id']
    d=copy.deepcopy(original);title,background=intros[cid]
    oldqs=original['Questions']['questions'];permutation=orders.get(cid,list(range(1,len(oldqs)+1)))
    assert sorted(permutation)==list(range(1,len(oldqs)+1))
    qs=[];changes=[]
    for idx,oldnum in enumerate(permutation,1):
        prior=oldqs[oldnum-1];q=copy.deepcopy(prior);q['id']=f'Q{idx}'
        key=(cid,prior['id'])
        if key in patches:
            q['question']=patches[key];changed_stems+=1
        assert all(q[k]==prior[k] for k in prior if k not in {'id','question'})
        qs.append(q)
        changes.append({'new_id':q['id'],'original_id':prior['id'],'stem_changed':q['question']!=prior['question'],'before_stem':prior['question'],'after_stem':q['question'],'information_source':'现有题干及精简版病例资料；不添加未提供的检查结果','review':'本题决策条件在题干提供；完整病程及结局在整组提交后揭晓'})
    d['Questions']['questions']=qs
    # Keep the import contract, but replace all pre-answer narrative with baseline facts only.
    dt=d['detail'];dt['home']['display_title']=title;dt['home']['description']=background
    dt['overview']['hero']={'title':title,'subtitle':'根据当前已知资料作出判断，完成整组后查看解析与实际经过。'}
    for tab in dt['overview']['tabs']:
        if tab['id']=='summary':tab['summary_items']=[{'order':1,'label':'初始资料','value':background}]
        elif tab['id']=='timeline':tab['timeline_items']=[]
        elif tab['id']=='images':tab['image_items']=[]
    # The occult primary must not be signalled by a breast illustration before origin identification.
    if cid=='CASE-10436F33':dt['image']={'src':'','alt':'病例思考封面'}
    review=copy.deepcopy(original);review['Questions']['questions']=copy.deepcopy(qs)
    for section,item in [('作答前导入',d),('作答后回顾',review)]:
        dest=OUT/section/p.parent.name/p.name;dest.parent.mkdir(parents=True,exist_ok=True)
        dest.write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    # Frontend-safe payload: whitelist fields. No answers, rationale, references, timeline or images.
    pub={'case_id':cid,'title':title,'initial_information':background,'question_count':len(qs),
         'questions':[{k:q[k] for k in ['id','type','phase','timepoint','question','options']} for q in qs]}
    public.append(pub)
    answer_private[cid]=[{k:q[k] for k in ['id','answer','answer_text','explain','keyPoint','guidelineRef']} for q in qs]
    post_private[cid]=review['detail']
    records.append({'file':p.parent.name+'/'+p.name,'case_id':cid,'question_mapping':changes,'classification_hidden_in_learner_payload':True,'cover_hidden_until_reveal':cid=='CASE-10436F33'})
    assert d['Questions']['question_count']==len(qs)==dt['decision_point_count']
    assert all(q['answer_text']==q['options'][q['answer']] for q in qs)
    assert review['detail']==original['detail']
    assert dt['cancer_type']==original['detail']['cancer_type'] and dt['second_cancer_type']==original['detail']['second_cancer_type']
assert len(public)==44 and sum(x['question_count'] for x in public)==220
for section in ['作答前导入','作答后回顾']:
    shutil.copytree(SRC/'assets',OUT/section/'assets',dirs_exist_ok=True)
frontend=OUT/'开发接入';frontend.mkdir(exist_ok=True)
(frontend/'作答题目_无答案.json').write_text(json.dumps(public,ensure_ascii=False,indent=2),encoding='utf-8')
(frontend/'服务端答案_勿提前下发.json').write_text(json.dumps(answer_private,ensure_ascii=False,indent=2),encoding='utf-8')
(frontend/'提交后病例回顾_勿提前下发.json').write_text(json.dumps(post_private,ensure_ascii=False,indent=2),encoding='utf-8')
def walk(v):
    if isinstance(v,dict):
        for k,x in v.items():
            assert k not in {'answer','answer_text','explain','keyPoint','guidelineRef','image_items','timeline_items','cancer_type','second_cancer_type'},k
            walk(x)
    elif isinstance(v,list):
        for x in v:walk(x)
walk(public)
assert all(hashlib.sha256(Path(p).read_bytes()).hexdigest()==h for p,h in source_hashes.items())
(OUT/'逐题调整记录.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
report={'cases':44,'questions':220,'reordered_cases':len(orders),'edited_stems':changed_stems,'answers_options_explanations_references_unchanged':True,'original_files_unchanged':True,'public_payload_no_answer_fields':True,'online_frontend_changed':False}
(OUT/'校验结果.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'开发接入/展示规则.md').write_text('''# 分阶段作答展示规则

## 文件用途
- 作答前导入：44份原{Questions, detail}合同，题目管理端导入使用。detail只有初始背景，病程轴与病例图片为空。
- 作答后回顾：44份完整病例回顾，含实际治疗及结局，题目顺序与作答前一致。
- 作答题目_无答案.json：使用白名单输出的前端题目内容，无答案、解析、引文、分型标签及后续详情。仍需按服务端当前题号逐题返回，不能把整组文件一次下发给浏览器。
- 服务端答案_勿提前下发.json：评分及整组完成后的解析。
- 提交后病例回顾_勿提前下发.json：整组完成后展示的真实病例经过。

两个导入目录含同一批病例，不能当作88份新病例重复入库；按case_id分别存初始资料与完成后回顾。未新增原导入JSON字段。原始文件均保留。

## 时序（本次默认）
1. 进入病例只显示初始背景。诊断来源题不显示能透露来源的癌种标签、病例图片或结局型标题；学习端题目数据不含分类标签。分型字段仍在管理端保留用于推荐。
2. 服务端只返回当前题的题干及选项；禁止预览未答题的题干、阶段名、后续检查及时间线。
3. 用户确认提交后，服务端记录并锁定本题选项，再返回下一题。不得回改已提交选项。此时只显示“已提交”，不返回对错、解析或真实处理。
4. 全部题目提交后，服务端统一返回得分、逐题推荐答案及解析，以及实际诊疗经过与结局。
5. 解析栏目叫“推荐答案与依据”；完整详情栏目叫“病例实际经过”。两者不合并，病例实际做法不自动等同于唯一或普遍推荐。
6. 重新练习属于已揭晓模式，成绩不作为首次独立作答结果。

原因：若每题立即公布解析，可能给后续题提供答案线索；后面的题干本身也会逐步公开新检查和实际经过。因此需要逐题开放、锁定提交及整组统一揭晓。

## 必须由开发实现
不要只在CSS里隐藏答案，也不要把完整管理端JSON、整组题目或回顾数据预载到浏览器。当前项目只交付JSON与规则，未修改线上服务端/前端。保持刷新、切换设备和重新打开时的服务端作答状态；答案及回顾接口须验证整组完成，不能只相信前端布尔变量。

空病程轴/图片页签在作答前不渲染。原图片和长病程在完成后回顾里完整保留。需要从病例图片做判断的新题须另行选取对应时点且无结局标注的图片，本轮未新增这类题。

已有封面相对路径沿用，正式上线换真实静态资源URL。腹水与胃病变来源鉴别病例在作答前额外隐藏乳腺插画，避免透露原发来源。

## 验收
- 44个case_id均能找到初始、题目、服务端答案及回顾，题号一致。
- 首次进入无后续治疗/结局、无解析及答案字段；未来题不得查询。
- 提交后答案不可回改，刷新保留进度；整组未完成访问回顾被拒绝。
- 完成后展示推荐决策与实际经过两个栏目，病例图片恢复。
- 本轮只调整14道题干的条件和信息边界，6组题序调整，其余题干保留。答案、选项、解析和引用原样保留；不是新增医学证据审核。
''',encoding='utf-8')
# Preview embeds only the no-answer whitelist. It demonstrates locked sequential questions,
# not production access control. No answers or complete case course are embedded.
payload=json.dumps(public,ensure_ascii=False).replace('<','\\u003c')
preview='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>分阶段作答预览</title><style>body{max-width:850px;margin:35px auto;padding:20px;background:#f5f6fa;color:#283041;font:16px/1.8 system-ui}section{background:white;border-radius:14px;padding:26px;margin:20px 0}select,button{font:inherit;padding:10px;border-radius:8px}select{max-width:100%}button{background:#6657ba;color:white;border:0;cursor:pointer}label{display:block;padding:14px;margin:10px 0;border:1px solid #ddd;border-radius:8px}small{color:#777}</style><h1>分阶段作答预览</h1><p>只显示当前题；提交后锁定。整组完成后才揭晓答案与病例经过。</p><select id="pick"></select><main id="main"></main><small>本页仅演示交互，不含答案及完整病例。正式产品须由服务端逐题返回并验证提交状态。</small><script>const cases=PAYLOAD;let active=0,index=0,selections=[];const pick=document.querySelector('#pick'),main=document.querySelector('#main');function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}cases.forEach((c,i)=>{let o=document.createElement('option');o.value=i;o.textContent=(i+1)+' · '+c.title;pick.append(o)});pick.onchange=()=>{active=+pick.value;index=0;selections=[];render()};function render(){let c=cases[active];if(index===c.question_count){main.innerHTML='<section><h2>整组已提交</h2><p>你的选择：'+selections.map((x,i)=>'Q'+(i+1)+' '+x).join('、')+'</p><p>正式产品此时请求服务端评分，展示推荐答案与依据，再开放病例实际经过及结局。</p><p>本预览没有加载答案或后续病程。</p></section>';return}let q=c.questions[index];main.innerHTML='<section><h2>'+esc(c.title)+'</h2><p>'+esc(c.initial_information)+'</p></section><section><small>第 '+(index+1)+' / '+c.question_count+' 题</small><h3>'+esc(q.question)+'</h3>'+Object.entries(q.options).map(([k,v])=>'<label><input type="radio" name="option" value="'+k+'"> '+k+' · '+esc(v)+'</label>').join('')+'<button id="submit">确认提交并锁定</button><p id="notice"></p></section>';document.querySelector('#submit').onclick=()=>{let x=document.querySelector('input[name=option]:checked');if(!x){document.querySelector('#notice').textContent='请先选择一个选项。';return}selections.push(x.value);index++;render()}}render();</script></html>'''.replace('PAYLOAD',payload)
(OUT/'作答预览.html').write_text(preview,encoding='utf-8')
with zipfile.ZipFile(OUT.with_suffix('.zip'),'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(OUT.rglob('*')):
        if p.is_file():z.write(p,arcname=str(Path(OUT.name)/p.relative_to(OUT)))
print(json.dumps(report,ensure_ascii=False))
