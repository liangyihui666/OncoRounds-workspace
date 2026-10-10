# OncoRounds 工作资料

本仓库保存大查房工作文件夹的迁移快照（2026-10-10），包括 FastGPT 工作流、提示词、脚本、病例整理结果、交付文档及前端源码。历史版本按原目录保留。

## 换电脑继续工作

1. 安装 Git，并登录有权限访问本私有仓库的 GitHub 账号。
2. 克隆：

~~~powershell
git clone https://github.com/liangyihui666/OncoRounds-workspace.git
cd OncoRounds-workspace
~~~

3. 先阅读 [大查房完整交接](大查房5.0_完整交接.md) 与 [交接记录](交接记录-20260918-OncoRounds.md)。
4. 修改前执行 git pull；修改完成后 git add -A、git commit -m "说明本次修改"、git push。GitHub 不会自动同步本地改动；切换电脑前先提交并推送。

## 当前工作流入口

- 外层：[相对时间与不确定病例出题/01-外层完整工作流.json](outputs/相对时间与不确定病例出题-20261010/01-外层完整工作流.json)
- 五题子应用：[连字符空格核对修复/五题出题子应用-完整工作流.json](outputs/连字符空格核对修复-20261010/五题出题子应用-完整工作流.json)
- 修复与离线验证脚本：work/answer-comparison-20261008/

上述入口对应当前整理版本；导入 FastGPT 后需核对应用引用、知识库、模型及全局变量配置。证据原句匹配通过不等于医学内容审核通过，疑似诊断、分级和假设条件仍需核查。

## 目录

- outputs、output：工作流导出、病例及测试结果。
- deliverables、交付文件：交付包与文档。
- scripts、tools、work：脚本和工作过程。
- review：检查记录。
- github/OncoRounds：原公开前端项目的源码快照，原项目远端为 https://github.com/liangyihui666/OncoRounds 。在本仓库中是普通目录，不是 Git 子模块；原项目提交历史仍在原仓库。

## 迁移范围及环境

此快照包含整理后的 3381 个原文件。依赖、缓存、临时目录、构建产物、嵌套 Git 元数据和本地凭据文件未纳入；已有 ZIP 交付包保留。前端按对应 package.json 和锁文件安装依赖后启动。脚本可能需要 Node.js、Python，部分 Office 脚本需要 Windows 和 Office。

文档或脚本里的旧电脑绝对路径需要按新电脑位置调整；文件夹外的桌面病例、Downloads、聊天附件以及 Codex 全局配置不在迁移范围。API 密钥需在新电脑单独配置，不应提交。仓库包含病例与调试资料，请保持私有。
