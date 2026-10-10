import copy
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
OUT=ROOT/'outputs/病例资料预处理-20260924'
src=json.loads(Path('C:/Users/admin/Downloads/市场部-病例收集-豪森(pdf).json').read_text(encoding='utf-8-sig'))
latest=json.loads((ROOT/'outputs/三连首页短文案版-20260918/三连-单次出题-首页短文案-测试版.json').read_text(encoding='utf-8-sig'))
templates={n['flowNodeType']:n for n in src['nodes']}
answer_template=next(n for n in latest['nodes'] if n['flowNodeType']=='answerNode')
nodes=[]; edges=[]
def inp(n,k,v):
    next(i for i in n['inputs'] if i['key']==k)['value']=v
def node(kind,id,name,x,y):
    n=copy.deepcopy(templates[kind]);n.update(nodeId=id,name=name,position={'x':x,'y':y})
    nodes.append(n);return n
def edge(a,b,branch='right'):
    edges.append({'source':a,'target':b,'sourceHandle':a+'-source-'+branch,'targetHandle':b+'-target-left'})
def code(id,name,file,inputs,outputs,x,y):
    n=node('code',id,name,x,y)
    base=n['inputs'][:3]
    sample=copy.deepcopy(n['inputs'][3])
    for key,typ,ref in inputs:
        i=copy.deepcopy(sample);i.update(key=key,label=key,valueType=typ,value=ref,required=False);base.append(i)
    n['inputs']=base;inp(n,'code',(HERE/file).read_text(encoding='utf-8'))
    n['outputs']=n['outputs'][:3]+[{'id':k,'key':k,'label':k,'valueType':t,'type':'dynamic'} for k,t in outputs]
    return n
def gate(id,name,ref,cond,x,y):
    n=node('ifElseNode',id,name,x,y)
    c={'variable':ref,'condition':cond,'valueType':'input'}
    if cond=='equalTo':c['value']='true'
    inp(n,'ifElseList',[{'condition':'AND','list':[c],'branchId':'IF'}]);return n
def chat(id,name,prompt,user,x,y):
    n=node('chatNode',id,name,x,y)
    for k,v in {'systemPrompt':(HERE/prompt).read_text(encoding='utf-8'),'userChatInput':user,'temperature':0.1,'maxToken':8192,'history':0,'isResponseAnswerText':False,'aiChatVision':False,'aiChatExtractFiles':False,'aiChatReasoning':False,'fileUrlList':[]}.items():inp(n,k,v)
    n['catchError']=True;return n

node('workflowStart','caseStart','流程开始',0,200)
code('routeFiles','文件类型分流','route.js',[
 ('urls','arrayString',['caseStart','userFiles']),('draftData','string',['VARIABLE_NODE_ID','draftData'])],
 [('imgUrls','arrayString'),('docUrls','arrayString'),('rawHtml','string'),('manifest','string'),('routeIssues','string')],450,200)
gate('docGate','是否有PDF或HTML',['routeFiles','docUrls'],'isNotEmpty',900,200)
doc=node('readFiles','parseDocs','PDF与HTML文档解析',1350,0)
inp(doc,'fileUrlList',[['routeFiles','docUrls']]);doc['catchError']=True
code('collectFiles','正文整理与内嵌图片提取','collect.js',[
 ('imgUrls','arrayString',['routeFiles','imgUrls']),('docUrls','arrayString',['routeFiles','docUrls']),
 ('rawHtml','string',['routeFiles','rawHtml']),('routeIssues','string',['routeFiles','routeIssues']),
 ('docText','string',['parseDocs','system_text']),('docError','string',['parseDocs','system_error_text'])],
 [('ocrUrls','arrayString'),('imageLabels','string'),('textBlocks','string'),('issues','string'),('expectedImages','number')],1800,200)
gate('imgGate','是否有图片需要OCR',['collectFiles','ocrUrls'],'isNotEmpty',2250,200)
ocr=node('tool','imageOCR','图片OCR-高精版',2700,0)
ocr['avatar']='core/workflow/template/readFiles'
inp(ocr,'urls',[['collectFiles','ocrUrls']]);ocr['catchError']=True
code('aggregate','识别完整性检查','aggregate.js',[
 ('texts','arrayString',['imageOCR','texts']),('ocrError','string',['imageOCR','system_error_text']),
 ('imageLabels','string',['collectFiles','imageLabels']),('textBlocks','string',['collectFiles','textBlocks']),
 ('issues','string',['collectFiles','issues']),('expectedImages','number',['collectFiles','expectedImages'])],
 [('sourceText','string'),('issues','string'),('ready','string')],3150,200)
gate('readyGate','是否有完整可用正文',['aggregate','ready'],'equalTo',3600,200)
chat('extractCase','病例变量提取','extract-prompt.txt','请整理以下病例资料：\n{{$aggregate.sourceText$}}',4050,0)
chat('reviewCase','提取结果独立核对','review-prompt.txt','materials：\n{{$aggregate.sourceText$}}\ncandidate：\n{{$extractCase.answerText$}}',4500,0)
code('finalize','结构与脱敏检查及输出','finalize.js',[
 ('draft','string',['extractCase','answerText']),('review','string',['reviewCase','answerText']),
 ('extractError','string',['extractCase','system_error_text']),('reviewError','string',['reviewCase','system_error_text']),
 ('issues','string',['aggregate','issues']),('ready','string',['aggregate','ready'])],[('output','string')],4950,200)
ans=copy.deepcopy(answer_template);ans.update(nodeId='caseOutput',name='病例变量JSON输出',position={'x':5400,'y':200});inp(ans,'text','{{$finalize.output$}}');nodes.append(ans)
for a,b,branch in [
 ('caseStart','routeFiles','right'),('routeFiles','docGate','right'),
 ('docGate','parseDocs','IF'),('docGate','collectFiles','ELSE'),('parseDocs','collectFiles','right'),
 ('collectFiles','imgGate','right'),('imgGate','imageOCR','IF'),('imgGate','aggregate','ELSE'),('imageOCR','aggregate','right'),
 ('aggregate','readyGate','right'),('readyGate','extractCase','IF'),('readyGate','finalize','ELSE'),
 ('extractCase','reviewCase','right'),('reviewCase','finalize','right'),('finalize','caseOutput','right')]:edge(a,b,branch)
config=copy.deepcopy(src['chatConfig'])
config['variables']=[{'key':'draftData','label':'draftData（可选病例正文）','valueType':'string','required':False,'type':'input','description':'上传文件时可留空；也可直接粘贴一份已脱敏病例的HTML或文本正文。','defaultValue':''}]
welcome='请上传同一病例的图片、PDF或HTML（最多8个文件），并发送“整理病例”。也可填写draftData正文。输出为待核对的病例变量草稿，不自动出题。'
config['welcomeText']=welcome;config['welcomeConfig']={'welcomeText':welcome}
result={'nodes':nodes,'edges':edges,'chatConfig':config,'type':'advanced','name':'大查房-病例资料预处理-图片PDFHTML-测试版','intro':'图片OCR、PDF增强解析、HTML正文及可访问内嵌图片识别；输出病例变量草稿，独立核对后供人工确认。'}
OUT.mkdir(parents=True,exist_ok=True)
(OUT/'大查房-病例资料预处理-图片PDFHTML-测试版.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('已构建',len(nodes),'节点',len(edges),'连线')
