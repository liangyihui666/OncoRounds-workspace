const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const pasted='C:/Users/admin/.codex/attachments/2119d01a-d048-4b43-86ed-f2c947759e91/已粘贴的文本.txt';
const root='C:/Users/admin/Desktop/新增病例候选-第3批10例-2026-09-15';
const data=JSON.parse(fs.readFileSync(pasted,'utf8').trim().replace(/^~~~json\s*/,'').replace(/\s*~~~$/,''));
const mapping=[['161147','紫杉醇相关胶原性结肠炎'],['161906','硅胶假体相关淋巴结肿大'],['163169','肺腺癌与结直肠癌双原发'],['163170','乳腺癌继发冷凝集素综合征'],['163179','乳腺癌术后7年直肠转移'],['137657','奥沙利铂治疗期间腹水'],['139414','年轻直肠癌严重并发症'],['154724','乳腺小叶癌胃与直肠同步转移'],['155586','乳腺黏液癌胃转移'],['155595','BRCA1相关多原发癌']];
assert.equal(data.output_data.length,10);
assert.deepEqual(JSON.parse(data.output_json),data.output_data);
assert.deepEqual(JSON.parse(data.batch_report_json),data.batch_report);
const files=fs.readdirSync(root);
const rows=data.output_data.map((r,i)=>{
 const filename=files.find(n=>n.startsWith(mapping[i][0])&&n.endsWith('.html'));assert(filename);
 const html=fs.readFileSync(path.join(root,filename),'utf8');
 const text=html.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
 const questions=r.Questions.questions;
 return {output_index:i+1,source_id:mapping[i][0],source_file:path.join(root,filename),topic:mapping[i][1],case_id:r.Questions.case_id,
   matching_basis:'manual comparison of case identity and distinctive clinical course; not an upload-order manifest',
   title:r.detail.home.display_title,question_count:questions.length,generation_status:r.Questions.generation_status,
   answer_sequence:questions.map(q=>q.answer).join(''),missing_information:r.Questions.missing_information,
   internal_reference_mentions:questions.filter(q=>/\b(?:GA|GB|CS|IR)\d+\b/.test([q.question,q.explain,q.keyPoint].join(' '))).map(q=>q.id),
   timeline_fallbacks:r.detail.overview.tabs.find(t=>t.id==='timeline').timeline_items.filter(t=>t.date==='时间未详').length,
   source_character_count:text.length};
});
const report={scope:'batch identity, completion, selected source-fact and evidence-use issues; not full medical validation',
  source:pasted,files_accounted_for:10,complete_case_count:rows.filter(r=>r.question_count===5).length,total_questions:rows.reduce((s,r)=>s+r.question_count,0),
  actual_upload_order_verified:false,online_child_revision_verified:false,retrieved_full_snippets_available:false,
  batch_report:data.batch_report,rows};
const out='outputs/十例批量结果核对-20260928';fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'逐例核对.json'),JSON.stringify(report,null,2));
const table=rows.map(r=>`| ${r.output_index} | ${r.source_id} | ${r.topic} | ${r.question_count} |`).join('\n');
const md=`# 本次10例批量结果核对

实际返回10项，按病例特征可一一对应用户提供的10份HTML。9例返回各5题，共45题；1例0题。没有发现整例缺失或同一病例重复占用多个结果项。该结论是病例身份核对，不等于确认所有细节无串用或医学合格。

## 结果对应

| 返回序号 | 文件编号 | 病例主题 | 题数 |
|---|---|---|---:|
${table}

本次返回顺序与聊天消息的文件列举顺序不同。返回中没有原始文件名或上传清单，不能据此认定并行排序错误；上表按病例内容核对。后续重试应按文件编号139414定位，不按聊天文件列表第7个定位。

## 第7项为何0题

文件139414：Q2、Q4的解析未符合A/B/C/D四行格式，且缺少keyPoint。上游程序拒收整组，所以公开结果为0题。不是文件未传，也不是本次结果证明医学证据不足。批量层将所有0题统一记为incomplete，掩盖了具体失败层；本例的missing_information实际保存的是格式错误。

这份返回只含Questions/detail与批量报告，没有第二轮原文、工作流版本号或完整检索记录，无法判断是换行转义、字段遗漏还是模型其他输出变体。不能从现有材料自动补写缺失解析或keyPoint。

## 已确认的内容问题

1. **154724，第8项Q5：虚构治疗结果。** 原文只说正在接受吉西他滨+卡铂，计划3周期后复评；题干却写“化疗后部分缓解”，且没有标为延伸假设。应删除该事实，或在证据适用时明确改成假设题。
2. **155586，第9项Q3：时间间隔写错。** 原文手术为2023-02-23，呕血及胃转移为2024-01-18，约11个月；题干写“术后2年”。病例页日期本身正确，错误出现在题目。
3. **161147，第1项Q1：治疗转换原因被改写。** 原文为紫杉醇相关结肠炎后停药，再采用奥拉帕利；题干增写“紫杉醇化疗后进展”。原文没有提供该次化疗进展结论。Q1解析还直接引用GB01、GB04、CS01多个内部编号，却只绑定一条主引用；学员看不到这些记录，也无法据此验证唯一答案。研究获益不能直接等同获批适应证。
4. **155595，第10项Q4：将分别适用/先后用药扩大为联合强化。** 原文写完成卡培他滨及放疗后继续奥拉帕利；题目却写两者联合，并在D解析称“不应省略其一”。两个研究各自支持一种方案，不能直接证明联合方案。本项需要整体重写，不能只去掉“联合”二字保留必用两药的结论。ESMO泛亚洲早期乳腺癌指南6j.1明确不应在gBRCA1/2m患者中联合奥拉帕利与卡培他滨：[指南原文](https://pmc.ncbi.nlm.nih.gov/articles/PMC11145753/)。该外部核对用于发现问题，没有被当成本轮返回的知识库证据。
5. **155595，第10项Q5：胚系身份未确认却直接给子女50%风险。** 题干自己注明原文未明确胚系/体细胞，答案却直接采用确定的遗传风险；至少缺少确认变异来源这一前提。

## 其他流程问题

- 第1项5题答案全部B：答案分布要求仍未可靠落实。其他题组多数已有多个位置，不能以此证明全部质量问题已解决。
- 第4项虽有5题，但missing_information明确列出冷凝集素综合征诊断、处理与输血管理证据缺口，实际五题主要绕到一般乳腺癌管理。题量完成不等于覆盖该病例最有价值的教学点。
- ${rows.reduce((s,r)=>s+r.timeline_fallbacks,0)}个病程节点被显示为“时间未详”，其中包含“化疗第16天”“45岁（手术）”“2022年6月起”等已有时点。原文字段仍在detail中；这是病程轴解析/展示降级，不是原始文件没有时间。
- 知识库返回全文及在线子应用版本未随本次公共输出传回，无法验证这批是否全部使用最新内容修订版，也无法对45题逐题作完整循证判断。不能把complete_count=9称作9例医学审核通过。

## 建议修复次序

先取得139414这一次运行的“整理最终输出”节点完整输出，利用diagnostics.second_round_raw定位格式失败，避免盲目重跑10例。随后处理题目对原文事实的改写及联合用药推断，再修病程轴时点解析。批量调度本次已实际返回10项，主问题已转到单病例生成与内容检查。
`;
fs.writeFileSync(path.join(out,'核对说明.md'),md);
console.log(JSON.stringify({files:10,complete:report.complete_case_count,total_questions:report.total_questions,failed_source:'139414',report:path.resolve(out,'核对说明.md')}));
