import json,copy,re,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
WORK=Path(__file__).parent
OUT=ROOT/'outputs/三连单次调用优化版-20260917'
OUT.mkdir(exist_ok=True)
d=json.loads((WORK/'source.json').read_text(encoding='utf-8'))
original=copy.deepcopy(d)
removed={'lhHp2keNSraloevA','mDQGMnWR0QYZZCJ4'}
d['nodes']=[n for n in d['nodes'] if n['nodeId'] not in removed]
d['edges']=[e for e in d['edges'] if e['source'] not in removed and e['target'] not in removed]
nodes={n['nodeId']:n for n in d['nodes']}
def inp(id,k):return next(i for i in nodes[id]['inputs'] if i['key']==k)
def code(id):return inp(id,'code')['value']
def replace(id,old,new):
    s=code(id);assert old in s,(id,old[:100]);inp(id,'code')['value']=s.replace(old,new)

# Preserve application identity/version and all case bindings, remove A-only teaching focus.
app=nodes['ddwhzFImUXV1QTsA']
inp(app['nodeId'],'yyhLw3hG')['value']=['ogy1PAMdD268kXeo','nZ569o']
inp(app['nodeId'],'tjZeuUQb')['value']=['ogy1PAMdD268kXeo','tFoCUR']
inp(app['nodeId'],'tjZeuUQb')['selectedType']='reference'
inp(app['nodeId'],'userChatInput')['value']='请仅根据本次病例变量及真实检索证据完整出题，目标5个不同临床决策点；实际不足时返回已有题目和具体原因。输出最终结果包，不补充外部引用。'
app['intro']='仅调用一次原题目生成子应用；保留该应用的检索、医学审核及最多一次修订。'

pool=nodes['bJcPjyWI8hiwuVOS'];pool['name']='单组候选检查与终稿输入'
pool['inputs']=[i for i in pool['inputs'] if i['key'] not in ['group2','group3','group2_error','group3_error']]
replace(pool['nodeId'],'function main({ group1, group2, group3, case_packet, group1_error, group2_error, group3_error })','function main({ group1, case_packet, group1_error })')
replace(pool['nodeId'],'[group1, group2, group3].forEach','[group1].forEach')
replace(pool['nodeId'],'[group1_error,group2_error,group3_error][gi]','group1_error')
replace(pool['nodeId'],'return { candidate_pool, system_text: JSON.stringify({...candidate_pool, evidence_records: evidenceRecords.map(({raw_snippet, ...r})=>r)}) };', '''const editorialInput = {
    instruction:'单组原题的题序整理与等义文字编辑；禁止变更答案、选项、医学事实和指南来源。',
    candidates:candidates.map(c=>({candidate_id:c.candidate_id,question:c.question,source_question_audit:c.source_question_audit})),
    original_order:candidates.map(c=>c.candidate_id)
  };
  return {candidate_pool, system_text:JSON.stringify(editorialInput),has_candidates:candidates.length>0};''')
pool['outputs'].append({'id':'has_candidates','key':'has_candidates','type':'dynamic','valueType':'boolean','label':'存在有效候选','description':''})
editor=nodes['ltrYX3w0AXTIiF0r'];editor['name']='单组题目终稿优化'
inp(editor['nodeId'],'systemPrompt')['value']=(WORK/'editor-prompt.txt').read_text(encoding='utf-8')
for k in ['aiChatVision','aiChatExtractFiles']:inp(editor['nodeId'],k)['value']=False
# A no-candidate path must not spend another model call.
gate={'nodeId':'singleEditorialGate20260917','name':'是否有题目可整理','intro':'零题或子调用失败直接组装不足结果，不调用终稿模型。','avatar':'core/workflow/template/ifelse','flowNodeType':'ifElseNode','showStatus':True,'position':{'x':pool['position']['x']+450,'y':pool['position']['y']},'inputs':[{'key':'ifElseList','label':'','valueType':'any','selectedType':'hidden','renderTypeList':['hidden'],'value':[{'condition':'AND','list':[{'variable':[pool['nodeId'],'has_candidates'],'condition':'equalTo','value':'true','valueType':'input'}],'branchId':'hasCandidates'}]}],'outputs':[{'id':'ifElseResult','key':'ifElseResult','type':'static','valueType':'string','label':'workflow:judgment_result','description':''}]}
d['nodes'].append(gate)
d['edges']=[e for e in d['edges'] if not(e['source']==pool['nodeId'] and e['target']==editor['nodeId'])]
def edge(a,b,branch='right'):return {'source':a,'target':b,'sourceHandle':a+'-source-'+branch,'targetHandle':b+'-target-left'}
d['edges'] += [edge(pool['nodeId'],gate['nodeId']),edge(gate['nodeId'],editor['nodeId'],'hasCandidates'),edge(gate['nodeId'],'jKqMCN8eJKvkngnI','ELSE')]

final='jKqMCN8eJKvkngnI'
inp(final,'code')['value']=(WORK/'editor-guard.js').read_text(encoding='utf-8')+'\n'+code(final)
replace(final,"report.selection_status='success';", "selected=selected.sort((a,b)=>a.stable_index-b.stable_index);\n  selected=applyEditorialEdits(selected,report.selection_method==='model_ids'?agent_reply:null,report);\n  report.selection_status='success';")
replace(final,'三组均未返回结构有效的题目，不能复制或补造题目','本次调用未返回结构有效的题目，不能复制或补造题目')
replace(final,"questions:selected.map((c,i)=>({...c.question,id:'Q'+(i+1)})),missing_information:[]", "questions:selected.map((c,i)=>({...c.question,id:'Q'+(i+1)})),missing_information:[...new Set(pool.groups.flatMap(g=>g.upstream_missing_information||[]))]")
replace(final,'    missing_information: [] };','    missing_information: source.missing_information || [] };')
replace(final,': "时间未详",', ''' : (()=>{
                const stage=detail.split(/[：:]/)[0].trim();
                return stage.length<=30 && /初诊|就诊|入院|术前|术后|治疗|随访|出院|复发|进展|周期|个月|年后|周后|天后/.test(stage)?stage:'时间未详';
              })(),''')
# After editing, only the original candidate is covered by the upstream medical review.
replace(final,"source_question_audit:c.source_question_audit||null}));", "source_question_audit:c.source_question_audit||null,audit_scope:report.editorial.applied.some(e=>e.candidate_id===c.candidate_id)?'original_before_editorial_not_revalidated':'original_candidate'}));")
# Adopt latest display agreement; retain secondary type only inside workflow inputs.
for id in ['ogy1PAMdD268kXeo',final]:
    s=code(id)
    for name in ['胃癌','肺癌','直肠癌','乳腺癌','食管癌','胰腺癌']:
        s=re.sub(r'"'+name+r'": "[^"]*"','"'+name+'": "'+name+'"',s,count=1)
    inp(id,'code')['value']=s
replace(final,'Questions.second_cancer_type = classification.second_cancer_type;','delete Questions.second_cancer_type;')
replace(final,'detail.second_cancer_type=Questions.second_cancer_type;','delete detail.second_cancer_type;')
replace(final,"['case_id', 'cancer_type', 'second_cancer_type', 'difficulty']","['case_id', 'cancer_type', 'difficulty']")
replace(final,'const output_data = { Questions, detail };', '''if(Object.keys(detail).length){
    detail.image={src:'',alt:''};
    const tab=detail.overview?.tabs?.find(t=>t.id==='images');
    if(tab){tab.label='病例图片';tab.order=3;tab.image_items=[];}
  }
  const output_data = { Questions, detail };''')
# Preserve raw clinical uncertainty notes: format repair is not a clinical-content filter.
repair='d4esByk5Pccmn1gH';s=code(repair)
start=s.index('  if (typeof parsed.evidence_notes === "string")')
end=s.index('\n  /**',start)
s=s[:start]+'  // evidence_notes原样保留，禁止格式修复节点删除临床不确定性说明。\n'+s[end:]
inp(repair,'code')['value']=s
# Prevent prior chat content leaking into HTML cleanup.
inp('glGeIMqOVaSRs5jF','history')['value']=0
d['name']='三连-单次出题与终稿优化-测试版'
d['intro']='基于三连(9)：仅一次题目生成调用；终稿等义表达整理，原引用锁定、异常回退；六类癌种显示、二级隐藏、病例图片为空。'
path=OUT/'三连-单次出题与终稿优化-测试版.json'
path.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(WORK/'build-manifest.json').write_text(json.dumps({'source_sha256':hashlib.sha256((WORK/'source.json').read_bytes()).hexdigest(),'nodes_before':len(original['nodes']),'nodes_after':len(d['nodes']),'edges_after':len(d['edges']),'app_calls':sum(n['flowNodeType']=='appModule' for n in d['nodes']),'output':str(path)},ensure_ascii=False,indent=2),encoding='utf-8')
print(path)
