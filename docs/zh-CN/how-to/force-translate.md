# 强制翻译文档

## 目标

在语言检测判定分段已属目标语族，或文档门禁否则会显示「已是目标语言」并拒绝打开预览时，仍翻译 Markdown 或纯文本文档。

## 前提

- 理解[语言检测](../explanation/detection.md)：默认以目标脚本为主的分段（例如 `zh-CN` 的汉字）会被跳过。
- 已配置 LLM；满足[翻译 Markdown](./translate-markdown.md) 的文档翻译前提。

## 何时需要强制翻译

典型场景：

- 需要 **zh-TW** 输出但源为 **zh-CN**（同属 `zh` 语族——检测将两者都视为中文脚本）。
- 编辑策略要求尽管表面语言匹配仍按目标区域改写。
- 混合语言文档中检测低估可译正文。
- 在通常会跳过的文本上验证提示词或术语表变更。

注意：设置中存在 `linguaLens.detection.strictChineseVariant` 供将来简繁区分，但 **`LanguageDetector.decide` 尚未实现变体拆分**（见[语言检测](../explanation/detection.md)）。当今 zh-CN ↔ zh-TW 的实用做法是强制翻译。

## 步骤 1：启用设置

资源作用域（每工作区或文件夹）：

```json
{
  "linguaLens.document.forceTranslate": true
}
```

`package.json` 默认 `false`。

## 步骤 2：运行文档翻译

1. 打开 `.md` 文件。
2. 运行 **LinguaLens: Translate Document**。
3. `isDocumentAlreadyInTargetLanguage(translatableCount, forceTranslate)` 在 force 为 true 时返回 false，即使所有分段本会被跳过也会打开预览。
4. 每段计划（`buildDocumentTranslationPlan` + `shouldTranslateDocumentText`）在评估是否批量时每段时尊重 force。

## 步骤 3：验证分段已发送到 LLM

- 进度通知应显示非零分段数。
- `debug` 日志应显示批量 API 调用。
- 预览显示新措辞；与源对比。

## 步骤 4：完成后关闭

强制模式增加 API 成本，可能将中文文档中的英文注释「翻译」成尴尬重复。批量任务后关闭：

```json
{
  "linguaLens.document.forceTranslate": false
}
```

## 与悬停、选区的关系

`document.forceTranslate` 仅影响**文档流水线**。悬停与选区仍独立使用 `decide()`。选区始终为显式翻译请求。悬停请调整 `detection.targetRatio`、`minLength` 或跳过模式。

## 提供商设置（不变）

强制翻译不绕过隐私或密钥。示例栈：

```json
{
  "linguaLens.document.forceTranslate": true,
  "linguaLens.targetLanguage": "zh-TW",
  "linguaLens.llm.baseUrl": "https://api.deepseek.com/v1",
  "linguaLens.llm.model": "deepseek-chat",
  "linguaLens.llm.extraBody": {
    "thinking": { "type": "disabled" }
  }
}
```

## 验证清单

- [ ] 预览打开且无「已是目标语言」提示。
- [ ] 会话中 `totalTranslatable` 大于零。
- [ ] 文本变更后缓存条目更新（需要时用 bypass 刷新）。

## 陷阱

| 陷阱 | 说明 |
|------|------|
| 冗余 API 花费 | 每段可能翻译，包括已是母语的正文。 |
| 术语需术语表 | 无术语表时专有名词各次音译可能不一致。 |
| 恒等跳过仍适用 | `isSameTranslationAsSource` 在模型返回未变文本时可跳过缓存写入。 |
| 不适用于代码文件 | 强制标志不会在 `.ts` 上启用文档模式。 |
| strictChineseVariant | 单独设置不会改变行为，直至在 `decide()` 中实现。 |

## 与选区、悬停对比

强制翻译从不禁用 `PrivacyGuard` 的路径排除或隐私确认。悬停因检测跳过已是英文的代码注释而目标是 `en` 时，问题不在强制翻译——应降低 `detection.minLength` 或添加跳过模式例外。

## 批量作业建议

对整库中文文档批量生成繁体或英文版本时，可临时启用 `forceTranslate` 并配合术语表固定专名译法。完成后关闭 force，避免日常编辑时每次预览都对已是母语的段落付费翻译。结合 `sideFileNamePattern` 与 `sideFileContent: translated` 可将结果写入 `readme.zh-TW.md` 等兄弟文件，源文件保持不动，便于 PR 审阅。若仅需 frontmatter 标题转换而正文已是目标语言，考虑缩小 `frontmatterFields` 列表而非全局 force，以降低成本。

## 与 strictChineseVariant 的路线图

当 `decide()` 未来实现 `strictChineseVariant` 后，简繁互译可能在检测层部分自动进行，force 仍适用于「同语族但需润色」的编辑策略。在功能落地前，请勿假设仅设置 `strictChineseVariant: true` 即可替代 force；应以本指南与[语言检测](../explanation/detection.md) 为准。

## 成本与分段可见性

启用 force 后，`buildDocumentTranslationPlan` 仍可能因空分段或 `preserved` 跳过 API，但可译段落几乎全部进入 `batch`。进度通知中的完成数应接近可译段总数。若仍为 0，检查是否整篇被 `privacy.exclude` 或文档类型不支持。对比 force 开/关两次预览的 API 调用次数，可估算检测为您节省的请求量，便于向团队说明默认检测的价值。

## 与旁路文件、审阅流程

生成 `readme.zh-TW.md` 等旁路文件时，force 确保繁体目标下简体源仍被处理。PR 审阅应关注模型是否过度改写技术术语；配合 `.translate-glossary.json` 锁定品牌名与 API 名。完成后关闭 force，避免后续小改触发全篇重译（除非您使用 bypass 刷新）。

## 示例：简体 README 转繁体

将 `targetLanguage` 设为 `zh-TW`，启用 `forceTranslate`，对 `README.zh-CN.md` 运行 **Translate Document**，生成 `README.zh-TW.md` side file。检测在 force 关闭时会因 `zh` 语族跳过绝大多数段落；force 开启后每段进入批量。审阅时注意术语表统一公司名繁体写法。完成后关闭 force，日常编辑恢复检测节省成本。

## 示例：英中混合技术文档

正文大量英文段落、少量中文说明时，检测通常只翻译英文段；若中文段也需英译回中文润色，force 会翻译全部可译段，包括已是中文的句子——请仅对需要发布的章节使用，或拆文件降低范围。记录 force 开启前后的 API 用量，便于向管理层说明检测默认策略节省的成本；force 适合发布窗口，不适合长期常驻配置。与 `targetLanguage: zh-TW` 组合是简繁工作流最常见配对；完成后用 diff 工具抽查专有名词，必要时更新术语表再重跑 bypass 刷新，而不是反复开关 force。

## 小结

`document.forceTranslate` 是文档专用开关，不替代检测调优，也不影响悬停跳过逻辑。发布繁体版、重译同语族文档或验证提示词时使用，完毕即关，以控制 API 花费与噪音译文。与[区域参考](../reference/locales.md) 中的 `zh` 语族说明一并阅读，可理解为何简繁不能仅靠改 `targetLanguage` 自动互译。悬停路径不受此开关影响，勿与文档 force 混淆。批量作业结束后在 workspace settings 中显式写回 `false`，避免提交到共享仓库误开 force。预览标题栏刷新在 force 开启时仍会 bypass 缓存，行为与默认模式相同。以上覆盖 force 的常见工作流与风险点。

## 相关文档

- [语言检测](../explanation/detection.md)
- [翻译 Markdown](./translate-markdown.md)
- [区域与目标语言](../reference/locales.md)
