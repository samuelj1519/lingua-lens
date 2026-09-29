# Settings reference

> 由 `scripts/generate-settings-reference.mjs` 自动生成，请勿手改。

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `aiTranslate.enabled` | boolean | `true` | **常规** — 在当前工作区或文件夹启用/禁用 AI Translate。关闭后悬停与选区翻译停止；已有缓存保留。 |
| `aiTranslate.targetLanguage` | enum (`zh-CN`, `zh-TW`, `en`, `ja`, `ko`, `fr`, `de`, `es`, `ru`) | `"zh-CN"` | **常规** — 译文目标语言。已符合目标语言的文本会被跳过（繁简豁免见 [#aiTranslate.detection.strictChineseVariant#](settings://aiTranslate.detection.strictChineseVariant)）。 |
| `aiTranslate.detection.strictChineseVariant` | boolean | `false` | **常规** — 目标为 `zh-CN` 或 `zh-TW` 时，**不翻译**已是另一种中文变体的文本（例如目标简体时跳过繁体）。 |
| `aiTranslate.detection.minLength` | number | `3` | **常规** — 参与翻译的最小字符数；更短的片段会跳过（可用选区翻译强制翻译）。 |
| `aiTranslate.detection.targetRatio` | number | `0.6` | **常规** — 若已有足够比例的字符像目标语言，则跳过该片段（减少多余 API 调用）。 |
| `aiTranslate.detection.reliableMinLength` | number | `20` | **常规** — 低于此长度时语言检测不可靠，扩展可能保守跳过。 |
| `aiTranslate.detection.skipPatterns` | array | `[]` | **常规** — 正则表达式列表；匹配的片段永不发给模型。与 [#aiTranslate.privacy.exclude#](settings://aiTranslate.privacy.exclude) 一并生效。 |
| `aiTranslate.selection.output` | enum (`auto`, `notification`, `document`) | `"auto"` | **常规** — 选区翻译结果的展示方式。`notification` 最快；较长时 `document` 会打开临时文档。 |
| `aiTranslate.privacy.exclude` | array | `["**/.env","**/.env.*","**/*.pem","**/*.key","**/*.p12","**/id_rsa*","**/secrets/**","**/.git/**","**/node_modules/**"]` | **常规** — 永不读取/翻译的文件 glob（如密钥）。与 [#aiTranslate.privacy.blockSecrets#](settings://aiTranslate.privacy.blockSecrets) 配合使用。 |
| `aiTranslate.statusBar.enabled` | boolean | `true` | **常规** — 显示状态栏 **译** 入口，点击打开 AI Translate 快捷菜单。 |
| `aiTranslate.llm.baseUrl` | string | `"https://api.openai.com/v1"` | **模型与 API** — OpenAI 兼容 API 根地址（需含 `/v1`）。API Key 通过命令 **设置 API Key** 按 origin 保存，不会写入设置文件。 |
| `aiTranslate.llm.model` | string | `""` | **模型与 API** — 请求中的模型 id（如 `gpt-4o-mini`、`deepseek-chat`）。翻译前必须配置。 |
| `aiTranslate.llm.stream` | boolean | `false` | **模型与 API** — 悬停/选区等交互请求使用 SSE 流式（可降低首字延迟）。全文批量仍为非流式。另见 [#aiTranslate.llm.extraBody#](settings://aiTranslate.llm.extraBody)。 |
| `aiTranslate.llm.extraBody` | object | `{}` | **模型与 API** — 合并进 chat/completions 请求体的额外 JSON。示例：DeepSeek / Doubao `{"thinking":{"type":"disabled"}}`；Qwen `{"enable_thinking":false}`。 |
| `aiTranslate.llm.systemPrompt` | string | `""` | **模型与 API** — 追加到每次翻译系统提示的自定义说明。术语通过 [#aiTranslate.glossary.path#](settings://aiTranslate.glossary.path) 单独注入。 |
| `aiTranslate.glossary.path` | string | `".translate-glossary.json"` | **模型与 API** — 工作区内术语表路径（`.translate-glossary.json`）。每次请求最多匹配 [#aiTranslate.glossary.maxTerms#](settings://aiTranslate.glossary.maxTerms) 条。 |
| `aiTranslate.glossary.maxTerms` | number | `50` | **模型与 API** — 单次翻译在术语表中最多采用的条目数。 |
| `aiTranslate.llm.temperature` | number | `0.2` | **模型与 API** — 聊天 API 采样温度（越低译文越稳定）。 |
| `aiTranslate.llm.timeoutMs` | number | `30000` | **模型与 API** — 单次 API 请求的 HTTP 超时（毫秒）。 |
| `aiTranslate.llm.maxConcurrency` | number | `4` | **模型与 API** — 悬停、选区、全文批量共享的最大并发请求数。 |
| `aiTranslate.llm.maxTokens` | number | `4096` | **模型与 API** — 单次请求 completion token 上限（全文批量可能用满）。 |
| `aiTranslate.llm.maxRetries` | number | `3` | **模型与 API** — 网络或 5xx 等可恢复错误时的重试次数。 |
| `aiTranslate.llm.extraHeaders` | object | `{}` | **模型与 API** — 附加到每个 API 请求的 HTTP 头（如自定义网关鉴权）。 |
| `aiTranslate.llm.jsonMode` | enum (`auto`, `on`, `off`) | `"auto"` | **模型与 API** — 是否强制 JSON 响应（依赖服务商 `response_format`）。`auto` 对全文批量在支持时启用 JSON。 |
| `aiTranslate.hover.enabled` | boolean | `true` | **悬停翻译** — 编辑器悬停翻译总开关。关闭后 [#aiTranslate.hover.comments#](settings://aiTranslate.hover.comments) 等子项无效。 |
| `aiTranslate.hover.extraDelayMs` | number | `700` | **悬停翻译** — 悬停后延迟再请求 API（减少指针移动时的调用）。 |
| `aiTranslate.hover.comments` | boolean | `true` | **悬停翻译** — 翻译代码中的行注释、块注释与文档注释（tree-sitter + 正则回退）。 |
| `aiTranslate.hover.strings` | boolean | `true` | **悬停翻译** — 翻译字符串字面量与模板字符串。 |
| `aiTranslate.hover.documents` | boolean | `true` | **悬停翻译** — 翻译 Markdown/纯文本段落（与全文预览分段一致）。预览样式见 [#aiTranslate.document.previewStyle#](settings://aiTranslate.document.previewStyle)。 |
| `aiTranslate.hover.configKeys` | boolean | `true` | **悬停翻译** — 在 YAML/TOML/JSON 等配置文件中翻译键名与字符串值。 |
| `aiTranslate.hover.diagnostics` | boolean | `true` | **悬停翻译** — 悬停诊断波浪线时追加译文说明。 |
| `aiTranslate.hover.symbolDocs` | boolean | `true` | **悬停翻译** — 翻译其他悬停提供器返回的符号文档。 |
| `aiTranslate.hover.gitCommitMessage` | boolean | `true` | **悬停翻译** — 翻译行尾 Git 内联 blame 的提交说明。 |
| `aiTranslate.hover.selection` | boolean | `true` | **悬停翻译** — 在选中文本上悬停时显示译文。 |
| `aiTranslate.hover.maxChars` | number | `4000` | **悬停翻译** — 单次悬停请求的最大源字符数，超出会截断。 |
| `aiTranslate.hover.showOriginal` | boolean | `false` | **悬停翻译** — 在悬停中于译文上方显示原文（便于对比或调试）。 |
| `aiTranslate.document.previewStyle` | enum (`interleaved`, `append`) | `"interleaved"` | **全文翻译与预览** — `aitranslate:` 双语预览排版：**交错**（推荐）或在每块末尾**追加**译文。 |
| `aiTranslate.document.codeLens` | boolean | `true` | **全文翻译与预览** — 在 Markdown/纯文本顶部显示「翻译全文」CodeLens。 |
| `aiTranslate.document.forceTranslate` | boolean | `false` | **全文翻译与预览** — 开启后全文翻译不再做语言检测，所有段落都会请求模型（可能导致已是目标语言的文档出现重复内容）。默认与悬停相同，遵循 [#aiTranslate.detection.targetRatio#](settings://aiTranslate.detection.targetRatio)。 |
| `aiTranslate.document.batchSize` | number | `8` | **全文翻译与预览** — 全文翻译时每批提交的段落数量。 |
| `aiTranslate.document.maxBatchChars` | number | `4000` | **全文翻译与预览** — 每批全文翻译的最大源字符总数（与 [#aiTranslate.document.batchSize#](settings://aiTranslate.document.batchSize) 共同限制分批）。 |
| `aiTranslate.document.sideFileNamePattern` | string | `"${fileBasenameNoExtension}.${lang}${fileExtname}"` | **全文翻译与预览** — **生成译文文件**的文件名模式；`${lang}` 替换为目标语言代码。 |
| `aiTranslate.document.sideFileContent` | enum (`translated`, `bilingual`) | `"translated"` | **全文翻译与预览** — 侧文件仅译文，或与预览相同的双语交错。 |
| `aiTranslate.document.autoRefresh` | boolean | `false` | **全文翻译与预览** — 源文档变更时自动刷新预览（实验性，可能增加 API 用量）。 |
| `aiTranslate.markdown.frontmatterFields` | array | `["description","title","summary","subtitle","excerpt","about"]` | **Markdown 与文档** — 在全文预览与悬停中翻译 YAML/TOML frontmatter 中这些字段的**自然语言**值。设为 `[]` 关闭。`name`、URL 等始终保留不译。 |
| `aiTranslate.cache.enabled` | boolean | `true` | **缓存** — 启用内存 + 磁盘翻译缓存。关闭后除「刷新」绕过外每次均请求 API。 |
| `aiTranslate.cache.memoryEntries` | number | `2000` | **缓存** — 内存 LRU 缓存条目数上限。 |
| `aiTranslate.cache.maxDiskMB` | number | `50` | **缓存** — 全局存储下磁盘缓存约略上限（`cache/v2`）。 |
| `aiTranslate.privacy.blockSecrets` | boolean | `true` | **高级与调试** — 内容疑似 API Key、令牌或私钥时跳过翻译。 |
| `aiTranslate.privacy.allowedSchemes` | array | `["file","untitled","vscode-remote","vscode-notebook-cell"]` | **高级与调试** — 允许翻译的文档 URI scheme（含 notebook 等虚拟 scheme 时能力受限）。 |
| `aiTranslate.parser.maxFileSizeKB` | number | `1024` | **高级与调试** — 超过此大小的文件不做 tree-sitter 悬停解析。 |
| `aiTranslate.log.level` | enum (`trace`, `debug`, `info`, `warn`, `error`, `off`) | `"info"` | **高级与调试** — **AI Translate: 显示日志** 中的扩展日志级别。排查悬停流水线请用 `debug` 或 `trace`。 |
