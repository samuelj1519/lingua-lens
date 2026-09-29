# Changelog

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
