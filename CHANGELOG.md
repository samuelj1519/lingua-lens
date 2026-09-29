# Changelog

## 0.1.1

- 修复：悬停提供器使用无效的 `{ language: '*' }` 选择器导致 Cursor/VS Code 从不调用 `provideHover`
- 修复：tree-sitter 失败时 TypeScript/JavaScript 现可回退到正则提取；解析错误会记录日志并回退
- 新增：`aiTranslate.log.level` 配置；悬停流水线 debug 日志
- 修复：命令面板标题重复「AI Translate:」前缀

## 0.1.0

- 初始版本：悬停翻译、选区翻译、文档双语预览、术语表、缓存与隐私控制
