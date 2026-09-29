# 工程决策记录

| 编号 | 设计文档「需确认」项 | 决策 |
| --- | --- | --- |
| D1 | 发布者 ID | `cursor-ai-translate` |
| D2 | `engines.vscode` 最低版本 | `^1.85.0`（与 `@types/vscode` 一致；在激活日志中记录运行时 `vscode.version`） |
| D3 | 语言识别库 | 选用 `tinyld`，仅在拉丁/西里尔长文本且书写系统无法唯一判定时调用 |
| D4 | 语法 wasm 来源 | 使用 npm 包 `tree-sitter-wasms` + `web-tree-sitter` 运行时，构建时复制到 `dist/wasm/` |
| D5 | 增量 tree-sitter 解析 | MVP 采用 dirty 标记后全量重解析（与设计 Q17 建议一致） |
| D6 | `MarkdownString.isTrusted` 命令白名单 | 使用 VS Code 1.85+ 的白名单 API；不支持的版本可降级为 `isTrusted: true`（待实测旧版 Cursor） |
| D7 | 缓存键是否含 `baseUrl` | 不含（与设计 12.1 及 Q7 默认一致） |
| D8 | `strictChineseVariant` | 不实现；简繁同属 `zh` 语系，目标为简体时繁体不翻译 |
| D9 | JSX 文本节点 | 默认不翻译 |
| D10 | 文档预览 | 虚拟文档 `aitranslate:` + 插入式双语渲染，不用 Webview |
| D11 | 选区长文输出 | 在侧边打开只读临时 Markdown 文档（非持久文件） |
