# OncoRounds 系列小工具模板

版本：2026-09-01  
基线：OncoRounds 最新完整源码（2026-08-24）

## 这个包怎么用

### 只想查看页面

打开：

`01-直接打开Demo/index.html`

该目录是完整离线 H5，HTML、CSS、JavaScript、LOGO 和三个病例图片都已放在一起。请不要只单独复制 `index.html`。

### 想继续开发新的系列小工具

使用：

`02-完整源码/`

在该目录运行：

```bash
pnpm install --frozen-lockfile
pnpm test -- --run
pnpm build
```

构建结果位于 `02-完整源码/dist/`。

## 主要修改位置

- 病例首页、摘要、病程轴：`02-完整源码/src/data/cases.ts`
- 已发布题目原始 JSON：`02-完整源码/src/data/published/`
- 发布题目到页面字段的转换：`02-完整源码/src/data/publishedQuestions.ts`
- 首页：`02-完整源码/src/components/HomeScreen.tsx`
- 病例详情：`02-完整源码/src/components/CaseOverview.tsx`
- 答题页：`02-完整源码/src/components/RoundSession.tsx`
- 总结页：`02-完整源码/src/components/RoundSummary.tsx`
- 全局样式：`02-完整源码/src/styles.css`
- 病例图片：`02-完整源码/public/assets/cases/`
- LOGO：`02-完整源码/public/assets/brand/oncorounds-orb.png`
- 现有增强层：`02-完整源码/public/assets/lung-treatment-response.css` 与 `lung-treatment-response.js`

## JSON 模板

`03-内容JSON模板/` 包含：

1. 每个癌种的首页、病例摘要、病程轴三个 JSON；
2. 每个癌种的合并病例 JSON；
3. 三套包含 ABCD 选项与答案的题目 JSON；
4. 三个病例的完整 TimePoint JSON；
5. 答题进度和题目时间点胶囊 JSON。

## 发布边界

- 医生端只读取已经审核并发布的题目，不在点击“开始查房”时实时调用 FastGPT。
- 题目必须通过发布审核后才能放入 `src/data/published/`。
- 失败、证据不足或修订耗尽的输出不能覆盖现有发布题目。
- 不要把 FastGPT API Key 写进前端源码、JSON、日志或 Git 仓库。
- 本模板不包含 API Key、`.env.local` 或 `node_modules`。

## 交给另一个对话时可直接发送这段话

> 请以压缩包中的 `02-完整源码` 为唯一代码基线，以 `01-直接打开Demo` 为视觉和交互参考。先检查现有项目结构、数据流和字段，再逐步修改，不要从头重构。保留现有移动端布局、病例轮播、病例摘要、病程轴、5题答题流程、答案解析、查房总结和已发布题目门禁。新增内容优先参照 `03-内容JSON模板` 的字段结构。每次只完成一个明确步骤，修改后运行最小范围测试和生产构建。不得在前端加入或输出任何 FastGPT API Key。

## 当前验证结果

- 前端测试：5 个测试文件、24 项测试全部通过。
- TypeScript 与 Vite 生产构建通过。
- 离线 Demo 使用相对资源路径，可与 `assets` 文件夹一起直接打开。

