"""Patch a current generator export, preserving unrelated nodes and references."""
import copy, json, sys
from pathlib import Path
BASE=Path(__file__).resolve().parent
CONFIG={
 'c4VtiMJKVkMxJ9O5':dict(purpose='初始临床分期指南',fields=[dict(key='case_context',budget=240,label='病例摘录（核对初诊时点）')],scope='匹配本病种的分期检查、区域及远处病变评估；复发事实不得反推初诊。'),
 'q0CMNrCkFGt4LYVq':dict(purpose='病理与生物标志物检测指南',fields=[dict(key='biomarkers',budget=170,label='已记录检测'),dict(key='decision_points',budget=90,label='实际决策')],scope='匹配本病种的病理分型、检测方法及时机；区分初诊与复发。'),
 'nWJ1txLnlLszyUU5':dict(purpose='治疗复评与后续管理指南',fields=[dict(key='decision_points',budget=260,label='实际治疗与决策')],scope='仅检索已涉及的方案、疗效复评、局部治疗或随访；匹配治疗阶段。'),
 'p3yBjyK1YBhY5m8v':dict(purpose='与病例实际治疗匹配的原始临床研究',fields=[dict(key='decision_points',budget=260,label='实际治疗与决策')],scope='匹配人群、治疗阶段、方案及终点；须为已报告结果的原始研究。')
}
def patch(w):
 w=copy.deepcopy(w)
 nodes={n['nodeId']:n for n in w['nodes']}
 template=nodes['v12CasePacket']
 inputs={i['key']:i for i in template['inputs']}
 code_template=(BASE/'compact-query.js').read_text(encoding='utf-8')
 for nid,config in CONFIG.items():
  n=nodes[nid]
  assert n['flowNodeType'] in ('textEditor','code'),nid
  new_inputs=[copy.deepcopy(inputs[k]) for k in ['system_addInputParam','codeType','code']]
  new_inputs[2]['value']=code_template.replace('__QUERY_CONFIG__',json.dumps(config,ensure_ascii=False))
  for key in ['disease','second_cancer_type']+[f['key'] for f in config['fields']]:
   i=copy.deepcopy(inputs[key]);i['canEdit']=True;new_inputs.append(i)
  n.update(flowNodeType='code',avatar=template['avatar'],inputs=new_inputs,catchError=False)
  n['outputs']=[copy.deepcopy(o) for o in template['outputs'] if o['key'] in ['system_rawResponse','error','system_addOutputParam']]
  for key,typ in [('system_text','string'),('query_report','object')]:
   n['outputs'].append(dict(id=key,key=key,type='dynamic',valueType=typ,label=key,valueDesc='',description=''))
  n['intro']='500字符上限修复：只生成精简检索词；完整病例和重排规则保留'
 # Both assembly paths pass an object for insufficient, an array for ordinary candidates.
 old='validatorEvidence.map(({raw_snippet, ...r}) => ({...r, snippet: typeof raw_snippet === "string" ? raw_snippet : r.snippet}))'
 new='serializeValidatorEvidence(validatorEvidence)'
 helper='''  function serializeValidatorEvidence(evidence) {
    const full = (rows) => (Array.isArray(rows) ? rows : []).map(({raw_snippet, ...r}) => ({...r, snippet: typeof raw_snippet === "string" ? raw_snippet : r.snippet}));
    if (Array.isArray(evidence)) return full(evidence);
    if (evidence && typeof evidence === "object") return {...evidence, records:full(evidence.records)};
    return [];
  }

'''
 for nid in ['cmuTcUhJefVm2DC6','v12AssemblyR2']:
  code=next(i for i in nodes[nid]['inputs'] if i['key']=='code')
  if old in code['value']:
   code['value']=code['value'].replace('  function buildReturn({',helper+'  function buildReturn({',1).replace(old,new)
  else: assert 'function serializeValidatorEvidence' in code['value'], 'Assembly differs; inspect current code before patching'
 # Supplement previously appended unbounded study leads to the initial query.
 n=nodes['r8B6DL8OMe8eix63'];code=next(i for i in n['inputs'] if i['key']=='code')
 if 'function boundedSupplementQuery' not in code['value']:
  helper2='''
function boundedSupplementQuery(base, terms) {
  function wholeUnits(text, limit) {
    const parts=String(text || '').split(/[\\n；;。]/).map(s=>s.trim()).filter(Boolean);
    const kept=[];let length=0;
    for(const part of parts) if(length+part.length+(kept.length?1:0)<=limit){kept.push(part);length+=part.length+(kept.length>1?1:0);}
    return kept.join('；');
  }
  return ['研究线索：'+wholeUnits(terms,180), wholeUnits(base,240), '仅召回匹配病例人群与治疗阶段、已报告结果的原始临床研究。'].join('\\n');
}
'''
  start=code['value'].index('  const expandedQuery = hasLeads')
  end=code['value'].index('\n\n  return {',start)
  code['value']=code['value'][:start]+'  const expandedQuery = hasLeads ? boundedSupplementQuery(baseQuery, expandedTerms) : "";'+code['value'][end:]+helper2
 return w
if __name__=='__main__':
 src,dest=map(Path,sys.argv[1:3])
 result=patch(json.loads(src.read_text(encoding='utf-8-sig')))
 dest.parent.mkdir(parents=True,exist_ok=True)
 dest.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
 print(dest)
