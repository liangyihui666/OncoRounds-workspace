# OncoRounds 快速稳定五题 v1.1：FastGPT 节点工件

## 2026-09-01 最新直接导入授权

用户随后明确改为由其本人直接导入 JSON。以下文件是本目录唯一允许导入的完整工作流：

`OncoRounds-快速稳定五题-v1.1-可直接导入.json`

该文件从用户提供的当前 36 节点、43 连线导出文件确定性生成，构建后为 41 节点、54 连线；导入版审计为 `PASS`，`DO_NOT_IMPORT=false`。应作为新的测试应用导入，不能覆盖现有生产工作流；导入成功仍须逐节点 Debug 和完成 A/B 后才能切换生产入口。

文件 `肿瘤大查房小工具-v1.1-离线审计参考-DO_NOT_IMPORT.json` 仍永久禁止导入。下文单节点工件继续用于核对导入结果和故障修复。所有后续人工变量修改仍应使用 FastGPT 变量选择器。

## 推荐主链

    adverse_events
    → irAE双锚点确定性拆分
    → 需要时最多一次轻量回退
    → 五路初检并行
    → 证据注册与压缩（补检输入先留空）
    → 临床研究补检条件判定
    → 需要时最多一次临床研究补检
    → 证据注册与压缩（最终池，接入可选补检结果）
    → 题目生成
    → 纯机械结构硬检
    → PASS：仅把实际引用证据送独立医学校验
    → REVISE：一次批量修订全部失败题
    → 最终独立校验 PASS 才发布

两个“证据注册与压缩”代码节点可粘贴同一份脚本；第一次用于低成本判断补检，第二次生成最终模型输入。代码执行是确定性的，不增加大模型调用。若现有图可在分支汇合后只执行一次最终压缩，可省略第一次压缩，但补检判定必须接收等价的已去重容量数据。

知识库搜索 limit 调为 1500，只用于提取研究简称、注册号和补检线索。由于 FastGPT 不允许完整工作流保留未连线节点，用户明确选择删除独立“出题计划与证据门禁”，而不是把这次额外的大模型调用接回默认主链；其本地提示词仅作为严格审计或故障定位资料保留。

## 1. irAE 双锚点确定性拆分

代码：[irAE双锚点确定性拆分.js](./irAE双锚点确定性拆分.js)

### 输入变量

| 变量 | FastGPT 类型 | 必填 | 来源 |
|---|---|---:|---|
| adverse_events | String / Any | 是 | 脱敏病例全局变量 |
| fallback_anchor_a | String | 否 | 轻量回退JSON的 anchor_a；首次运行留空 |
| fallback_anchor_b | String | 否 | 轻量回退JSON的 anchor_b；首次运行留空 |

### 输出变量

| 变量 | 类型 | 用途 |
|---|---|---|
| anchor_a | String | 第一优先事件，格式“G级别｜事件”；无则空串 |
| anchor_b | String | 第二优先事件；无第二事件时空串，不检索缺失标记 |
| query_a | String | 第一条正式 irAE 指南检索词；实际检索必须接此字段 |
| query_b | String | 第二条正式 irAE 指南检索词；实际检索必须接此字段 |
| has_a / has_b | Boolean | 控制两路 irAE 检索 |
| anchor_a_detail / anchor_b_detail | Object / Null | 事件、分级和原文定位 |
| needs_fallback | Boolean | 仅事件或分级无法确定性识别时为 true |
| unresolved_segments | Array of Object | 缺失字段及原文；只用于内部审计 |
| fallback_max_calls | Number | 恒为1 |
| fallback_input | String | 仅在需要回退时提供脱敏 adverse_events |
| fallback_system_prompt | String | 极短回退合同 |
| fallback_output_schema | String | 回退 JSON 结构 |

当 needs_fallback=true 时，允许调用一次轻量模型：标准/低思考、温度0、回复格式 json_object，用户输入只放 fallback_input。系统提示词也可直接使用 [irAE锚点轻量回退-systemPrompt.txt](./irAE锚点轻量回退-systemPrompt.txt)。回退结果必须严格为：

    {"anchor_a":"G级别｜事件原文","anchor_b":"","has_a":true,"has_b":false}

回退解析失败时保留确定性结果并让缺失锚点为空，不重试、不猜测；第二项为空是合法状态。回退成功后，把回退JSON的 anchor_a/anchor_b 接入同一脚本的 fallback_anchor_a/fallback_anchor_b，再执行一个确定性代码节点生成 query_a/query_b；回退模型不得自行扩写检索词。

query_a/query_b 固定拼接“治疗类别、事件、原文分级、诊断检查、分级管理、暂停或永久停用、监测、专科会诊、再挑战条件、正式指南”。事件为肺炎/间质性肺病时一律追加“感染鉴别与并行管理”；其他事件只有该锚点自己的 source_text 含感染/病原信息时才追加，禁止被另一事件的感染描述污染。两路 irAE 向量检索分别接 query_a 和 query_b，不直接接短锚点 anchor_a/anchor_b。

## 2. 证据注册与压缩

代码：[证据注册与压缩.js](./证据注册与压缩.js)

### 输入变量

| 变量 | 类型 | 必填 | 保留上限 |
|---|---|---:|---:|
| guideline_a | Array / Object / JSON String | 是 | 6 |
| guideline_b | Array / Object / JSON String | 是 | 6 |
| clinical_study_initial | Array / Object / JSON String | 是 | 5 |
| clinical_study_supplement | Array / Object / JSON String | 否，未运行时传空数组 | 3 |
| irae_a | Array / Object / JSON String | 否 | 4 |
| irae_b | Array / Object / JSON String | 否 | 4 |

### 输出变量

| 变量 | 类型 | 用途 |
|---|---|---|
| evidence_pool | Object | 规范化、跨路去重后的完整压缩池 |
| evidence_pool_json | String | 送题目生成器的模型输入 |
| needs_clinical_supplement | Boolean | 当前尚无补检结果且达到触发条件 |
| supplement_reason | String | 触发原因 |
| evidence_pool_insufficient_for_five | Boolean | 机械最低容量或硬证据候选不足 |
| estimated_question_capacity | Number | 按同一 locator 最多2题估计，最大5 |
| hard_candidate_count | Number | 正式指南候选加临床路可识别研究候选 |
| compression_report | Object | 输入、保留、丢弃及去重审计 |

脚本按 doc_id + split_index 全局去重；纯数字字符串 splitIndex 归一为非负整数。每条只保留不超过1000字的去HTML、去乱码、去重复 snippet，正文类字段会从嵌套 source_metadata 递归剔除，来源元数据与十字段定位仍保留。原始检索结果继续留在各检索节点运行日志中，不送大模型。

## 3. 临床研究补检条件判定

代码：[临床研究补检条件判定.js](./临床研究补检条件判定.js)

### 输入变量

| 变量 | 类型 | 必填 | 来源 |
|---|---|---:|---|
| clinical_study_initial | Array / Object / JSON String | 是 | 临床研究初检 |
| evidence_pool | Object / JSON String | 是 | 初次证据注册与压缩 |
| estimated_question_capacity | Number | 建议 | 压缩节点同名输出 |
| hard_candidate_count | Number | 建议 | 压缩节点同名输出 |

### 输出变量

| 变量 | 类型 | 用途 |
|---|---|---|
| needs_clinical_supplement | Boolean | 唯一补检分支条件 |
| supplement_decision | String | TRIGGER 或 SKIP |
| supplement_reason | String | 初检无可识别研究和/或固定五题机械容量不足 |
| identifiable_initial_study_count | Number | 可识别初检研究数 |
| estimated_question_capacity | Number | 判定采用的容量 |
| hard_candidate_count | Number | 判定采用的硬证据候选数 |
| supplement_max_calls | Number | 恒为1 |

仅当“初检无可识别研究”或“压缩证据无法达到固定五题机械最低容量/至少2条硬证据候选”时触发一次补检；否则直接跳过。该代码只判断，不补全研究身份，最终临床研究资格仍由生成器和独立校验器按当前单条记录审核。

## 4. 纯机械结构硬检

代码：[纯机械结构硬检.js](./纯机械结构硬检.js)

### 输入变量

| 变量 | 类型 | 必填 | 来源 |
|---|---|---:|---|
| candidate_json | Object / JSON String | 是 | 题目生成器完整输出 |
| evidence_pool | Object / JSON String | 是 | 最终压缩证据池 |

### 输出变量

| 变量 | 类型 | 用途 |
|---|---|---|
| structure_decision | String | PASS、FAIL 或 INSUFFICIENT |
| structure_errors | Array of String | 一次列全机械硬错误 |
| structure_warnings | Array of String | 超过建议长度等非医学警告 |
| candidate_json_passthrough | String | 原候选JSON；未改医学内容、未重排选项 |
| cited_evidence | Array of Object | 五题 locator 实际命中的去重记录 |
| cited_evidence_json | String | 独立医学校验器只接收这一数组 |
| hard_evidence_count | Number | “指南/临床研究”标签数 |
| clinical_reasoning_count | Number | “病例+临床推理”标签数 |

PASS 才进入独立医学语义校验。FAIL 直接把完整 structure_errors 作为本轮批量修订意见，第二轮仍输出完整五题；达到循环上限仍失败则禁止发布。合法 INSUFFICIENT 送独立校验器判断 STOP_INSUFFICIENT，不能由代码节点自行冒充医学结论。

硬检只验证 schema 1.1、Q1至Q5、四选一、0基索引、answer_text、十字段类型与实际元数据、证据类型配额及 locator 使用次数；它不改答案、不改选项、不重排、不判断医学适用性。

## 模型与循环设置

- 题目生成、独立医学校验：DeepSeek-V4-Pro，标准思考，温度0.1，回复上限16384（界面不接受时16000），json_object。
- 首轮：question_draft 为空字符串，review_feedback 为“首次生成，无上一轮审核意见”。
- 最多两轮；REVISE 时一次列全并批量修订全部失败题，保留通过题。
- 只有独立医学校验 decision=PASS、score 大于等于75且机械硬检通过时才能发布。
- 生成/校验/发布节点只产出 schema_version="1.1"；schema 1.0 兼容仅留在学员端读取层。

## 本地自测

在本目录执行以下三个只读 fixture：

    node 自测-证据节点.js
    node 自测-irAE拆分.js
    node 自测-机械硬检.js

三者均应输出 status=PASS。它们分别覆盖证据清洗/去重/上限/补检判定、双 irAE 锚点与确定性查询、以及 schema 1.1 五题结构/定位/不改写候选JSON。
