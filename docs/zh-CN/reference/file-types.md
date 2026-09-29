# 文件类型与语言支持

AI Translate 对**代码**、**配置**、**Markdown/纯文本文档**与 **Git 消息**的处理方式不同。本参考列出扩展为悬停/选区提取的内容，以及支持整文档翻译的类型。

## 整文档翻译

| Language ID | 扩展名（典型） | 分段器 |
|-------------|----------------|--------|
| `markdown` | `.md`、`.markdown` | `MarkdownSegmenter`（结构 + frontmatter） |
| `plaintext` | `.txt` | `PlainTextSegmenter`（段落） |

命令与菜单在 `resourceLangId == markdown || plaintext` 或扩展正则 `\.(md|markdown|txt)$` 时启用。

虚拟预览 URI 使用 scheme `aitranslate:`——不能作为源再次翻译。

## Tree-sitter 悬停语言

`src/parsing/languages/specs.ts` 中的 `LANGUAGE_SPECS` 定义打包在 `dist/wasm/` 下的语法：

| VS Code `languageId` | WASM 语法 | 注释 | 字符串 / 模板 |
|----------------------|-----------|------|----------------|
| `typescript` | tree-sitter-typescript | 是 | strings、template_string |
| `typescriptreact` | tree-sitter-tsx | 是 | strings、templates |
| `javascript` | tree-sitter-javascript | 是 | strings、templates |
| `javascriptreact` | tree-sitter-javascript | 是 | strings、templates |
| `python` | tree-sitter-python | 是 | strings、concatenated_string |
| `rust` | tree-sitter-rust | 行/块 | string_literal、raw_string_literal |
| `go` | tree-sitter-go | 是 | interpreted/raw string literals |
| `java` | tree-sitter-java | 是 | string_literal、text_block |
| `c` | tree-sitter-c | 是 | string_literal |
| `cpp`、`cuda-cpp` | tree-sitter-cpp | 是 | string_literal、raw_string_literal |
| `yaml` | tree-sitter-yaml | 是 | scalars + mapping pairs |
| `toml` | tree-sitter-toml | 是 | strings + pairs |
| `json` | tree-sitter-json | 否 | strings + pairs |
| `jsonc` | tree-sitter-json | 否 | strings + pairs |
| `json5` | tree-sitter-json | 否 | strings + pairs |

若 `getSpec(languageId)` 返回 undefined，该 id 可能无法运行 tree-sitter 字符串/注释悬停（其他提取器仍可能生效）。

### 解析器限制

- `aiTranslate.parser.maxFileSizeKB`（默认 1024）——大于此大小的文件跳过 tree-sitter 悬停提取。
- 每种语法 WASM 加载一次；文档关闭时 `ParserService` 释放。

### JSX / TSX

决策 D9：**JSX 文本节点默认不翻译**（TSX/JSX 语法中仅翻译注释与字符串）。

## 配置文件悬停

`configLanguages.ts` 在严格 `languageId` 之外扩展检测：

**Language ID：** `yaml`、`toml`、`json`、`jsonc`、`json5`、`ini`、`properties`、`xml`、`editorconfig`。

**扩展名回退：** `.json`、`.jsonc`、`.json5`、`.yaml`、`.yml`、`.toml`、`.ini`、`.cfg`、`.conf`、`.properties`、`.props`、`.xml`、`.editorconfig`、`.env.example`。

当 `aiTranslate.hover.configKeys` 为 true 时，按 specs 中的格式特定 pair 节点类型（YAML mapping、TOML pair、JSON pair）运行结构化键值提取。

## 其他悬停来源

由 `aiTranslate.hover.*` 开关控制：

| 开关 | 来源 |
|------|------|
| `comments` | 通过 tree-sitter 的行/块/文档注释 |
| `strings` | 字符串字面量与模板 |
| `documents` | 光标处的 Markdown/纯文本分段 |
| `configKeys` | 上述配置文件 |
| `diagnostics` |  linter/编译器消息 |
| `symbolDocs` | 符号文档 |
| `gitCommitMessage` | Git 关联行 |
| `selection` | 选区专用悬停提供方 |

每次悬停最大长度：`aiTranslate.hover.maxChars`（默认 4000）。

## 隐私排除

默认 `aiTranslate.privacy.exclude` glob 包含 `.env`、密钥、`node_modules`、`.git`、`secrets/**` 等。匹配文件在 `PrivacyGuard.check()` 中阻止翻译命令与悬停。

允许的 URI scheme：`aiTranslate.privacy.allowedSchemes`（默认 `file`、`untitled`、`vscode-remote`、`vscode-notebook-cell`）。

## 区域文件生成

**AI Translate: Generate Locale File** 对活动编辑器 URI 操作（常为 JSON/JSONC 区域包）。使用翻译服务生成本地化字符串文件——可与术语表配合统一产品术语。

## 虚拟与不受信任工作区

- **虚拟工作区：** 文档翻译受限；按能力标志保留悬停/选区。
- **不受信任工作区：** 术语表路径与自定义 `detection.skipPatterns` 受限；其他功能可能带警告运行。

## 按工作流选择文件类型

| 工作流 | 建议文件设置 |
|--------|----------------|
| 代码审查注释 | 以支持的语言 id 打开源码 |
| README 翻译 | `markdown` + 翻译文档 |
| 纯文本发布说明 | `plaintext` 或改为 `.md` 以利用结构 |
| 配置审查 | 以 yaml/json 打开并启用 configKeys 悬停 |
| 密钥 | 保持在排除路径——切勿翻译 |

## 语言 ID 与文件关联

VS Code 按语言模式或扩展名关联 `languageId`；若 `.rs` 文件被误识别为 `plaintext`，tree-sitter 悬停不会启用。通过状态栏语言模式或 `files.associations` 纠正。`cuda-cpp` 与 `cpp` 共享 grammar 规格，但 IDE 必须报告正确 id。JSON 系列语法不提取「注释」节点（grammar 无注释），但字符串与键值对仍可悬停当 `configKeys` 启用。

## Generate Locale File 补充

该命令面向 i18n JSON/JSONC 资源文件：对选中或整个文件键值调用翻译服务，输出新 locale 文件。与 Markdown 文档流水线不同，不走 `MarkdownSegmenter`。建议对 UI 字符串维护术语表，避免同一英文 key 在不同语言文件中出现不一致译法。生成前确认目标 `targetLanguage` 与文件名后缀（如 `package.nls.zh-cn.json`）符合团队约定。

## 相关文档

- [翻译 Markdown](../how-to/translate-markdown.md)
- [架构](../explanation/architecture.md)
- [文档分段](../explanation/segmentation.md)
