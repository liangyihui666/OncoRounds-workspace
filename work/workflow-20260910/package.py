import json, hashlib, shutil, zipfile
from pathlib import Path
BASE=Path(__file__).resolve().parent
ROOT=BASE.parent.parent
OUT=ROOT/'outputs/工作流优化-两级癌种-20260910'
tests=json.loads((BASE/'test-results.json').read_text(encoding='utf-8'))
assert tests and all(t['status']=='PASS' for t in tests), '校验未全部通过，停止打包'
cases=json.loads((BASE/'classification-regression.json').read_text(encoding='utf-8'))
audit=OUT/'校验资料';audit.mkdir(exist_ok=True)
shutil.copy2(BASE/'test-results.json',audit/'离线测试明细.json')
shutil.copy2(BASE/'classification-regression.json',audit/'15份病例分类回归.json')
shutil.copy2(ROOT/'config/tumor-taxonomy/tumor-display-mapping-draft.json',audit/'两级癌种映射.json')
names={'generator':'题目生成 (6).json','triple':'三连 (5).json','batch':'批量生成 (2).json'}
manifest={'date':'2026-09-10','mode':'offline_test_only','sources':[],'deliverables':[]}
for tag,name in names.items():
    source=Path('C:/Users/admin/Downloads')/name
    current=json.loads(source.read_text(encoding='utf-8-sig'))
    snapshot=json.loads((BASE/f'{tag}-original.json').read_text(encoding='utf-8'))
    assert current==snapshot, '原导出文件与本次底稿不一致：'+name
    manifest['sources'].append({'name':name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'matches_initial_snapshot':True})
for f in sorted(OUT.glob('0*.json')):
    d=json.loads(f.read_text(encoding='utf-8'))
    manifest['deliverables'].append({'name':f.name,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'nodes':len(d['nodes']),'edges':len(d['edges'])})
(audit/'文件校验信息.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
lines=['# 离线校验报告','',f'日期：2026-09-10。{len(tests)} 项测试全部通过。执行环境：本地 Node.js VM，直接执行交付 JSON 中的代码节点。','',
'## 已验证','',
'- 三个文件可解析，全部代码节点语法有效；节点、输出 ID、变量引用及连线检查通过，无意外修订循环；错误出口已接线。',
'- 132 个二级名称与 CSV 白名单一致，按项目映射返回一级；未知二级、一级待确认均留空并记录原因。',
'- A1 分期结果和错误进入最终注册节点；证据 doc_id/split_index 一致，医审输入保留完整原始正文，筛选 JSON 不携带原文副本。',
'- 1、2、3、4、5 题分别通过装配、最终输出、详情计数及答案字母/文本一致性检查；零题保持 insufficient、原因和空 detail。',
'- 医审 REVISE 和低分不阻断结果；低于旧阈值的真实 PASS 不被分数改写。第二轮有效部分题优先，解析失败、合并失败或零题时回退首轮并绑定首轮审核/证据。',
'- PATCH 对 1～5 题逐一验证仅修改授权题；FULL 可从损坏首轮恢复 2 题，并继承未授权题；越权修改会失败并保留回退路径。',
'- 完全重复候选合并；错误 ID、重复/数量异常或解析错误触发确定性终选回退；合法 ID 保留选择顺序，医学题干及答案实质不被代码改写。',
'- 10 文件输入、并发 10、重试 0、完整结果汇总配置；单文件失败位置及其他 9 份结果顺序保留。明确无不良事件时查询为空，不触发额外回退。',
'- 原模型、检索参数和独立医审思考配置保留；三个原下载导出与实施前快照一致。','',
'## 15 份病例分类回归','',
'下表使用桌面「题目」目录的既有病例 JSON 与已确认分类基准，检查确定性分类映射及 Questions/detail 一致性。未运行模型从原始文档重新提取分类，也未重新生成或医学审核这 75 道题。','',
'| 病例 ID | cancer_type | second_cancer_type |','| --- | --- | --- |']
for c in cases:lines.append(f"| {c['case_id']} | {c['cancer_type']} | {c['second_cancer_type']} |")
lines+=['','重点覆盖乳腺原发伴肺转移、胰腺原发伴肝转移、直肠原发、胰腺神经内分泌肿瘤，以及其他已整理病例的字段映射。','',
'## 尚需平台确认','',
'未导入、发布或调用线上应用；未验证真实模型输出稳定性、医学内容是否全面改进、部署版本兼容性、平台/模型限流和实际耗时。提示词已明确分类及医学边界规则，其真实遵循情况仍需试跑。10 文件测试为离线完整结果模拟，不是 10 文件线上压测。','',
'逐项测试结果、病例分类明细、完整映射和文件 SHA-256 见「校验资料」子目录。源码与可重跑脚本位于工作区 `work/workflow-20260910/`。','']
(OUT/'离线校验报告.md').write_text('\n'.join(lines),encoding='utf-8')
archive=ROOT/'outputs/OncoRounds-三套工作流测试版-20260910.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for f in sorted(OUT.rglob('*')):
        if f.is_file(): z.write(f,f.relative_to(OUT))
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert len([n for n in z.namelist() if n.startswith(('01-','02-','03-')) and n.endswith('.json')])==3
print(json.dumps({'archive':str(archive),'size_bytes':archive.stat().st_size,'tests':len(tests),'originals_unchanged':True},ensure_ascii=False))
