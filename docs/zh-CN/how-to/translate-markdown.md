# 翻译 Markdown 文档

## 目标

在编辑器中翻译 Markdown 文件：分段感知批量、源文件旁 `aitranslate:` 实时预览，并可选择导出到磁盘旁路文件。

## 前提

- 已配置 LLM 并设置 API 密钥（[配置提供商](./configure-providers.md)）。
- 活动文档 language id 为 `markdown` 或 `plaintext`（纯文本仅段落分段）。
- 文件未被 `aiTranslate.privacy.exclude` 排除。
- 提示时已确认隐私。

## 步骤 1：打开源文档

打开 `*.md`、`*.markdown` 或纯文本文件。本流水线不对代码文件提供整文档翻译（代码请用悬停/选区）。

## 步骤 2：启动预览

任选入口：

1. **LinguaLens: Translate Document**（命令面板或 `Ctrl+Alt+Shift+D` / `Cmd+Alt+Shift+D`）。
2. 编辑器标题栏**地球**图标（尚未在预览中时）。
3. 资源管理器对 `.md` / `.txt` 的上下文菜单。

`DocTranslationService.openPreview`：

- 分段文档（`MarkdownSegmenter` 或 `PlainTextSegmenter`）。
- 为每段构建翻译计划（`buildDocumentTranslationPlan`）。
- 若无分段需翻译且 `forceTranslate` 为 false，显示「已是目标语言」提示并停止。
- 在源文件旁列打开虚拟 URI `aitranslate:/{basename}.{lang}.preview.md?source=…&lang=…`。

## 步骤 3：等待分段进度

翻译在后台运行并显示进度通知（`DocumentSegmentProgressReporter`）。分段经 `TranslationService.translateBatch` 批量，大小为 `aiTranslate.document.batchSize`（默认 8）与字符上限 `maxBatchChars`。

结果经 `BilingualRenderer` 与 `PreviewContentProvider` 渲染，使用 `aiTranslate.document.previewStyle`：

- **`interleaved`** — 在源结构附近插入译文块。
- **`append`** — 在每源块后收集译文。

## 步骤 4：源变更后刷新

- 编辑**源**文件后，在源编辑器运行 **LinguaLens: Refresh Document Translation** 重新分段翻译（会话缺失时可能打开预览）。
- 在**预览**标签标题栏**刷新**（**LinguaLens: Refresh Preview**）重新读取源，可选**绕过缓存**（`invalidateDocumentSegmentCaches` + 新 API 调用）。

启用 `aiTranslate.document.autoRefresh`（高级，默认 false）可在编辑时联动刷新。

## 步骤 5：导出旁路文件（可选）

1. 从源编辑器或资源管理器运行 **LinguaLens: Generate Side File**。
2. 若无会话，扩展会启动并等待翻译完成。
3. 输出路径使用 `aiTranslate.document.sideFileNamePattern`（默认 `${fileBasenameNoExtension}.${lang}${fileExtname}` → `readme.zh-CN.md`）。
4. 内容模式 `aiTranslate.document.sideFileContent`：`translated` 或 `bilingual`。

## 步骤 6：CodeLens（可选）

`aiTranslate.document.codeLens` 为 true 时，文档上方 CodeLens 提供与翻译/刷新命令对齐的快捷操作。

## 设置参考（文档部分）

```json
{
  "aiTranslate.document.previewStyle": "interleaved",
  "aiTranslate.document.batchSize": 8,
  "aiTranslate.document.maxBatchChars": 4000,
  "aiTranslate.document.codeLens": true,
  "aiTranslate.document.forceTranslate": false,
  "aiTranslate.document.sideFileNamePattern": "${fileBasenameNoExtension}.${lang}${fileExtname}",
  "aiTranslate.document.sideFileContent": "translated"
}
```

## 验证

- 预览标签 scheme 为 `aitranslate`。
- 外语段落出现译文；代码围栏与许多结构元素保持保留（见[文档分段](../explanation/segmentation.md)）。
- 日志显示 `apiCalls` 递增；无编辑重复预览应命中缓存（[缓存](./cache.md)）。

## 陷阱

| 陷阱 | 说明 |
|------|------|
| 「仅 Markdown」警告 | `canTranslateWholeDocument` 拒绝非 markdown/plaintext。 |
| 无内容可译 | 检测将全部标为目标语言；启用[强制翻译](./force-translate.md)或改目标。 |
| 表格/列表部分失败 | 列表可能回退逐行（`list-lines` 计划）；大表格为保留容器。 |
| JSON 批量错误 | 模型须返回 id→text JSON；调整模型或 `llm.jsonMode`。 |
| 超大文件 | tree-sitter 悬停遵守 `aiTranslate.parser.maxFileSizeKB`；文档路径读取全文——极大文件可能慢或占内存。 |
| 预览已关闭 | 关闭预览文档会 `onClosePreview`；用翻译文档重新打开。 |

## 编辑源文件时的协作习惯

推荐在预览打开期间编辑**源** Markdown，而非虚拟 `aitranslate:` 标签（只读）。源变更后使用 **Refresh Document Translation** 重新分段；仅刷新预览而不重跑分段可能导致偏移错位。对大型文档，可先关闭 `codeLens` 减少 UI 开销，或临时降低 `batchSize` 以减轻单次 JSON 批量失败概率。与协作者共享时，说明 side file 是否纳入版本控制，避免与手工翻译文件冲突。

## 质量检查清单

- 代码围栏内无意外译文（应为 `preserved`）。
- 链接与图片语法未被模型破坏；若失败，查看占位符恢复日志。
- frontmatter 键名未改动，仅值语言变化。
- 重复打开同一文件应显著更快（缓存命中）。

## autoRefresh 与大型仓库

`document.autoRefresh` 在每次源编辑后重新分段翻译，对大文件可能频繁调用 API。默认关闭。若启用，请配合较大缓存与稳定模型，并注意保存时批量请求尖峰。Monorepo 中仅翻译 `docs/` 下文件时，可在该文件夹 settings 覆盖 `batchSize` 降低单次失败影响。

## 与隐私排除的交集

`docs/internal/secrets.md` 若匹配 `privacy.exclude`，**Translate Document** 不会启动。将敏感文档移出排除 glob 前请评估是否应改用选区局部翻译。虚拟 `untitled` Markdown 可翻译若 scheme 在 `allowedSchemes` 内，但无 side file 路径直至保存。发布流程建议：预览审阅 → **Generate Side File** → Git diff → 合并；勿将 `aitranslate:` 虚拟标签内容当作已保存文件直接提交。Explorer 右键翻译与标题栏地球图标等价；CI 无法驱动预览，本地化流水线仍应在开发者本机或专用 runner 上运行扩展命令或使用 side file 产物入库。

## 小结

整篇 Markdown 翻译 = 分段 + 批量 + 虚拟预览 + 可选 side file。掌握刷新（源重跑 vs 预览 bypass）与 `previewStyle` 即可覆盖大多数文档本地化场景；代码文件仍用悬停/选区。配合[文档分段](../explanation/segmentation.md) 理解 preserved 段，可减少「为什么代码块没变」的支持问题。

## 相关文档

- [Frontmatter](./frontmatter.md)
- [强制翻译](./force-translate.md)
- [架构 — 文档流水线](../explanation/architecture.md)
