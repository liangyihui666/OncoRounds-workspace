const fs = require('fs');
const path = require('path');
const basePath = 'outputs/病例前处理提示词修订-20260928/HTML测试外层-病例整理提示词修订版.json';
const outDir = 'outputs/病程轴与状态修复-20260928';
const workflow = JSON.parse(fs.readFileSync(basePath, 'utf8'));
function input(id) { return workflow.nodes.find(n => n.nodeId === id).inputs.find(i => i.key === 'code'); }
function replaceOnce(code, before, after) {
  if (code.split(before).length !== 2) throw new Error('Expected one match: ' + before.slice(0, 90));
  return code.replace(before, after);
}
const node = input('jKqMCN8eJKvkngnI');
let code = node.value;
const start = code.indexOf('  function buildTimelineItems() {');
const end = code.indexOf('\n  const timelineItems =', start);
if (start < 0 || end < 0) throw new Error('Timeline function missing');
const timeline = String.raw`  function buildTimelineItems() {
    const raw = String(case_timeline ?? '').trim();
    if (!raw) return [];
    // Only explicit leading dates/stages are dates. Never search inside event facts.
    const absolute = String.raw\`(?:19|20)\d{2}(?:年(?:\s*\d{1,2}月(?:\s*\d{1,2}日)?)?|[./-]\d{1,2}(?:[./-]\d{1,2})?)(?:\s*[—–~～至]\s*(?:(?:19|20)\d{2}[年./-])?\d{1,2}(?:月(?:\d{1,2}日)?|[./-]\d{1,2})?)?\`;
    const relative = String.raw\`(?:初诊(?:时)?|首次就诊(?:时)?|入院(?:时|前|后)?|术前|术后|出院(?:时|前|后)?|复发(?:时)?|进展(?:时)?|随访(?:时)?|治疗(?:前|后|期间)|第[一二三四五六七八九十百\d]+(?:次住院|周期|疗程)(?:治疗)?(?:前|后|期间)?|(?:术后|入院后|出院后|治疗后)[一二三四五六七八九十半\d]+(?:个?月|年|周|天|日)|[一二三四五六七八九十半\d]+(?:个?月|年|周|天|日)(?:后|前)|时间(?:未详|不详|未提供))\`;
    const time = '(?:' + absolute + '|' + relative + ')';
    const labelPattern = new RegExp('^' + time + '$');
    const prefixPattern = new RegExp('^(' + time + ')(?=[\\s：:，,]|$)');
    // Old one-line timelines may use semicolons between explicitly dated events.
    // Keep all other semicolons inside the same event; structured rows stay intact.
    const legacyBoundary = new RegExp('[；;]\\s*(?=' + time + '(?:[\\s：:，,]|$))', 'g');
    const lines = raw.split(/\r\n?|\n/).map(s => s.trim()).filter(Boolean);
    const entries = lines.flatMap(line => /[｜|]/.test(line) ? [line] : line.split(legacyBoundary));
    return entries.filter(s => s.trim()).map((entry, index) => {
      const line = entry.trim();
      const parts = line.split(/[｜|]/).map(s => s.trim());
      if (parts.length >= 3 && labelPattern.test(parts[0])) {
        return {
          date: parts[0],
          title: parts[1] || ('诊疗节点 ' + (index + 1)),
          detail: parts.slice(2).join('｜')
        };
      }
      const match = line.match(prefixPattern);
      // Preserve unrecognized text verbatim. No inherited or computed date.
      return {
        date: match ? match[1] : '时间未详',
        title: '诊疗节点 ' + (index + 1),
        detail: line
      };
    });
  }
`.replaceAll('\\`', '`');
code = code.slice(0, start) + timeline + code.slice(end);
code = replaceOnce(code, "scope:'original_reviewed_text_preserved'", "scope:'original_candidate_text_preserved'");
code = replaceOnce(code, "notice:'终选保留真实审核信息，成功生成不等于医学审核通过',workflow_revision:'20260910-two-level-test'", "notice:'未提供与返回题目绑定的独立医学审核记录；程序检查不代表医学正确性。',workflow_revision:'20260928-timeline-status-fix',medical_review_status:'not_provided'");
code = replaceOnce(code, '  const normalize=s=>', `  const declaredUnreviewed = pool.groups.length > 0 && pool.groups.every(g => g.medical_review_status === 'not_performed' || g.workflow_revision === '20260928-two-stage-revision');
  if (declaredUnreviewed) {
    report.medical_review_status = 'not_performed';
    report.notice = '本流程未进行独立医学审核；程序检查仅检查结构及引用定位，不代表医学正确性。';
  }
  const normalize=s=>`);
code = replaceOnce(code, "quality_notice:warnings.join('\\n')", "quality_notice:[report.notice,...warnings].join('\\n')");
code = replaceOnce(code, ";if(!c.source_question_audit)warnings.push(c.candidate_id+'未提供与原题绑定的审核，不能视为PASS');", ';');
code = replaceOnce(code, "  let seed=2166136261;", `  if(selected.some(c => c.source_question_audit)) {
    report.medical_review_status = selected.every(c => c.source_question_audit) ? 'provided_not_confirmed' : 'partially_provided';
    report.notice = '已保留上游提供的审核记录，未在本流程重新核验；程序检查不代表医学正确性。';
  }
  let seed=2166136261;`);
node.value = code;
const poolNode = input('bJcPjyWI8hiwuVOS');
poolNode.value = replaceOnce(poolNode.value, '        info.flow_publishable = envelope.publishable ?? null;', `        info.flow_publishable = envelope.publishable ?? null;
        info.output_ready = envelope.output_ready ?? null;
        info.medical_review_status = envelope.medical_review_status ?? 'not_provided';`);
fs.mkdirSync(outDir, {recursive:true});
fs.writeFileSync(path.join(outDir, 'HTML测试外层-病程轴与状态修复版.json'), JSON.stringify(workflow, null, 2));
console.log('Built workflow: ' + outDir);
