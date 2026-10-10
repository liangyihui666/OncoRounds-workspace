// Derive a new import copy; preserve original serialization outside four prompt values.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../..');
const sourcePath = path.join(root, 'outputs/题目生成-首轮75分-第二轮直接放行-兼容导入版.json');
const outputPath = path.join(root, 'outputs/题目生成-质量优化-首轮75分-二轮直出-20260904.json');
const originalRaw = fs.readFileSync(sourcePath, 'utf8');
const workflow = JSON.parse(originalRaw.replace(/^\uFEFF/, ''));
let nextRaw = originalRaw;
const changes = [];

function replaceOnce(text, before, after) {
  assert.equal(text.split(before).length - 1, 1, `Expected unique text: ${before.slice(0, 90)}`);
  return text.replace(before, () => after);
}

function patchPrompt(name, transform) {
  const node = workflow.nodes.find(n => n.name === name);
  assert(node, name);
  const input = node.inputs.find(i => i.key === 'systemPrompt');
  assert.equal(typeof input.value, 'string');
  const after = transform(input.value);
  assert.notEqual(after, input.value);
  nextRaw = replaceOnce(nextRaw, JSON.stringify(input.value), JSON.stringify(after));
  changes.push({ node: name, node_id: node.nodeId, before_chars: input.value.length, after_chars: after.length });
}

const qualityRules = `【证据先行的选题与质量检查】

先在内部为五题分别确定：真实时间点、一个主要决策、决定答案的病例因素、证据中的直接依据、适用边界、与其余题的区别。只输出最终题目，不输出计划，不增加JSON字段。修订时仅在授权题号内执行，并把保留题纳入去重比较。

1. 同一研究的“选某药”“该药改善DFS”“各亚组方向一致”通常仍是同一结论的变体，优先只留最有决策价值的一题。不要为凑五题把同一结论拆成数字记忆题。第二题只有证据确实支持另一独立决策、且满足证据复用合同才可使用；换日期、换终点名称、换来源不等于换决策。
2. 先使用现有合格证据支持的独立方向，不预先指定某道题必须考疗程、某研究、脑转移或某种检查。learning_points是选题偏好，不是已经证实的病例事实。若某方向缺证据，先换方向，不能补造检查结果或套用其他人群。
3. 分清三个状态：材料未提供检查结果，不等于患者未做检查；患者未做检查，不等于检查阴性。题干应准确写“材料未提供同期全身复评结果”，除非原文明确记载“尚未完成”。不得以“假设已证实”为由增加本病例实际未记录的后续状态。
4. 病例摘要、decision_points或learning_points与带日期的检查原文不一致时，不能让摘要里的确定性措辞覆盖原报告的“考虑、疑似”。无法消解的冲突保留为未知，绕开依赖该冲突的确定性治疗题。不推算或改写cTNM、pTNM、ypTNM，不补报未记录的分期版本。
5. 可以在真实信息不足时考查“当前还不能得出什么结论”或证据适用边界；不能因此默认必须先做某检查、必须等待或不得及时处理。若考具体复评顺序、急症处理或治疗组合，绑定证据仍须支持该完整动作及边界。也不能用笼统“交MDT讨论”代替可判别的核心决策。
6. 研究结果用于病例治疗时，核对当前snippet记载的分期版本、肿瘤大小限制、既往系统治疗、手术路径、治疗目的和终点。研究中使用的方案不自动等于所有相似患者的标准。缺少关键适用条件时，不补写“完全符合入组”；可在现有信息支持下考查适用性限制，但不能从模型记忆补造试验排除标准。
7. “本研究采用的疗程”不同于“该病例必须采用的疗程”；DFS获益不等于OS获益，HR不是绝对获益比例，随访时长不是给药疗程。定量题只有影响实际判断且当前snippet直接给出必要数据时才使用，不靠背数字制造进阶难度。
8. 每题只问一个核心问题。四个选项处于相同决策层次，长度、语气和具体程度尽量相近；只有一个最佳答案，另三个为干扰项。干扰项应反映真实易混淆边界，不用“耗尽组织”“完全不评估”“所有患者都必须”等显然荒谬的措辞暴露答案。若题干缺少区分两个合理方案的条件，应换考查点，不能偷偷补病例条件。
9. 解析短述“决定性病例因素＋证据支持的结论＋最有迷惑性干扰项为何不适用”，不能只重复正确选项。不要求逐一写长解析，也不在解析新增证据未支持的治疗结论。
10. 题干、所有选项、answer_text、explain、keyPoint均不得用答案位置指代其他选项，例如“A项”“B和C”“上述两项”；选项文本不带A/B/C/D前缀，不用以上皆是/皆非或组合选项。允许保留真实医学缩写。保证后续调换选项顺序不改变语义。
11. 不为正确答案在A/B/C/D中的分布牺牲题目质量，也不因答案都在B/C而宣布证据不足。内部answer仍是0至3整数，answer_text逐字等于options[answer]；最终答案位置由下游导出处理。
12. 三项病例因素必须真正影响判断，不是机械堆入年龄、性别、药名。hard与clinical_reasoning按证据支持方式分类，不按题干长短、题号或为了凑配额改标签。\n\n`;

patchPrompt('题目生成-首轮', prompt => {
  prompt = replaceOnce(prompt, '【选题与难度】', qualityRules + '【选题与难度】');
  prompt = replaceOnce(prompt,
    '4. 同一 evidence_id 最多支持2题；二次使用时，两题必须具有不同 timepoint、不同主要决策、不同正确结论和不同 keyPoint。',
    '4. 按实际doc_id + split_index定位去重，同一证据最多支持2题；不同evidence_id指向同一定位也合并计数。二次使用时，两题必须具有不同的真实timepoint、不同主要决策、不同正确结论和不同keyPoint。不得为复用证据编造新日期。');
  const invalidExample = '\n以下结构绝对禁止：\n{\n  "options": ["选项一", "选项二", "选项三", "选项四", "answer_text", "选项二"],\n  "answer": 1\n}\n';
  return replaceOnce(prompt, invalidExample, '\n仅使用上面的合法层级，不输出错误结构示例或占位题。\n');
});

patchPrompt('题目修订-第二轮', prompt => {
  prompt = replaceOnce(prompt, '【输出合同】', qualityRules + '【输出合同】');
  prompt = replaceOnce(prompt,
    '- 同一 evidence_id 最多2题，二次使用时必须具有不同 timepoint、不同主要决策、不同正确结论和不同 keyPoint；',
    '- 按实际doc_id + split_index合并计数，同一证据最多2题，二次使用时必须具有不同的真实timepoint、不同主要决策、不同正确结论和不同keyPoint；不得为复用证据编造日期；');
  prompt = replaceOnce(prompt,
    '4. code 为 EVIDENCE_MISMATCH、EVIDENCE_INSUFFICIENT 或 STUDY_RESULT_MISSING 时，必须更换为当前 evidence_pool 中适用且能直接支持完整核心动作的 evidence_id，并同步重写必要题目字段；仅改 support_mode 或 evidence_summary 不算修复。',
    '4. code为EVIDENCE_REPLACEMENT_REQUIRED时，必须更换为当前池中合格且适用的evidence_id，并按其他授权任务同步重建题目。若任务允许通过重写题干消除错配，且原证据能完整支持新的真实决策，可保留evidence_id；不能只改support_mode或evidence_summary掩盖问题。正式输出完整题对象不意味着每个字段的值都必须改变。');
  prompt = replaceOnce(prompt,
    '6. repair_packet.revision_mode="FULL" 且 preserve_ids=[] 时，必须根据全部 repair_tasks 重建Q1至Q5，禁止逐字段复制上一轮五题。若 preserve_ids 非空，仅这些题可原样复制。',
    '6. FULL表示返回完整Q1至Q5，不等于所有题必须改动。严格按repair_tasks.target_ids授权修改，未授权题及preserve_ids逐字段保留。每个实际修复任务须落实到相关授权字段；仍正确且无需修改的字段保留原值，不能为了显示变化损坏通过题。');
  return prompt;
});

const reviewRules = `【统一复核边界】

1. 以当前候选的实际文字判定，不复制上一轮指控；指出硬错误时，在problems或fatal_errors中给出当前短语及对应病例事实或evidence_id中的限制。仅有“可能有风险”而没有具体矛盾，不足以认定虚构事实。
2. 严格区分“材料未提供结果”“实际未做/未完成”“检查阴性”。诚实说明材料缺失并据此考查不能作出的结论，不构成时间错误；把缺失信息说成未做检查，或补成颅外稳定、确诊转移，才是事实升级。不得建议删去未知条件、补造结果来使治疗答案成立。
3. 摘要或教学方向与日期明确的原报告冲突时，保留原报告的不确定性，不使用概括语句升级诊断。不能把病例后来实际接受的治疗反推为此前唯一最佳选择。
4. 按证据当前snippet的具体动作和人群限制审核：一般适用于成人当前病种的分期或病理原则，不因未单独提及某分子亚型就否决；明确限定儿童、晚期姑息或其他治疗路径的推荐，不能外推为本病例的确定性治疗结论。评估的是动作适用条件，不是所有关键词逐字相同。
5. 来源type=meeting/journal、章节标题与正文跨段等，首先是来源元数据问题。若来源身份明确、snippet可独立支持且映射忠实，不得仅因标题不够贴切要求改造元数据或更换证据；若内容因此无法确认完整支持，再指出具体缺失。保持来源标题、type、URL等原值。
6. 同一实际doc_id + split_index最多两题，与生成器及机械检查一致；重复evidence_id别名合并计数。复用须有不同真实timepoint、主要决策、正确结论和keyPoint。不存在“每条证据只能使用一次”的额外硬门槛。同一研究或不同来源都按实质决策去重，不因换终点名称或措辞就算独立题，也不因同一研究名称就自动认定重复。
7. 四个选项＝一个最佳答案＋三个干扰项。干扰项应有可信但不适用于当前条件的理由；医学词多、题干长或背研究数字，不自动构成进阶。解析应指出决定因素与最关键边界，不能只复述选项。
8. 不设置正确答案位置分布硬门槛，不因答案集中B/C否决。禁止位置引用或带字母前缀的选项，以便下游安全调整顺序；医学缩写中的字母不是位置引用。
9. type仅允许：诊断与分期、分子诊断、治疗决策、疗效复评与局部治疗、耐药与后线管理、不良反应管理。不要要求“诊断策略”“证据适用性”等新枚举；根据主要能力归入已有类型。
10. 审核评分与发布路由分开。两轮均报告真实医学decision、score和问题，不因第二轮直出虚报PASS，也不在审核意见中声称下游必定发布0题。后续是否放行由既定发布节点处理。

【可执行的修订任务】

1. 每个任务描述具体需要变化的目标，不把“重新核算”“存在配额风险”单独输出为QUOTA_CHECK、QUOTA_RECALCULATION_RISK等任务。配额问题通过实际失败题的重建或必要的分类修复解决，复核要求写入revision_instruction。
2. 先区分修复方式：证据仍能支持另一真实、独立的考查点时，可要求重建题目而保留证据；坚持原决策必须换证据时，才使用EVIDENCE_REPLACEMENT_REQUIRED。不得无条件要求每个错配题都换evidence_id。
3. 必须换证据的每道题单独输出EVIDENCE_REPLACEMENT_REQUIRED，fields仅为["evidence_id"]；若还需重建内容，另输出QUESTION_REBUILD_REQUIRED，明确授权需要变化的题目字段。无法在当前输入定位合格替代证据时，说明缺口，不编造ID或指定未召回研究。
4. 可保留证据、重建题目即可解决的问题，用QUESTION_REBUILD_REQUIRED、CHRONOLOGY、DUPLICATE_CONTENT或REASONING_DEPTH等具体任务；仅列真实受影响题号与授权字段。不要把改变整题理解为要求每个字段值都必须不同。
5. 正确分类确需变更时，才给具体题号输出SUPPORT_MODE_CHANGE_REQUIRED；不能只为了满足hard或clinical_reasoning数量而改标签。
6. 两题重复时，优先保留事实、证据及干扰项更完整的一题，只重建较弱者；若缺陷相同再同时修订。提出的新方向必须有当前证据支持，不能未经核实要求改成疗程、安全性、SRS或某亚组题。
7. FULL只是完整返回五题。集合级问题可以推荐FULL，但repair_tasks仍精确指向需要变化的题号；通过且不受影响题保持不变。preserve_ids由下游生成，不额外添加到审核JSON。PATCH不得授权改根摘要；根字段需要修复时推荐FULL。
8. 只需修正type、answer_text或其他结构字段时，不得附加无关换证据要求。每个任务只能包含target_ids、code、fields、message四字段；target_ids用真实Q1至Q5，fields只用现有内部题目字段或已支持的根字段。
9. 第二轮重新审核当前题集与实际修复结果，不强求分数高于首轮；前轮建议若要求补造事实或与当前合同冲突，不得机械继续执行，须在general_feedback说明冲突。医学审核不替代机械授权检查，不静默修改候选。

输出仍严格采用前述审核JSON合同，不增加字段或自然语言前言。每项任务必须能够在当前证据和病例边界内执行；没有明确修复动作的建议仅作为软反馈。`;

function updateReview(prompt) {
  prompt = replaceOnce(prompt,
    '- 所有题必须是单项最佳选择，四个干扰项在某些条件下具有合理性但在当前题干下错误、次优或不适用。',
    '- 所有题必须是单项最佳选择，共四个选项：一个最佳答案、三个在特定条件下合理但在本题中错误、次优或不适用的干扰项。');
  prompt = replaceOnce(prompt,
    '- 同一 evidence_id 最多2题，二次使用时须具有不同timepoint、主要决策、正确结论和keyPoint。',
    '- 按实际doc_id + split_index合并计数，同一证据最多2题，二次使用时须具有不同真实timepoint、主要决策、正确结论和keyPoint。');
  return prompt;
}

patchPrompt('题目校验-首轮', prompt => {
  const marker = '【repair_tasks 精确生成规则——最高优先级】';
  assert.equal(prompt.split(marker).length, 2);
  // Remove the conflicting appended rules, not merely add another priority override.
  prompt = prompt.slice(0, prompt.indexOf(marker)).trimEnd();
  prompt = updateReview(prompt);
  return prompt + '\n\n' + reviewRules;
});

patchPrompt('题目校验-第二轮', prompt => {
  prompt = updateReview(prompt);
  prompt = replaceOnce(prompt,
    '3. 上一轮失败题如改变主要决策、正确答案、证据、人群、治疗阶段或support_mode，必须完整替换question、options、answer、answer_text、explain、keyPoint、evidence_id、support_mode和evidence_summary，不得只改措辞或标签。',
    '3. 上一轮失败题如改变主要决策、正确答案、证据、人群、治疗阶段或support_mode，必须返回完整题对象并同步修正受影响字段；仍正确的字段可以保留原值。不得只改措辞或标签掩盖医学问题。');
  prompt = replaceOnce(prompt,
    '4. recommended_revision_mode="FULL" 时允许整组重建，但必须逐项解决上一轮全部硬错误，并重新计算hard、clinical_reasoning、重复度和证据适用性。',
    '4. FULL要求完整返回五题，实际修改仍以repair_tasks的题号授权为准，未授权题保持不变；逐项核对真实缺陷是否解决，并重新计算hard、clinical_reasoning、重复度和证据适用性。');
  prompt = replaceOnce(prompt,
    '7. 第二轮最多是最后一次审核机会，但达到轮次上限不构成PASS理由。仍有任何硬错误时必须返回REVISE，由下游归一为REVISE_EXHAUSTED并发布0题。',
    '7. 第二轮仍按相同标准报告医学审核结论，达到轮次上限不构成医学PASS理由。有硬错误仍返回REVISE；是否直接输出候选由下游发布节点决定，不要虚报审核通过。');
  prompt = replaceOnce(prompt,
    '- REVISE：当前候选仍有可明确描述的错误；一次列出全部失败题和集合级问题。第二轮仍为REVISE时，由下游安全停止并发布0题。',
    '- REVISE：当前候选仍有可明确描述的错误；一次列出全部失败题和集合级问题。医学审核结论与下游是否直接输出候选分开记录。');
  return prompt + '\n\n' + reviewRules;
});

// Verify exact, narrowly scoped changes before emitting the import artifact.
const next = JSON.parse(nextRaw.replace(/^\uFEFF/, ''));
assert.equal(next.nodes.length, workflow.nodes.length);
assert.deepEqual(next.edges, workflow.edges);
assert.equal(nextRaw.charCodeAt(0), originalRaw.charCodeAt(0));
const restored = structuredClone(next);
for (const change of changes) {
  const node = restored.nodes.find(n => n.nodeId === change.node_id);
  const old = workflow.nodes.find(n => n.nodeId === change.node_id);
  node.inputs.find(i => i.key === 'systemPrompt').value = old.inputs.find(i => i.key === 'systemPrompt').value;
}
assert.deepEqual(restored, workflow, 'Unexpected change outside four system prompts');
fs.writeFileSync(outputPath, nextRaw, 'utf8');
console.log(JSON.stringify({ output: outputPath, nodes: next.nodes.length, edges: next.edges.length, changes }, null, 2));
