# 翻译 YAML frontmatter 字段

## 目标

翻译 Markdown YAML frontmatter 中人类可读的值（title、description、summary 等），同时保留分隔符、键名与不可译结构。

## 前提

- 带可选 `---` / `+++` / `;;;` 风格 frontmatter 块的 Markdown（由 `detectFrontmatterBlock` 检测）。
- `aiTranslate.markdown.frontmatterFields` 列出候选翻译键。
- 已启动或计划文档翻译流程（[翻译 Markdown](./translate-markdown.md)）。

## 默认字段

来自 `package.json`：

```json
{
  "aiTranslate.markdown.frontmatterFields": [
    "description",
    "title",
    "summary",
    "subtitle",
    "excerpt",
    "about"
  ]
}
```

按内容系统（Hugo、Docusaurus、Astro 等）增删字段名（与解析 YAML 键**大小写敏感**匹配）。

## 步骤 1：组织 frontmatter 结构

示例：

```yaml
---
title: Getting started
description: How to install the extension and connect an API.
---
```

仅**已配置字段**成为 kind 为 `frontmatter`、带可译值范围的分段。其他键与标点为 `preserved` 分段。

## 步骤 2：分段行为

`frontmatterSegments.ts` 中的 `buildFrontmatterSegments`：

- 定位文件顶部 frontmatter 块。
- 对块内每个已配置且存在的字段，发出 kind `frontmatter` 的分段，值范围在适用时排除引号。
- 对分隔符、键名、冒号与未列出字段发出 preserved 分段。

Frontmatter 批量使用缓存 kind `documentFrontmatterBatch`（与正文 `documentBatch` 的提示词版本不同）。

## 步骤 3：通过文档预览翻译

1. 打开 Markdown 文件。
2. 运行 **AI Translate: Translate Document**。
3. 预览中 frontmatter 值被翻译，`---` 行与键名保持完整。

检测仍适用：若字段值已多为目标语言（例如目标 `zh-CN` 且中文标题），除非启用[强制翻译](./force-translate.md)，计划可能**跳过**该分段。

## 步骤 4：按技术栈调整字段列表

带自定义键的博客：

```json
{
  "aiTranslate.markdown.frontmatterFields": [
    "title",
    "seoDescription",
    "heroTitle",
    "heroSubtitle"
  ]
}
```

技术 id（`slug`、`layout`、`date`）应**不要**列入，以免发送到 LLM。

## 步骤 5：验证输出

- 磁盘源文件在从预览复制或生成旁路文件前不变。
- 预览以双语或交错方式显示 frontmatter 译文。
- 带 bypass 的**刷新预览**可拾取术语表或提示词变更。

## 与术语表的交互

工作区术语表术语应用于 `translateBatch` 中拼接用于术语匹配的批量文本。长 frontmatter 值受益于 `.translate-glossary.json` 中一致的术语条目。

## 陷阱

| 陷阱 | 缓解 |
|------|------|
| 字段未翻译 | 键不在 `frontmatterFields` 或值被检测跳过。 |
| YAML 损坏 | 多行折叠标量与复杂嵌套 YAML 可能无法解析为简单键值；frontmatter 保持扁平效果最好。 |
| 引号被翻译 | 分段器针对值范围；若引号在值范围内，模型可能改动——源文件使用直引号。 |
| TOML frontmatter | 部分站点用 `+++`；检测器支持备用围栏；字段列表仍适用于解析键。 |
| 缓存陈旧 | 仅预览工作流中编辑 frontmatter 后更改目标语言或清空缓存。 |

## 文档站点工作区设置示例

若静态站点生成器仅在 frontmatter 存 SEO 文本，可显式列出所有散文键：

```json
{
  "aiTranslate.targetLanguage": "en",
  "aiTranslate.markdown.frontmatterFields": [
    "title",
    "description",
    "og_title",
    "og_description",
    "twitter_description"
  ],
  "aiTranslate.document.forceTranslate": false,
  "aiTranslate.llm.baseUrl": "https://api.openai.com/v1",
  "aiTranslate.llm.model": "gpt-4o-mini"
}
```

若需将译后 frontmatter 提交到兄弟文件而非从虚拟预览复制，预览后运行 **Generate Side File**。

## 多语言站点工作流

常见模式是源 `readme.md` 保持英文，通过 **Generate Side File** 生成 `readme.zh-CN.md`，而 frontmatter 中的 `title`/`description` 随 side file 一并本地化，供静态站点按语言切换元数据。若站点生成器从单文件读取多语言 frontmatter（嵌套 `i18n` 对象），本扩展默认扁平键列表可能不适用——请将可译字符串展平为顶层键或仅用正文翻译 pipeline。对 Hugo `slug` 等 URL 键保持不在 `frontmatterFields` 中，可避免破坏链接结构。

## 与检测、force 的组合

中文 frontmatter 在目标 `zh-CN` 时常被检测跳过；需要英译中元数据而正文已是中文时，可仅对单次预览启用 `forceTranslate`，或临时将目标改为 `en` 再译回。更改 `frontmatterFields` 后无需清空缓存即可对新键 miss，但对未改动的已缓存值仍命中旧译文——修改字段值或 bypass 刷新预览以拾取变更。

## 引号、多行值与特殊字符

YAML 双引号字符串的值范围由分段器计算；模型偶尔改变弯引号或转义符。建议在 frontmatter 使用简单标量与直引号。多行 `|` 块在复杂嵌套时可能无法拆成独立可译段；将 SEO 描述保持单行可降低风险。TOML `+++` 围栏与 YAML `---` 在检测器中等价处理，字段列表对解析出的键名同样适用。

## Astro / Starlight 等栈

部分框架将 `title` 放在 frontmatter 而将导航标签放在组件 props；仅 frontmatter 键会进入 `documentFrontmatterBatch`。若站点从 MDX 导出默认布局字符串，请使用选区翻译或扩展未来的 locale 生成命令，而非假设文档流水线覆盖 MDX 表达式。

## Docusaurus 与 i18n 路径

Docusaurus 常在 `docs/` 下按语言分目录而非单文件 side pattern；本扩展生成兄弟文件时，您可能需要将 `sideFileNamePattern` 改为 `${fileDirname}/../i18n/${lang}/${fileBasename}` 等自定义变量组合（以 VS Code 变量支持为准），或生成后手工移动。`frontmatterFields` 应包含 `sidebar_label` 等导航字段若它们出现在 YAML 中。

## 校验清单

预览中 frontmatter 分隔线仍为三个连字符；`title` 键名未被翻译；日期与数字字段未出现在 `frontmatterFields`；刷新 bypass 后 SEO 描述更新与 glossary 一致。将 `og_image` 等 URL 键排除在 `frontmatterFields` 外，可防止模型改写链接；仅人类可读句子字段列入列表是安全默认值。发布前在静态站点本地构建一次，确认 frontmatter 仍被生成器正确解析。

## 小结

Frontmatter 翻译是文档流水线的子集：配置字段名、走 **Translate Document**、必要时 force 或 bypass 刷新。技术键与 URL 永不列入 `frontmatterFields`，是避免破坏站点构建的最简单规则。

## 相关文档

- [翻译 Markdown](./translate-markdown.md)
- [文档分段 — frontmatter](../explanation/segmentation.md)
- [语言检测](../explanation/detection.md)
