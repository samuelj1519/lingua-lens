# Changelog

## 0.4.6

- 修复：全文翻译（预览/侧文件）在批量路径**未调用语言检测**，导致已是简体中文的文档仍逐段请求模型并交错重复原文；现与悬停共用 `detection.*` 规则，跳过无需翻译的段落
- 修复：模型返回与原文相同（忽略空白）时不写入缓存、不在预览中插入译文块
- 改进：列表/表格/引用整块先检测；混合列表仅翻译需要翻译的行
- 新增：`aiTranslate.document.forceTranslate`（默认 `false`）强制跳过检测
- 改进：整篇无可译段落时提示「文档已是目标语言，无需翻译」，不打开预览

## 0.4.5

- 改进：设置页 `contributes.configuration` 改为**分组数组**，左侧子目录为：常规、模型与 API、悬停翻译、全文翻译与预览、Markdown 与文档、缓存、高级与调试
- 改进：各配置项 `order` 排序、`markdownDescription` 中英文说明、`enumDescriptions`、数值 min/max、高级项 `tags: ["advanced"]`；相关项以 `#aiTranslate.xxx#` 互相链接
- 改进：状态栏 QuickPick「打开设置」使用 `@ext:cursor-ai-translate.cursor-ai-translate` 过滤；`aiTranslate.openSettings` 命令同步
- 新增：配置源文件 `contributes/configuration.json` + 单元测试校验声明键与代码使用键、中英文 nls 完整性
- 文档：README 增加按分组的配置表

## 0.4.4

- 新增：Markdown / `.mdc` / `SKILL.md` 等文件顶部 **YAML/TOML frontmatter** 自然语言字段翻译（默认白名单 `description`、`title`、`summary`、`subtitle`、`excerpt`、`about`）
- 新增：`aiTranslate.markdown.frontmatterFields`（`string[]`，设为 `[]` 关闭）；支持引号标量与 `|`/`>` 块标量；`name`/id/URL/路径等保持原样
- 改进：全文预览在 frontmatter 字段下以 **YAML 注释** 插入译文（`append` 模式在 frontmatter 块后追加译文段）；悬停可翻译 frontmatter 字段值
- 改进：文档批量缓存区分 `documentFrontmatterBatch`；刷新全文/悬停对 frontmatter 同样生效

## 0.4.3

- 新增：所有悬停/选区弹层增加 **刷新**（绕过缓存、写回缓存、`editor.action.showHover` 重开）；全文预览 CodeLens/命令 **刷新全文翻译**
- 修复：悬停/选区弹出层仅显示标题与操作链接、**译文为空**（多因空译文写入缓存；流式仅读 `delta.content` 等）
- 修复：永不缓存空/纯空白译文；命中空缓存视为未命中并删除条目；空译文显示重试提示
- 修复：`peekCache` 与 `doTranslate` 使用相同的 `kind` 生成缓存键（选区可正确命中）
- 改进：缓存键包含 `llm.baseUrl` 与 `extraBody` 哈希；磁盘目录升级为 `cache/v2`
- 改进：SSE 流式组装支持 `delta.text`；非流式空 `content` 直接报错

## 0.4.2

- 修复：Markdown **列表/表格/引用**作为整块翻译与交错预览（原文整块 + 一空行 + 译文整块），不再逐条交错
- 修复：预览与侧文件 **空白保真**（紧凑列表不插入额外空行、EOF 不追加空行）
- 新增：容器译文 **结构校验**（条目数、表格行列、链接 URL、行内代码）；列表失败时回退逐行翻译
- 测试：紧凑/嵌套列表、链接列表、表格、引用与回退组装的精确文本断言

## 0.4.1

- 新增：行尾 Git blame 区域悬停翻译提交说明（`aiTranslate.hover.gitCommitMessage`）
- 新增：`aiTranslate.llm.extraBody`（合并进请求体，文档含 DeepSeek/Qwen 关闭思考示例）与 `aiTranslate.llm.stream`（交互请求可选 SSE）
- 修复：**整篇文档翻译**按块顺序交错输出，不再用偏移插入导致英文残片与 Markdown 损坏；强化分段（列表/引用/粗斜体）与批量提示
- 新增：Markdown 顶部 CodeLens、状态栏 `译` 打开 QuickPick、右键菜单与 `Ctrl+Alt+Shift+D` 全文翻译
- 新增：选区悬停翻译、Code Action、弹窗快捷键；配置文件禁止整篇翻译
- 改进：翻译文档命令图标改为 `$(globe)`；移除命令贡献里无效的 `icon` 字段

## 0.4.0

- 新增：Jupyter **Markdown 单元格**段落悬停（`vscode-notebook-cell` + `hover.documents`）
- 新增：HTML/Vue/JSX 等模板 **UI 属性与文本节点**悬停（placeholder、title、alt、aria-* 等）
- 新增：`aiTranslate.suggestVariableNames` — 根据中文描述生成 camelCase/snake_case/PascalCase 标识符

## 0.3.0

- 新增：`aiTranslate.translateGitCommitAtLine`（`git log -L` / blame summary）
- 新增：`aiTranslate.translateScmInput`（内置 Git 扩展 inputBox，可替换为译文）
- 新增：`aiTranslate.generateLocaleFile` — JSON/YAML/properties 增量语言包（保留占位符）

## 0.2.0

- 新增：悬停翻译**诊断信息**（`aiTranslate.hover.diagnostics`）：在波浪线位置追加独立「AI 翻译 · 诊断信息」块
- 新增：悬停翻译**符号文档**（`aiTranslate.hover.symbolDocs`）：读取其他 Hover 提供器文档并翻译，防递归、遵守延迟
- 新增：`aiTranslate.translateClipboardOrSelection`（终端选区/剪贴板，可恢复剪贴板）
- 新增：`aiTranslate.translateReplaceSelection` / `aiTranslate.translateInsertBelow`（目标语言 QuickPick，中文默认译英）
- 说明：扩展无法修改内置 Hover，所有译文以独立 Markdown 块并列展示

## 0.1.1

- 修复：悬停提供器使用无效的 `{ language: '*' }` 选择器导致 Cursor/VS Code 从不调用 `provideHover`
- 修复：tree-sitter 失败时 TypeScript/JavaScript 现可回退到正则提取；解析错误会记录日志并回退
- 新增：`aiTranslate.log.level` 配置；悬停流水线 debug 日志
- 修复：命令面板标题重复「AI Translate:」前缀
- 改进：Markdown/纯文本编辑器标题栏「翻译文档」「刷新翻译」使用 SVG/codicon 图标（Cursor 标题栏更易见）
- 新增：文档段落悬停翻译（`aiTranslate.hover.documents`，默认开启）；与文档预览相同分段，跳过代码块/front matter/HTML；表格悬停单位为**单元格**
- 测试：文档悬停单元测试与集成测试（英文段落有译文、中文段落与代码块无悬停）
- 新增：配置文件悬停（YAML/TOML/JSON/JSONC/JSON5、INI、cfg/conf、properties、XML 及通用 key=value/key: value）：注释、字符串值、字段名（`aiTranslate.hover.configKeys`）；新增 tree-sitter yaml/toml/json 语法 WASM
- 改进：JSON 属性名与 YAML/TOML 对齐（键名拆词翻译）；XML 支持注释、属性、元素文本；统一 config 正则回退
- 测试：YAML/TOML/JSON/XML 配置悬停单元与集成测试

## 0.1.0

- 初始版本：悬停翻译、选区翻译、文档双语预览、术语表、缓存与隐私控制
