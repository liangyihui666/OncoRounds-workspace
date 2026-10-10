import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path('C:/Users/admin/.codex/attachments/e550623a-f29d-48e6-95f0-7381c80802c5/已粘贴的文本.txt')
OUT = ROOT / 'outputs/OCR衔接出题-20260928'
OUT.mkdir(parents=True, exist_ok=True)
original = json.loads(SOURCE.read_text(encoding='utf-8-sig'))
d = copy.deepcopy(original)
variables = {v['key']: v['label'] for v in d['chatConfig']['variables']}
packet = next(n for n in d['nodes'] if n['nodeId'] == 'v12CasePacket')
fields = ['case_id','case_title','disease','case_context','learning_points','case_mode','case_timeline','biomarkers','decision_points','adverse_events','evidence_notes','case_intro_images','cancer_type','second_cancer_type']
code = '''function main({ ocr_result }) {
  let source = ocr_result;
  if (typeof source === 'string') {
    const text = source.trim().replace(/^```(?:json)?\\s*/i, '').replace(/\\s*```$/, '');
    try { source = JSON.parse(text); }
    catch (_) { throw new Error('请粘贴 OCR 输出的完整病例 JSON，不要粘贴原文件或“开始”。'); }
  }
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('OCR 结果应为一个病例 JSON 对象。');
  }
  const fields = FIELDS;
  const packet = {};
  for (const key of fields) {
    const value = source[key];
    if (key === 'case_intro_images') {
      if (value != null && (!Array.isArray(value) || value.length !== 0)) {
        throw new Error('case_intro_images 应为 []；本流程只接收已识别的病例字段。');
      }
      packet[key] = [];
    } else {
      if (value != null && typeof value !== 'string') throw new Error(key + ' 应为字符串，请检查 OCR 输出。');
      packet[key] = value == null ? '' : value;
    }
  }
  const missing = ['case_title','disease','case_context','case_mode','decision_points'].filter(k => !packet[k].trim());
  if (packet.case_mode === '全程管理' && !packet.case_timeline.trim()) missing.push('case_timeline');
  if (missing.length) throw new Error('OCR 病例字段缺失：' + missing.join('、') + '。请核对上游结果，不要补造病例信息。');
  if (!['全程管理','单时间点'].includes(packet.case_mode)) throw new Error('case_mode 应为全程管理或单时间点。');
  const result = {
    case_packet: packet,
    case_packet_json: JSON.stringify(packet),
    case_packet_text: fields.filter(k => typeof packet[k] === 'string' && packet[k]).map(k => '【' + k + '】\\n' + packet[k]).join('\\n\\n'),
    dedupe_report: {policy:'接收 OCR 病例字段，保留原文，不去重、不摘要、不补写', removed_duplicate_count:0}
  };
  for (const key of fields) result[key] = packet[key];
  return result;
}
'''.replace('FIELDS', json.dumps(fields, ensure_ascii=False))
packet['name'] = '接收OCR病例字段'
packet['intro'] = '接收上游已核对的病例 JSON；只检查字段与类型，保留原文、冲突和待核实说明。'
packet['inputs'] = [i for i in packet['inputs'] if i['key'] in ['system_addInputParam','codeType','code']]
next(i for i in packet['inputs'] if i['key'] == 'code')['value'] = code
packet['inputs'].append({'key':'ocr_result','label':'OCR病例JSON','valueType':'string','required':True,'selectedType':'reference','renderTypeList':['reference'],'value':['448745','userChatInput']})
for field in fields:
    packet['outputs'].append({'id':field,'key':field,'type':'dynamic','valueType':'arrayString' if field == 'case_intro_images' else 'string','label':field,'description':''})

def rebind(value):
    if isinstance(value, list):
        if len(value) == 2 and value[0] == 'VARIABLE_NODE_ID':
            field = variables[value[1]]
            assert field in fields, field
            return ['v12CasePacket', field]
        return [rebind(v) for v in value]
    if isinstance(value, dict):
        return {k:rebind(v) for k,v in value.items()}
    return value

d['nodes'] = rebind(d['nodes'])
for n in d['nodes']:
    for i in n.get('inputs', []):
        if i['key'] == 'system_textareaInput' and isinstance(i.get('value'), str):
            i['value'] = i['value'].replace('仅做完全相同段落去重，未概括事实', '直接接收 OCR 病例字段，保留原文与待核实说明')
for edge in d['edges']:
    if edge['source'] == '448745' and edge['target'] != 'v12CasePacket':
        edge['source'] = 'v12CasePacket'
        edge['sourceHandle'] = 'v12CasePacket-source-right'
d['chatConfig']['variables'] = []
welcome = '请先核对 OCR 病例结果，再将完整病例字段 JSON 粘贴到聊天框并发送。无需再次上传文件或逐项填写字段。'
d['chatConfig']['welcomeText'] = welcome
d['chatConfig'].setdefault('welcomeConfig', {})['welcomeText'] = welcome
d['name'] = '题目生成-OCR结果直连-输入衔接测试版'
d['intro'] = '仅修改病例输入层：OCR 14字段 JSON → 字段检查与直传 → 原有检索、出题、审核。'
assert 'VARIABLE_NODE_ID' not in json.dumps(d, ensure_ascii=False)
file = OUT / '题目生成-OCR结果直连-测试版.json'
file.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT / '接收OCR病例字段.js').write_text(code,encoding='utf-8')
(OUT / '原始工作流备份.json').write_text(json.dumps(original,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT / '使用说明.md').write_text('''# OCR 结果衔接出题：输入层测试版

导入 `题目生成-OCR结果直连-测试版.json` 到测试应用。核对 OCR 输出后，将其完整的 14 字段 JSON 粘贴到聊天框并发送；不上传原始文件，不填写 draftData。

本次仅处理第一部分。复用原病例打包节点，替换为「接收OCR病例字段」，移除跨字段去重及癌种重映射，逐字保留 OCR 字段值。取消手填全局变量，检索与最终输出全部改为引用该节点。必填标题、病种、正文、模式、决策点；全程管理另需时间线。可选字段缺失补空字符串，图片为空数组。不默认补充病例编号、临床事实或证据。

后续检索工具、模型、医学审核、修订及发布规则沿用上传版本，未作重构。输入格式检查不等于医学事实核验。资料中的待核实说明保留在 evidence_notes 中。题目及解析仍需经过原有审核。

自动衔接时，由调用方将 OCR 输出的 JSON 字符串传入本应用的用户问题（userChatInput）。本次未修改 OCR 应用、调用方或线上应用，尚未自动串联两个应用。

仅完成离线检查；平台导入、真实检索和模型运行需在测试应用验证。原文件保持不变。
''',encoding='utf-8')
print(file)
