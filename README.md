# AI Translate（cursor-ai-translate）

在 Cursor / VS Code 中使用 OpenAI 兼容 LLM 翻译代码注释、字符串字面量，以及 Markdown / 纯文本文档。API Key 仅存于编辑器 SecretStorage，不会写入设置文件。

克隆本仓库后，项目根目录即为扩展源码（无需再进入子目录）。

## 功能

- **悬停翻译**：代码、配置与文档（见下）；**诊断/符号文档**以独立块并列显示（`aiTranslate.hover.diagnostics` / `symbolDocs`，无法改写内置 Hover）
- **配置文件悬停**：代码文件中针对注释与字符串（tree-sitter + 正则回退）；**配置文件**在 YAML / TOML / **JSON / JSONC / JSON5** / INI / `.cfg` / `.conf` / `.properties` / **XML**（注释、属性值、元素文本、字段名）及其它 `key=value` / `key: value` 文件上行为一致：可悬停翻译注释、字符串值与键名（`aiTranslate.hover.configKeys`）。JSON 键名在 tree-sitter 标为字符串时会自动提升为键名翻译。`.env` 仍由隐私排除规则屏蔽。Markdown / 纯文本段落悬停与「翻译文档」分段一致。共享延迟、检测、缓存与隐私守卫
- **诊断日志**：设置 `aiTranslate.log.level` 为 `debug` 可查看悬停流水线（守卫、提取、检测、缓存）
- **选区翻译**：`Ctrl+Alt+Shift+T`；悬停选区译文（可关）；灯泡 Code Action；弹窗 `Ctrl+Alt+Shift+P`
- **终端/剪贴板**：`Ctrl+Alt+Shift+Y` 翻译终端选区或剪贴板（读后恢复剪贴板）
- **Git**：翻译当前行提交说明、翻译 SCM 输入框（可替换为英文提交信息）
- **语言包**：`generateLocaleFile` 对 JSON/YAML/properties 增量生成 `*.zh-CN.json` 等
- **Notebook / 模板**：Markdown 单元格段落悬停；HTML/Vue/JSX 的 UI 属性与文本节点
- **命名助手**：根据中文描述建议 camelCase / snake_case / PascalCase 标识符
- **文档双语预览**：虚拟文档 `aitranslate:`，默认**交错**（每个块：完整原文 → 一空行 → 完整译文；列表/表格/引用整块翻译）；已是目标语言的段落会跳过（与悬停相同检测）；`aiTranslate.document.forceTranslate` 可强制全文请求模型；Markdown **frontmatter** 白名单字段（默认 `description` 等）在预览中以 YAML 注释显示译文；`aiTranslate.markdown.frontmatterFields` 可定制或 `[]` 关闭；顶部 CodeLens / `Ctrl+Alt+Shift+D` / 状态栏 `译` 菜单；配置文件不支持整篇翻译
- **生成译文文件**：如 `README.zh-CN.md`，覆盖前确认
- **状态栏**：开关与目标语言 QuickPick
- **缓存**：内存 LRU + 磁盘分片 JSONL
- **术语表**：`.translate-glossary.json`
- **隐私**：工作区禁用、排除 glob、首次确认、密钥检测

## 从 .vsix 安装（Cursor）

1. 构建或获取 `cursor-ai-translate-0.1.0.vsix`
2. Cursor → 扩展 → `...` → **Install from VSIX**
3. 重载窗口

## 配置 API Key

命令面板执行 **AI Translate: 设置 API Key**（`aiTranslate.setApiKey`）。Key 与 `aiTranslate.llm.baseUrl` 的 origin 绑定。

在设置中搜索 **AI Translate**，左侧可按分组浏览（支持 **zh-CN / zh-TW / en / ja / ko / fr / de / es / ru / pt-BR** 等 `package.nls.*`）；状态栏 **译** → **打开设置** 进入原生设置页，**设置面板** 打开 Webview 常用项编辑器（命令 `aiTranslate.openSettingsPanel`）。面板界面语言跟随 `aiTranslate.targetLanguage`；其余运行时文案使用 `l10n/bundle.l10n.*` + `vscode.l10n`（随 Cursor 界面语言）。扩展清单翻译源文件在仓库 `i18n/` 目录，合并后生成根目录 `package.nls*.json` 与 `l10n/`。

### 配置分组（`aiTranslate.*`）

| 分组 | 主要键 |
| --- | --- |
| **常规** | `enabled`, `targetLanguage`, `detection.*`, `selection.output`, `privacy.exclude`, `statusBar.enabled` |
| **模型与 API** | `llm.baseUrl`, `llm.model`, `llm.stream`, `llm.extraBody`, `llm.systemPrompt`, `llm.timeoutMs`, `llm.maxConcurrency`, `glossary.path`, `glossary.maxTerms` |
| **悬停翻译** | `hover.enabled`, `hover.extraDelayMs`, `hover.comments`, `hover.strings`, `hover.documents`, `hover.configKeys`, `hover.diagnostics`, `hover.symbolDocs`, `hover.gitCommitMessage`, `hover.selection` |
| **全文翻译与预览** | `document.previewStyle`, `document.codeLens`, `document.forceTranslate`, `document.batchSize`, `document.maxBatchChars`, `document.sideFileNamePattern`, `document.sideFileContent` |
| **Markdown 与文档** | `markdown.frontmatterFields` |
| **缓存** | `cache.enabled`, `cache.memoryEntries`, `cache.maxDiskMB` |
| **高级与调试** | `privacy.blockSecrets`, `privacy.allowedSchemes`, `parser.maxFileSizeKB`, `log.level` |

常用项（用户级）：

- `aiTranslate.llm.baseUrl`（默认 `https://api.openai.com/v1`）
- `aiTranslate.llm.model`
- `aiTranslate.targetLanguage`（默认 `zh-CN`）
- `aiTranslate.llm.extraBody`（如 DeepSeek `{"thinking":{"type":"disabled"}}`）
- `aiTranslate.hover.documents`（默认 `true`）
- `aiTranslate.markdown.frontmatterFields`（默认翻译 `description` 等 frontmatter 字段）

配置贡献源文件：`contributes/configuration.json`（构建时合并进 `package.json`）。

## 命令

| 命令 | 说明 |
| --- | --- |
| `aiTranslate.toggle` | 切换启用 |
| `aiTranslate.selectTargetLanguage` | 选择目标语言 |
| `aiTranslate.translateSelection` | 翻译选区 |
| `aiTranslate.translateDocument` | 文档双语预览 |
| `aiTranslate.generateSideFile` | 生成译文文件 |
| `aiTranslate.clearCache` | 清除缓存 |
| `aiTranslate.disableForWorkspace` | 工作区禁用 |

## 开发

```bash
npm install
npm run build
npm test
npm run smoke:tree-sitter
npx @vscode/vsce package --no-dependencies
```

设计文档见 [docs/DESIGN.md](docs/DESIGN.md)，工程决策见 [docs/DECISIONS.md](docs/DECISIONS.md)。

## 已知限制

- 正则回退语言可能误判注释与字符串
- 短拉丁文本在拉丁目标语言下可能保守跳过（可用选区翻译）
- Hover 尺寸由编辑器决定，扩展无法调整
- `@vscode/test-electron` 集成测试需图形环境，本仓库含测试骨架，CI/无头环境可能跳过
- 文档表格双语渲染为简化实现，复杂 GFM 表格建议人工校对

## TODO

- 更完整的各语言 tree-sitter 夹具与合并注释边界测试
- 文档翻译失败段批量重试 UI
- `aiTranslate.document.autoRefresh` 防抖刷新
- Open VSX 发布流程（见设计文档 Release 里程碑）
