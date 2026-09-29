# 区域设置与目标语言

AI Translate 使用固定的**目标语言代码**集，用于 LLM 提示词、检测语族、缓存元数据与旁路文件命名。扩展自身的 UI 字符串来自 `./l10n` 下的 VS Code `l10n` 包。

## 内置目标语言

定义于 `BUILTIN_TARGET_LANGUAGES` / `package.json` 枚举：

| 代码 | 原生标签（设置面板） | 检测语族（`familyOf`） |
|------|----------------------|-------------------------|
| `zh-CN` | 简体中文 | `zh` |
| `zh-TW` | 繁體中文 | `zh` |
| `en` | English | `en` |
| `ja` | 日本語 | `ja` |
| `ko` | 한국어 | `ko` |
| `fr` | Français | `fr` |
| `de` | Deutsch | `de` |
| `es` | Español | `es` |
| `ru` | Русский | `ru` |

设置项：`aiTranslate.targetLanguage`（资源作用域，schema 默认 `zh-CN`）。

### 提示词行为

`PromptBuilder` 在所有 kind 的系统/用户消息中包含目标语言：`hover`、`selection`、`documentBatch`、`documentFrontmatterBatch`。更改目标会改变 `promptVersion` 与缓存键。

### 旁路文件与预览 URI

- 预览查询：`aitranslate:` URI 上的 `lang={target}`。
- `aiTranslate.document.sideFileNamePattern` 变量 `${lang}` 展开为代码（例如 `readme.zh-CN.md`）。

## UI 区域设置 vs 目标语言

两个相关概念：

1. **VS Code / Cursor UI 区域** — `vscode.env.language`（例如 `en-US`、`zh-cn`）。
2. **翻译目标** — 悬停/文档输出应使用的语言。

### 首次运行引导

若用户从未在任何配置层设置 `targetLanguage`，`applyTargetLanguageCursorUiBootstrap` **运行一次**，并通过 `mapVscodeUiLanguageToTarget` 从 UI 区域写入全局 `targetLanguage`：

| UI 区域模式 | 默认目标 |
|-------------|----------|
| `zh-cn`、`zh-hans`、`zh` | `zh-CN` |
| `zh-tw`、`zh-hk`、`zh-hant` | `zh-TW` |
| `ja*` | `ja` |
| `ko*` | `ko` |
| `fr*`、`de*`、`es*`、`ru*` | 对应代码 |
| `en`、`en-*` | `en` |
| 其他 | `en` |

因此英文 UI 默认目标为**英语**，而非中文。

引导后，`CURSOR_UI_BOOTSTRAP_STATE_KEY` 防止重复。用户可随时更改目标；引导不会再次运行。

### 扩展 UI 字符串（`l10n`）

`initUiL10n(extensionPath, getRawTargetLanguage)` 在目录条目存在时为命令与消息加载已翻译的包字符串。`targetLanguage` 变更时运行 `resetUiL10nCache()`。

`package.json` 中的命令标题使用 `%command.*%` 键，由构建时 VS Code NLS 合并（`merge-nls.mjs`）解析。

## 中文变体与检测

`zh-CN` 与 `zh-TW` 在 `LanguageDetector` 中共享 `zh` **语族**。汉字占比高的文本在以任一变体为目标时常被**跳过**（视为已是中文）。

`aiTranslate.detection.strictChineseVariant` 保留供将来变体专用跳过逻辑；**`decide()` 尚未实现**。zh-CN ↔ zh-TW 文档转换请使用 `aiTranslate.document.forceTranslate`（见[强制翻译](../how-to/force-translate.md)）。

## 拉丁语系目标

`en`、`fr`、`de`、`es` 共享拉丁脚本启发式；较长文本由 tinyld 消歧。短标识符可能因 `unreliableShort` 跳过。

## 西里尔语系

`ru` 目标使用西里尔脚本统计与候选 `['ru']` 的 tinyld。

## CJK 目标

`ja`、`ko`、`zh-*` 对汉字/假名/韩文计数使用 `targetRatio`——占比高则因已像目标语言而跳过翻译。

## 工作区覆盖

`targetLanguage` 为资源作用域：

```json
// .vscode/settings.json
{
  "aiTranslate.targetLanguage": "de"
}
```

多根工作区：每文件夹设置可覆盖各仓库目标（例如文档仓库 → `en`，应用仓库 → `zh-CN`）。

## 状态栏与快速选择

`StatusBarController.pickLanguage()` 提供与设置相同的枚举。显示可能为短代码或本地化标签（取决于主题）；底层值始终为 `TargetLang` 代码。

## 相关设置

| 设置 | 作用 |
|------|------|
| `aiTranslate.targetLanguage` | LLM 输出语言 |
| `aiTranslate.detection.*` | 跳过/翻译阈值 |
| `aiTranslate.document.forceTranslate` | 文档绕过「已是目标语言」 |
| `aiTranslate.statusBar.enabled` | 显示语言控件 |

## 自定义与扩展边界

当前目标语言集合在 `package.json` 枚举中固定；不支持通过设置添加 `pt-BR` 等任意 BCP-47 代码而不改扩展。检测语族 `familyOf` 与提示词模板与上述九种代码绑定。若需未内置语言，可关注项目 issue 或使用最接近的拉丁语族目标并依赖模型多语能力（质量不保证）。`${lang}` 旁路文件名始终使用枚举代码字面量，而非本地化显示名。

## 与缓存、预览查询参数

预览 URI 查询 `lang=` 必须与 `aiTranslate.targetLanguage` 解析值一致，否则 `PreviewContentProvider` 可能拒绝会话或显示过期会话。切换目标后配置监听器刷新已打开预览，一般无需手动重开标签。缓存元数据记录 `targetLang` 字符串；`zh-CN` 与 `zh-TW` 在缓存层视为不同目标，即使检测共享 `zh` 语族——切换简繁目标不会互相命中缓存。

## mapVscodeUiLanguageToTarget 细节

映射对大小写不敏感并处理常见别名（`zh-cn`、`zh-hans` → `zh-CN`）。`en-GB` 与 `en-US` 均映射 `en`。未列出区域（如 `pt-br`）回退 `en`，这是 bootstrap 的保守默认，避免误设不支持的目标导致 API 提示异常。用户可在首次启动后立即用状态栏改目标。

## 侧写文件名示例

| 源文件 | 目标 | 默认 pattern 结果 |
|--------|------|-------------------|
| `readme.md` | `zh-CN` | `readme.zh-CN.md` |
| `guide.markdown` | `ja` | `guide.ja.markdown` |
| `notes.txt` | `de` | `notes.de.txt` |

自定义 pattern 可加入 `${fileDirname}` 等 VS Code 变量，见设置参考中 `sideFileNamePattern` 说明。

## 检测与目标对照速查

| 目标 | 高占比即常跳过 | tinyld 候选 |
|------|----------------|-------------|
| `zh-CN`/`zh-TW` | 汉字 | — |
| `ja` | 假名/汉字 | — |
| `ko` | 韩文 | — |
| `en` | 拉丁高频词 | en 等 |
| `ru` | 西里尔 | ru |

此表为行为摘要，边界情况见[语言检测](../explanation/detection.md)。

## 未来扩展语言

新增 `TargetLang` 需同步 `PromptBuilder`、状态栏枚举、设置 schema 与 `l10n` 条目，非单文件修改。关注发行说明再假设新代码可用。

## 相关文档

- [目标语言与界面语言](../how-to/target-language-ui.md)
- [语言检测](../explanation/detection.md)
- [入门教程](../tutorials/getting-started.md)
