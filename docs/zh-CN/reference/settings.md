# 设置参考

> 本文档由 `scripts/generate-settings-reference.mjs` 根据 `contributes/configuration.json` 与 `package.nls.*` 自动生成。请勿手改；修改配置或文案后重新运行 `npm run generate-docs`。

所有键均在 VS Code 设置中显示为 `linguaLens.<key>`。下表按设置 UI 的七个分组排列。

## 常规

### `enabled`

- **Type:** boolean
- **Default:** `true`
- **Scope:** `resource`
- **Description:** 在当前工作区或文件夹启用/禁用 LinguaLens。关闭后悬停与选区翻译停止；已有缓存保留。

### `targetLanguage`

- **Type:** enum: `zh-CN`, `zh-TW`, `en`, `ja`, `ko`, `fr`, `de`, `es`, `ru`
- **Default:** `"zh-CN"`
- **Scope:** `resource`
- **Enum values:**
  - `zh-CN` — 简体中文
  - `zh-TW` — 繁体中文
  - `en` — 英语
  - `ja` — 日语
  - `ko` — 韩语
  - `fr` — 法语
  - `de` — 德语
  - `es` — 西班牙语
  - `ru` — 俄语
- **Description:** 译文目标语言。已符合目标语言的文本会被跳过（繁简豁免见 `linguaLens.*` cross-link）。

### `detection.strictChineseVariant`

- **Type:** boolean
- **Default:** `false`
- **Scope:** `resource`
- **Description:** 目标为 `zh-CN` 或 `zh-TW` 时，**不翻译**已是另一种中文变体的文本（例如目标简体时跳过繁体）。

### `detection.minLength`

- **Type:** number (min 1, max 64, advanced)
- **Default:** `3`
- **Scope:** `resource`
- **Description:** 参与翻译的最小字符数；更短的片段会跳过（可用选区翻译强制翻译）。

### `detection.targetRatio`

- **Type:** number (min 0, max 1, advanced)
- **Default:** `0.6`
- **Scope:** `resource`
- **Description:** 若已有足够比例的字符像目标语言，则跳过该片段（减少多余 API 调用）。

### `detection.reliableMinLength`

- **Type:** number (min 1, max 500, advanced)
- **Default:** `20`
- **Scope:** `resource`
- **Description:** 低于此长度时语言检测不可靠，扩展可能保守跳过。

### `detection.skipPatterns`

- **Type:** array of string (advanced)
- **Default:** `[]`
- **Scope:** `resource`
- **Description:** 正则表达式列表；匹配的片段永不发给模型。与 `linguaLens.*` cross-link 一并生效。

### `selection.output`

- **Type:** enum: `auto`, `notification`, `document`
- **Default:** `"auto"`
- **Scope:** `resource`
- **Enum values:**
  - `auto` — 短文本通知，长文本打开文档
  - `notification` — 始终通知
  - `document` — 始终打开新文档
- **Description:** 选区翻译结果的展示方式。`notification` 最快；较长时 `document` 会打开临时文档。

### `privacy.exclude`

- **Type:** array of string
- **Default:** `["**/.env","**/.env.*","**/*.pem","**/*.key","**/*.p12","**/id_rsa*","**/secrets/**","**/.git/**","**/node_modules/**"]`
- **Scope:** `resource`
- **Description:** 永不读取/翻译的文件 glob（如密钥）。与 `linguaLens.*` cross-link 配合使用。

### `statusBar.enabled`

- **Type:** boolean
- **Default:** `true`
- **Scope:** `application`
- **Description:** 显示状态栏 **译** 入口，点击打开 LinguaLens 快捷菜单。

## 模型与 API

### `llm.baseUrl`

- **Type:** string
- **Default:** `"https://api.openai.com/v1"`
- **Scope:** `application`
- **Description:** OpenAI 兼容 API 根地址（需含 `/v1`）。API Key 通过命令 **设置 API Key** 按 origin 保存，不会写入设置文件。

### `llm.model`

- **Type:** string
- **Default:** `""`
- **Scope:** `application`
- **Description:** 请求中的模型 id（如 `gpt-4o-mini`、`deepseek-chat`）。翻译前必须配置。

### `llm.stream`

- **Type:** boolean
- **Default:** `false`
- **Scope:** `application`
- **Description:** 悬停/选区等交互请求使用 SSE 流式（可降低首字延迟）。全文批量仍为非流式。另见 `linguaLens.*` cross-link。

### `llm.extraBody`

- **Type:** object
- **Default:** `{}`
- **Scope:** `application`
- **Description:** 合并进 chat/completions 请求体的额外 JSON。示例：DeepSeek / Doubao `{"thinking":{"type":"disabled"}}`；Qwen `{"enable_thinking":false}`。

### `llm.systemPrompt`

- **Type:** string
- **Default:** `""`
- **Scope:** `application`
- **Description:** 追加到每次翻译系统提示的自定义说明。术语通过 `linguaLens.*` cross-link 单独注入。

### `glossary.path`

- **Type:** string
- **Default:** `".translate-glossary.json"`
- **Scope:** `resource`
- **Description:** 工作区内术语表路径（`.translate-glossary.json`）。每次请求最多匹配 `linguaLens.*` cross-link 条。

### `glossary.maxTerms`

- **Type:** number (min 0, max 500)
- **Default:** `50`
- **Scope:** `resource`
- **Description:** 单次翻译在术语表中最多采用的条目数。

### `llm.temperature`

- **Type:** number (min 0, max 2, advanced)
- **Default:** `0.2`
- **Scope:** `application`
- **Description:** 聊天 API 采样温度（越低译文越稳定）。

### `llm.timeoutMs`

- **Type:** number (min 1000, max 300000)
- **Default:** `30000`
- **Scope:** `application`
- **Description:** 单次 API 请求的 HTTP 超时（毫秒）。

### `llm.maxConcurrency`

- **Type:** number (min 1, max 16)
- **Default:** `4`
- **Scope:** `application`
- **Description:** 悬停、选区、全文批量共享的最大并发请求数。

### `llm.maxTokens`

- **Type:** number (min 64, max 128000)
- **Default:** `4096`
- **Scope:** `application`
- **Description:** 单次请求 completion token 上限（全文批量可能用满）。

### `llm.maxRetries`

- **Type:** number (min 0, max 10, advanced)
- **Default:** `3`
- **Scope:** `application`
- **Description:** 网络或 5xx 等可恢复错误时的重试次数。

### `llm.extraHeaders`

- **Type:** object (advanced)
- **Default:** `{}`
- **Scope:** `application`
- **Description:** 附加到每个 API 请求的 HTTP 头（如自定义网关鉴权）。

### `llm.jsonMode`

- **Type:** enum: `auto`, `on`, `off` (advanced)
- **Default:** `"auto"`
- **Scope:** `application`
- **Enum values:**
  - `auto` — 全文批量在支持时用 JSON
  - `on` — 始终请求 JSON
  - `off` — 从不请求 JSON
- **Description:** 是否强制 JSON 响应（依赖服务商 `response_format`）。`auto` 对全文批量在支持时启用 JSON。

## 悬停翻译

### `hover.enabled`

- **Type:** boolean
- **Default:** `true`
- **Scope:** `resource`
- **Description:** 编辑器悬停翻译总开关。关闭后 `linguaLens.*` cross-link 等子项无效。

### `hover.extraDelayMs`

- **Type:** number (min 0, max 5000)
- **Default:** `700`
- **Scope:** `resource`
- **Description:** 悬停后延迟再请求 API（减少指针移动时的调用）。

### `hover.comments`

- **Type:** boolean
- **Default:** `true`
- **Scope:** `resource`
- **Description:** 翻译代码中的行注释、块注释与文档注释（tree-sitter + 正则回退）。

### `hover.strings`

- **Type:** boolean
- **Default:** `true`
- **Scope:** `resource`
- **Description:** 翻译字符串字面量与模板字符串。

### `hover.documents`

- **Type:** boolean
- **Default:** `true`
- **Scope:** `resource`
- **Description:** 翻译 Markdown/纯文本段落（与全文预览分段一致）。预览样式见 `linguaLens.*` cross-link。

### `hover.configKeys`

- **Type:** boolean
- **Default:** `true`
- **Scope:** `resource`
- **Description:** 在 YAML/TOML/JSON 等配置文件中翻译键名与字符串值。

### `hover.diagnostics`

- **Type:** boolean
- **Default:** `true`
- **Scope:** `resource`
- **Description:** 悬停诊断波浪线时追加译文说明。

### `hover.symbolDocs`

- **Type:** boolean
- **Default:** `true`
- **Scope:** `resource`
- **Description:** 翻译其他悬停提供器返回的符号文档。

### `hover.gitCommitMessage`

- **Type:** boolean
- **Default:** `true`
- **Scope:** `resource`
- **Description:** 翻译行尾 Git 内联 blame 的提交说明。

### `hover.selection`

- **Type:** boolean
- **Default:** `true`
- **Scope:** `resource`
- **Description:** 在选中文本上悬停时显示译文。

### `hover.maxChars`

- **Type:** number (min 100, max 50000)
- **Default:** `4000`
- **Scope:** `resource`
- **Description:** 单次悬停请求的最大源字符数，超出会截断。

### `hover.showOriginal`

- **Type:** boolean (advanced)
- **Default:** `false`
- **Scope:** `resource`
- **Description:** 在悬停中于译文上方显示原文（便于对比或调试）。

## 全文翻译与预览

### `document.previewStyle`

- **Type:** enum: `interleaved`, `append`
- **Default:** `"interleaved"`
- **Scope:** `resource`
- **Enum values:**
  - `interleaved` — 原文整块 → 空行 → 译文整块（列表/表格整块翻译）
  - `append` — 旧版：在每块末尾追加译文
- **Description:** `lingualens:` 双语预览排版：**交错**（推荐）或在每块末尾**追加**译文。

### `document.codeLens`

- **Type:** boolean
- **Default:** `true`
- **Scope:** `resource`
- **Description:** 在 Markdown/纯文本顶部显示「翻译全文」CodeLens。

### `document.forceTranslate`

- **Type:** boolean
- **Default:** `false`
- **Scope:** `resource`
- **Description:** 开启后全文翻译不再做语言检测，所有段落都会请求模型（可能导致已是目标语言的文档出现重复内容）。默认与悬停相同，遵循 `linguaLens.*` cross-link。

### `document.batchSize`

- **Type:** number (min 1, max 50)
- **Default:** `8`
- **Scope:** `resource`
- **Description:** 全文翻译时每批提交的段落数量。

### `document.maxBatchChars`

- **Type:** number (min 500, max 50000)
- **Default:** `4000`
- **Scope:** `resource`
- **Description:** 每批全文翻译的最大源字符总数（与 `linguaLens.*` cross-link 共同限制分批）。

### `document.sideFileNamePattern`

- **Type:** string
- **Default:** `"${fileBasenameNoExtension}.${lang}${fileExtname}"`
- **Scope:** `resource`
- **Description:** **生成译文文件**的文件名模式；`${lang}` 替换为目标语言代码。

### `document.sideFileContent`

- **Type:** enum: `translated`, `bilingual`
- **Default:** `"translated"`
- **Scope:** `resource`
- **Enum values:**
  - `translated` — 仅译文
  - `bilingual` — 双语交错（同预览）
- **Description:** 侧文件仅译文，或与预览相同的双语交错。

### `document.autoRefresh`

- **Type:** boolean (advanced)
- **Default:** `false`
- **Scope:** `resource`
- **Description:** 源文档变更时自动刷新预览（实验性，可能增加 API 用量）。

## Markdown 与文档

### `markdown.frontmatterFields`

- **Type:** array of string
- **Default:** `["description","title","summary","subtitle","excerpt","about"]`
- **Scope:** `resource`
- **Description:** 在全文预览与悬停中翻译 YAML/TOML frontmatter 中这些字段的**自然语言**值。设为 `[]` 关闭。`name`、URL 等始终保留不译。

## 缓存

### `cache.enabled`

- **Type:** boolean
- **Default:** `true`
- **Scope:** `application`
- **Description:** 启用内存 + 磁盘翻译缓存。关闭后除「刷新」绕过外每次均请求 API。

### `cache.memoryEntries`

- **Type:** number (min 0, max 50000, advanced)
- **Default:** `2000`
- **Scope:** `application`
- **Description:** 内存 LRU 缓存条目数上限。

### `cache.maxDiskMB`

- **Type:** number (min 0, max 2048, advanced)
- **Default:** `50`
- **Scope:** `application`
- **Description:** 全局存储下磁盘缓存约略上限（`cache/v2`）。

## 高级与调试

### `privacy.blockSecrets`

- **Type:** boolean
- **Default:** `true`
- **Scope:** `application`
- **Description:** 内容疑似 API Key、令牌或私钥时跳过翻译。

### `privacy.allowedSchemes`

- **Type:** array of string (advanced)
- **Default:** `["file","untitled","vscode-remote","vscode-notebook-cell"]`
- **Scope:** `application`
- **Description:** 允许翻译的文档 URI scheme（含 notebook 等虚拟 scheme 时能力受限）。

### `parser.maxFileSizeKB`

- **Type:** number (min 16, max 65536, advanced)
- **Default:** `1024`
- **Scope:** `application`
- **Description:** 超过此大小的文件不做 tree-sitter 悬停解析。

### `log.level`

- **Type:** enum: `trace`, `debug`, `info`, `warn`, `error`, `off` (advanced)
- **Default:** `"info"`
- **Scope:** `application`
- **Enum values:**
  - `trace` — 最详细
  - `debug` — 含悬停流水线细节
  - `info` — 默认
  - `warn` — 仅警告
  - `error` — 仅错误
  - `off` — 不记录扩展日志
- **Description:** **LinguaLens: 显示日志** 中的扩展日志级别。排查悬停流水线请用 `debug` 或 `trace`。

---

_Total settings: 52_
