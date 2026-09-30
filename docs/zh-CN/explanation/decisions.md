# 架构决策记录

本文档面向中文读者，与 `docs/DECISIONS.md` 相互对应并补充说明。状态列反映当前代码库中的实现情况。

| ID | 主题 | 决策 | 状态 |
|----|------|------|------|
| D1 | 发布者 ID | `lingua-lens` | 有效 |
| D2 | 最低 VS Code 版本 | `^1.85.0`（激活时记录日志） | 有效 |
| D3 | 语言识别库 | 仅对足够长的拉丁/西里尔文本使用 `tinyld` | 有效 |
| D4 | 解析器 WASM | `tree-sitter-wasms` + `web-tree-sitter`，复制到 `dist/wasm/` | 有效 |
| D5 | 增量解析 | 脏标记 → 对文件 URI 全量重新解析 | 有效 |
| D6 | 悬停命令信任 | VS Code 1.85+ `MarkdownString` 命令白名单 | 有效 |
| D7 | 缓存键包含 `baseUrl` | 最初**不包含** | **已废止** |
| D8 | `strictChineseVariant` | 未在 `decide()` 中实现；zh-CN/zh-TW 共用 `zh` 语族 | 有效 |
| D9 | JSX 文本节点 | 默认**不翻译** | 有效 |
| D10 | 文档预览 | 虚拟 `lingualens:` URI，而非 Webview | 有效 |
| D11 | 长选区输出 | 在编辑器旁栏打开虚拟 Markdown 文档 | 有效 |

## D7（已废止）：缓存键与端点

**原始记录（DECISIONS.md）：** 缓存键不包含 `baseUrl`，与早期设计文档 Q7 一致。

**当前（≥ 0.4.3）：** `CacheService.key` 与 `TranslationService.cacheKey` 包含：

- `baseUrl`（完整字符串）
- `extraBodyHash`（序列化后的 `llm.extraBody` 的 SHA-256 前缀）

**变更理由：** 切换提供商 URL 或与「思考」相关的请求体字段时，不得返回由不同后端或不同请求形态产生的译文。磁盘缓存位于跨项目的全局存储中；若不包含 `baseUrl`，可能发生错误的模型/语言配对被复用。

**迁移：** `cache/v2` 下的旧条目会自然过期，或用户执行**清空缓存**。无需 schema 迁移——键的哈希域已改变。

## D8：中文变体

配置项暴露 `linguaLens.detection.strictChineseVariant`，供将来区分简体/繁体。`LanguageDetector.decide()` 目前**不会**据此分支。`zh-CN` 与 `zh-TW` 目标均通过语族 `zh` 下的汉字统计判断。需要在变体之间转换的用户，在变体逻辑落地前应使用 `document.forceTranslate` 或显式选区翻译。

## D10：为何预览使用虚拟文档

Webview 适合富 HTML，但不利于 diff、无障碍与编辑器快捷键。`TextDocumentContentProvider` 将预览文本保留在普通编辑器模型（只读虚拟 URI）中，支持标题栏刷新命令，并直接复用 `BilingualRenderer` 的字符串输出。

## D3：为何限定 tinyld 范围

悬停必须感觉即时。脚本统计对 CJK 可靠。在每次鼠标移动时调用 ML 语言识别成本过高；`tinyld` 仅在拉丁/西里尔文本足够长（`reliableMinLength`）且脚本类别模糊时运行。

## D5：解析器增量性

在 WASM 打包场景下，真正的 tree-sitter 增量编辑较复杂。MVP 在 `onDidChangeTextDocument` 时标记缓冲区为脏，下次提取时全量重新解析。对 `parser.maxFileSizeKB` 以内的典型文件大小可接受。

## 流程

新决策应在此表追加一行，并在行为变更时同步更新 `docs/DECISIONS.md`（中文表）。已废止行保留作历史记录，正文中用废止说明交代上下文。

## 开放问题（尚未成为 ADR）

未来 ADR 可能涵盖：无需全量重解析的真正增量 tree-sitter、zh 变体的 OpenCC 后处理、JSX 文本可选翻译、按 URI 划分的缓存命名空间。在依赖这些行为之前，请先在 GitHub 上跟踪相关 issue。

记录已废止决策（如 D7）时，在 `docs/DECISIONS.md` 中保留原始行供中文读者查阅，并在本文档用状态列标明废止，使发布说明与迁移指南一致，避免静默行为变更。贡献者在同一拉取请求中应同时更新两份文件。

## D1–D2：发布者与平台基线

发布者 ID `lingua-lens` 与扩展 marketplace 标识一致，便于设置搜索（`@ext:samuelj1519.lingua-lens`）与密钥存储命名空间区分。最低 VS Code `^1.85.0` 与 D6 悬停命令白名单、部分 API 行为绑定；激活日志记录实际引擎版本，便于支持人员对照用户环境。

## D4、D9、D11 补充说明

WASM 语法文件在构建阶段复制到 `dist/wasm/`，避免运行时从 node_modules 动态解析路径失败。JSX 默认不翻译文本节点，是为避免把 UI 文案当作用户可译字符串批量发送；若未来提供 opt-in，应单独 ADR 并更新[文件类型](../reference/file-types.md)。长选区虚拟 Markdown 文档（D11）与文档预览（D10）共用双语渲染逻辑，但 URI scheme 与命令入口不同，避免用户混淆「预览」与「一次性选区结果」。

## D6：悬停命令信任

VS Code 1.85+ 要求 `MarkdownString` 中的命令链接显式加入信任列表。扩展注册的复制、替换、插入注释、重新翻译等操作均通过 `HoverActionRegistry` 生成受信任 URI，防止恶意仓库通过悬停内容触发任意命令执行。

## D2、D10、D11 与产品体验

最低版本日志帮助支持人员确认用户是否满足 D6 白名单 API。虚拟文档预览（D10）使用户能用熟悉编辑器快捷键滚动、搜索预览；长选区（D11）避免通知气泡截断大段译文。两者均非 Webview，减少 CSP 与无障碍维护成本。若未来引入 Webview 富渲染，应新 ADR 评估与 `BilingualRenderer` 的重复。

## 贡献者检查清单

行为变更时：更新本表与 `docs/DECISIONS.md`、在[缓存](caching.md)/[检测](detection.md) 中交叉链接废止项、在发布说明中提及 D7 类迁移。勿静默更改 `CacheService.key` 字段顺序或分隔符——会导致全量 cache miss。

## 历史阅读说明

英文文档 `docs/en/explanation/decisions.md` 与本文同步维护；`docs/DECISIONS.md` 保留中文表格原文。PR 审查行为变更时，请三者对照。废止项（D7）勿从 `DECISIONS.md` 删除行号，以免破坏外部链接；用状态列与正文「已废止」说明即可。

## D9 与前端代码库

React/Vue 字符串多在引号内由悬停字符串路径翻译；JSX 裸文本节点不翻译是为避免将布局空格与换行当作可译内容。若您的代码库大量使用无引号 JSX 文案，请用选区翻译或维护外部 i18n，而非期待悬停覆盖全部 UI 字符串。决策表 ID 与 issue/PR 引用建议在提交信息中带上（如 `D7 superseded`），方便发布说明与文档交叉检索。D4 WASM 复制路径若变更，须同步更新打包脚本与集成测试，否则悬停语法静默失效。D5 全量重解析在超大文件上可能卡顿，未来 ADR 可引入增量而不删除 D5 历史行。

## 小结

本表是行为变更的权威索引；废止决策保留行并写清迁移（如 D7 与缓存目录）。改检测、缓存键、预览机制前请先更新此处与 `docs/DECISIONS.md`，再写发行说明。英文读者可对照 `docs/en/explanation/decisions.md`；两条目应同 PR 更新以保持迁移叙述一致。开放问题（增量解析、OpenCC、JSX opt-in）在落地前勿写入用户面向承诺。集成测试钩子 `LINGUALENS_INTEGRATION_TEST` 不属于 ADR 表，但影响 CI 默认端点，变更时需通知维护者。D11 长选区虚拟文档与 D10 预览共用渲染器但 URI 不同，扩展新 UI 表面时应参考这两条避免重复造轮子。本页与 `docs/DECISIONS.md` 共同构成架构决策的完整中文视图。贡献者在修改检测、缓存或预览行为时务必同步更新相关行与状态列，并在 PR 描述中引用决策 ID（如 D7、D10），便于追溯行为变更。

## 相关文档

- [缓存](caching.md)
- [语言检测](detection.md)
- [架构](architecture.md)
