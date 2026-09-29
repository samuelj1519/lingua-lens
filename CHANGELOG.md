# Changelog

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
