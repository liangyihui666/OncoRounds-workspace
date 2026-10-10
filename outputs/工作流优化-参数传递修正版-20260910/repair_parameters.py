"""Repair code-node input metadata only; retain app bindings, code and topology.

Usage: python repair_parameters.py INPUT.json OUTPUT.json
"""
import copy, json, sys
from pathlib import Path

def repair(workflow):
    fixed=copy.deepcopy(workflow)
    changes=[]
    for n in fixed['nodes']:
        if n.get('flowNodeType')!='code': continue
        dynamic=next((i for i in n['inputs'] if i.get('renderTypeList',[None])[0]=='addInputParam'),None)
        if not dynamic: continue
        template=next((i for i in n['inputs'] if i.get('canEdit') and i.get('customInputConfig')),dynamic)
        for i in n['inputs']:
            if i['key'] in ['code','codeType','system_addInputParam'] or i.get('canEdit'): continue
            # Limit edits to the known inputs introduced by this delivery.
            if i['key'] not in ['cancer_type','second_cancer_type','r2_patch_decision','group1_error','group2_error','group3_error'] and not i['key'].endswith('_system_error'): continue
            i['canEdit']=True
            if 'customInputConfig' in template:i['customInputConfig']=copy.deepcopy(template['customInputConfig'])
            i.setdefault('debugLabel','');i.setdefault('toolDescription','');i.setdefault('canAgentGenerated',False)
            changes.append({'nodeId':n['nodeId'],'node_name':n['name'],'input':i['key']})
    return fixed,changes

if __name__=='__main__':
    src,dest=map(Path,sys.argv[1:3])
    original=json.loads(src.read_text(encoding='utf-8-sig'))
    fixed,changes=repair(original)
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(fixed,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'output':str(dest),'changed_inputs':len(changes),'changes':changes},ensure_ascii=False))
