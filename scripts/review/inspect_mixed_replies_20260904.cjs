const fs = require('fs');
const ids = ['8e496144-1f5c-414c-9b08-302fbaeaad7d','fcd36459-e93c-4955-abc7-e95042239e08','1e9465a7-86a6-4ad0-bb1e-728d246b0834'];
function blocks(t) {
  const out = [];
  let start = -1, depth = 0, quoted = false, escaped = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (start < 0) { if (c === '{') { start = i; depth = 1; } continue; }
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; continue; }
    if (c === '"') quoted = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) {
      try { out.push({ start, end: i + 1, o: JSON.parse(t.slice(start, i + 1)) }); }
      catch (e) { out.push({ start, end: i + 1, error: e.message }); }
      start = -1;
    }
  }
  return out;
}
for (const id of ids) {
  const o = JSON.parse(fs.readFileSync('C:/Users/admin/.codex/attachments/' + id + '/pasted-text.txt', 'utf8'));
  console.log('\nFILE', id, o.case_packet.case_id, o.case_packet.disease);
  for (const k of ['group1','group2','group3']) {
    console.log(k);
    for (const [i,b] of blocks(o[k]).entries()) {
      const z = b.o || {};
      console.log(JSON.stringify({ i, range: [b.start,b.end], keys: Object.keys(z), generation_status: z.generation_status,
        decision: z.decision, score: z.score, questions: z.questions?.length, refs: z.questions?.filter(q => q.guidelineRef).length,
        mode: z.revision_mode, missing: z.missing_information?.slice(0,2), risk: z.risk_message?.slice(0,120), error: b.error }));
    }
  }
}
