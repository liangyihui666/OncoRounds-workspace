"""Package a fresh release and validate an independently extracted copy."""
from pathlib import Path
import hashlib
import json
import re
import shutil
import zipfile

source = Path(__file__).resolve().parents[1]
workspace = source.parents[2]
name = 'OncoRounds-v1.2-癌种筛选与专属查房演示-2026-09-08'
release = source.parents[1] / name
archive = release.parent / (name + '.zip')
unpacked = workspace / 'review/qa-oncorounds-v12-20260908'
if release.exists() or archive.exists() or unpacked.exists():
    raise SystemExit('Release or QA directory already exists; preserve it and choose a new version.')

release.mkdir()
shutil.copytree(source / 'dist', release / '01-离线Demo')
code = release / '02-完整源码'
code.mkdir()
for directory in ['src', 'public', 'scripts']:
    shutil.copytree(source / directory, code / directory)
for filename in ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'index.html', 'vite.index.html',
                 'vite.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json']:
    shutil.copy2(source / filename, code / filename)

readme = """# OncoRounds v1.2 本地交互演示

## 打开
完整解压后，打开 01-离线Demo/index.html。请保留同目录的 assets 文件夹，不要只复制 HTML。
页面已构建为普通内联脚本，资源使用相对路径，不要求 Node.js 或后端服务。
来源原文链接仍需联网；页面本身的病例封面和医学图片均已随包提供。

本次自动浏览器因安全策略不支持 file://，所以实际页面检查使用本机 HTTP 预览。
已完成独立解压、资源完整性与普通脚本检查，但没有声称已在另一台电脑双击验证。

## 功能
- 病例广场 / 专属查房双栏目；五个癌种标签筛选九例、每例五题。
- 肺癌、胃癌、乳腺癌、食管癌各两例，GEJ腺癌一例。
- 同癌种卡片切换，详情摘要与病程轴，答题回顾、上一题、解析、循证来源和总结。
- 专属查房使用真实文件选择，但只读取文件名，不上传、存储或解析文件内容。
- 生成过程及失败状态均为演示。结果使用用户明确选定的已有演示病例。
- 支持继续答题和查看已完成总结；刷新页面清空专属记录及进度。

## 数据边界
本地九例目录独立于正式题库发布路径。原始12份新增病例／题目JSON按字节保留。
用户在本次对话确认题目已审核；缺少知识库定位的题目仅接入本地演示。
正式发布校验、GrandRoundCase、CaseQuestion及原三例医学数据未改动。
没有连接 FastGPT、上传后端、账号、手机号或病例夹同步，也没有部署或提交 GitHub。

## 开发
唯一源码位于 02-完整源码。不要手改离线Demo或dist。
运行 pnpm install --frozen-lockfile、pnpm test -- --run、pnpm build。
build 会先同步入口，再完成 TypeScript/Vite 构建，最后由 postbuild 生成可离线读取的普通脚本。
public/assets 中的增强 CSS/JavaScript 保留；React 答题页自行提供完整双标签回顾，旧增强保留兼容分支。
本机历史 node_modules 曾缺少 .bin 命令入口，已在本机修复；交付包不包含 node_modules。
"""
(release / 'README-先看这里.md').write_text(readme, encoding='utf-8')

report = """# 修改与验收记录

## 修改位置
| 文件／区域 | 具体调整 |
|---|---|
| src/components/HomeScreen.tsx | 首页双栏目、cancer-tabs、当前分类自动滚入可见区域、同类两卡左右切换 |
| src/data/demo/types.ts、adapter.ts、catalog.ts、raw/ | 独立演示类型、六对原始JSON、字母答案转换、五类九例目录；不作为正式发布通道 |
| src/state/demoExperience.ts | 分类、当前病例、生成任务、私有记录、答题快照和失败重试状态 |
| src/App.tsx | 四页与生成任务协调、提醒横幅、完成及错误弹窗 |
| src/components/PrivateRounds.tsx | 文件选择、演示病例选择、独立错误状态控制、待查房／进行中／已完成列表 |
| src/components/Modal.tsx、CaseDetails.tsx | 原生dialog焦点管理、双标签资料、多张内容图片 |
| src/components/CaseOverview.tsx | 恢复摘要与病程轴双标签并提供准确图片alt |
| src/components/RoundSession.tsx | 当前病例资料回顾、显式正确答案、来源链接 |
| src/components/RoundSummary.tsx、src/state/roundFlow.ts | 从当前数据源计分和校验完成，避免新增病例回退为ROS1 |
| src/series.css | 新栏目、癌种标签、专属记录、上传和生成界面样式 |
| src/styles.css | body最小宽度与溢出、app-frame模糊、screen动画填充，修复320px横向滚动和固定底部按钮 |
| public/assets/lung-treatment-response.js | 识别React回顾页并跳过旧DOM注入；保留其他增强 |
| package.json、scripts/build-offline.mjs | 增加构建后离线打包步骤，普通脚本在root之后执行 |
| scripts/prepare-case-images.py | 下载原始JSON的五张医学内容图片；ALK本地封面不作为医学图表 |
| 测试文件 | 更新分类流程验收，新增外部题库保真、状态机、文件替换、退出续答和五题流程测试 |

## 保持不变
- src/data/types.ts、cases.ts、publishedQuestions.ts 与修改前备份字节一致。
- 新增12份原始JSON与outputs来源文件字节一致。
- public/assets/lung-treatment-response.css 及两个源码HTML入口保持不变。
- 原始ZIP、旧01-直接打开Demo及原有图片保留；不修改医学事实、答案或来源。

## 自动验证
- pnpm install --frozen-lockfile：完成；更新检查出现网络提示，不影响依赖就绪。
- pnpm test -- --run：8个文件、51项测试全部通过。
- pnpm build：TypeScript通过，Vite生产构建通过，postbuild离线普通脚本构建通过。
- 现有public增强文件的Vite提示表示按原路径保留；资源已实际随包复制。
- 界面机械检查返回空问题列表。
- 发布包独立解压后校验文件哈希、入口、样式、脚本和图片资源。

## 浏览器检查
通过本机HTTP静态服务加载生产构建，检查手机和桌面画布、癌种筛选、长标题、详情双标签、病例回顾、正确和错误反馈、GEJ五题及40分总结。
实际验证了文件选择、模拟生成、上传失败与重试、专属记录退出续答以及完成后显示“已完成／查看总结”。
最终响应式测量如下。浏览器保留约15px纵向滚动条，比较的是documentElement的clientWidth与scrollWidth：

| 设置视口 | clientWidth | scrollWidth | 手机画布宽度 | 首屏损坏图片 |
|---|---:|---:|---:|---:|
| 320 × 700 | 305 | 305 | 305 | 0 |
| 360 × 780 | 345 | 345 | 345 | 0 |
| 390 × 844 | 375 | 375 | 375 | 0 |
| 430 × 932 | 415 | 415 | 415 | 0 |
| 1440 × 1000 | 1425 | 1425 | 480 | 0 |

五个宽度均无页面横向滚动；430px下验证当前GEJ标签完整滚入可见区。
390px答题页底部操作区下边缘为844.07px，匹配844px视口高度。
浏览器未记录应用控制台错误；读取的error/warn列表为空。
真实拍照、另一台电脑file://打开未实测。

## 限制
自动浏览器禁止直接访问file://，本轮没有完成另一台电脑双击打开的实测。
真实拍照权限及手机系统图库面板取决于设备，桌面浏览器不能替代真机验证。
演示不构成真实病例处理或线上发布；新增六例不会因为演示可用而自动通过原正式题库门禁。
"""
(release / '修改与验收记录.md').write_text(report, encoding='utf-8')

with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
    for path in sorted(release.rglob('*')):
        if path.is_file():
            z.write(path, Path(name) / path.relative_to(release))
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    z.extractall(unpacked)

copy = unpacked / name
for path in release.rglob('*'):
    if path.is_file():
        assert hashlib.sha256(path.read_bytes()).digest() == hashlib.sha256((copy / path.relative_to(release)).read_bytes()).digest()
demo = copy / '01-离线Demo'
html = (demo / 'index.html').read_text(encoding='utf-8')
assert 'type="module"' not in html
assert html.index('id="root"') < html.index('<script>', html.index('id="root"'))
for resource in re.findall(r'(?:src|href)="(\./assets/[^"]+)"', html):
    assert (demo / resource.split('?')[0]).is_file(), resource
assert len(list((demo / 'assets/case-content').glob('*.png'))) == 5
assert len(list((code / 'src/data/demo/raw').glob('*.json'))) == 12
print(json.dumps({'release': str(release), 'archive': str(archive), 'bytes': archive.stat().st_size,
                  'independent_extract': str(copy), 'sha256': hashlib.sha256(archive.read_bytes()).hexdigest()}, ensure_ascii=False))
