# OncoRounds v1.1 审计与离线迁移参考

## 安全边界

- `migrate_fastgpt_v11.py` 的 JSON 输出始终为离线审计参考，`DO_NOT_IMPORT=true`；禁止导入 FastGPT。
- 线上工作流是唯一权威。实际改造必须先在线复制当前工作流，再按报告逐节点修改。
- 脚本不会覆盖 Downloads 源文件，也不会连接或发布任何线上工作流。
- A/B 数据只允许使用去标识化 `case_id`；CSV 固定表头不含姓名、电话、邮箱、IP、住院号或自由文本病例资料。

## 发布 JSON 审计

```powershell
python scripts\review\audit_release_v11.py <最终PASS发布物.json>
```

审计器要求 `schema_version=1.1`、固定五题、`difficulty=进阶`、`options` 四项数组、`answer` 为 0–3、十字段证据对象、至少两道硬证据题和两道病例临床推理题。脚本通过仍不代替独立医学审核。

## 离线迁移差异参考

```powershell
python scripts\review\migrate_fastgpt_v11.py `
  --generator-prompt-file outputs\题目生成提示词-循证临床决策版.txt `
  --validator-prompt-file outputs\题目校验提示词-循证临床决策版.txt
```

退出码 `3` 是预期的 fail-closed 结果：产物只用于核对预期节点差异，不能导入。节点名、类型、变量、输出和既有连线任一不匹配时返回 `2`，且不写转换后的 JSON。

## A/B 记录与汇总

生成 20 个去标识化病例、两种流程、每种三次的 120 行模板：

```powershell
python scripts\review\make_ab_template.py outputs\快速稳定五题-v1.1\AB测试记录模板-20病例x2流程x3次.csv
```

填写规则：

- 每个错误计数字段针对该次运行的最终候选/发布物；
- `STOP_INSUFFICIENT` 行的 `question_count`、证据配额及所有错误计数填 `0`，且不进入最终 PASS 发布配额分母；
- `population_mismatch_count` 记录病种/病理/人群错配；
- `treatment_stage_or_purpose_mismatch_count` 单独记录治疗阶段、线次或根治/姑息目的错配；
- `reviewed_question_count`、可直接使用数量和进阶认同数量仅填两名肿瘤医生盲评后的去标识化汇总，不填问卷原始联系方式或 IP。

汇总：

```powershell
python scripts\review\summarize_ab_runs.py <已填写CSV> --output <汇总.json>
```

## 回归测试

```powershell
python -m unittest discover -s scripts\review\tests -v
node scripts\review\tests\test_final_pass_extractor_v11.mjs
node scripts\review\tests\test_workflow_code_nodes_v11.mjs
```
