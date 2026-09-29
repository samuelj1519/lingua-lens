# 目标语言与界面本地化

## 目标

设置翻译目标语言（`aiTranslate.targetLanguage`），理解从编辑器 UI 区域设置的首次运行引导，并通过 `l10n` 包使用已本地化的扩展 UI 字符串。

## 前提

- 扩展已激活（`initUiL10n` 从扩展路径加载 `./l10n`）。
- 熟悉[区域与目标语言参考](../reference/locales.md)。

## 内置目标语言

来自 `package.json` / `BUILTIN_TARGET_LANGUAGES` 的枚举：

`zh-CN`、`zh-TW`、`en`、`ja`、`ko`、`fr`、`de`、`es`、`ru`。

提示词与检测语族映射变体（例如两种中文目标在脚本统计中共享 `zh` 语族）。

## 步骤 1：在状态栏更改目标语言

1. 点击状态栏语言段（**AI Translate: Select Target Language**）。
2. 从快速选择中挑选语言。
3. `targetLanguage` 的 `config.onDidChange` 会重置 UI l10n 缓存、刷新 CodeLens、状态栏与所有 `aitranslate:` 预览。

## 步骤 2：在设置 JSON 中更改目标

资源作用域（支持每工作区/文件夹/文件覆盖）：

```json
{
  "aiTranslate.targetLanguage": "ja"
}
```

## 步骤 3：首次运行 Cursor / VS Code UI 引导

首次激活时，若**从未**在全局、工作区或文件夹层设置 `targetLanguage`：

1. `applyTargetLanguageCursorUiBootstrap` 运行一次（全局状态 `CURSOR_UI_BOOTSTRAP_STATE_KEY`）。
2. `mapVscodeUiLanguageToTarget(vscode.env.language)` 选择目标。
3. 英文 UI（`en`、`en-US`、…）映射到目标 **`en`**，而非 `zh-CN`。
4. 未匹配的 UI 区域回退 **`en`**。

可能存储一次性提示（`CURSOR_UI_BOOTSTRAP_HINT_KEY`）供设置面板区域消息使用。

若任一层已定义 `targetLanguage`，引导不会覆盖。

## 步骤 4：设置面板语言控件

**AI Translate: Open Settings Panel** 显示原生标签（`TARGET_LANGUAGE_NATIVE_LABELS`）：

- 简体中文 → `zh-CN`
- 繁體中文 → `zh-TW`
- English → `en`
- 等。

更改下拉框向扩展宿主发送 `update` 消息，并在所选作用域（用户 / 工作区）写入配置。

## 步骤 5：UI 字符串 vs 翻译目标

`initUiL10n(context.extensionPath, () => config.getRawTargetLanguage())` 在目录条目存在时将捆绑 UI 翻译与目标语言关联。命令面板标题使用 `package.json` 的 `%command.*%` NLS 键。

扩展 UI 语言跟随目标选择（`t('…')` 键的内置消息），而非 VS Code 显示语言——除一次性引导默认外。

## 步骤 6：验证

- 状态栏显示所选代码（例如 `ZH-CN`）。
- 悬停将**译成**该语言（从检测到的源语族）。
- 文档预览 URI 含与目标匹配的 `lang=` 查询。
- 旁路文件模式 `${lang}` 展开为目标代码。

## strictChineseVariant（未来行为）

```json
{
  "aiTranslate.detection.strictChineseVariant": false
}
```

文档说明在检测中区分简繁。**当前 `decide()` 未用此标志做变体拆分**；当今 zh-CN 与 zh-TW 工作流请用 `forceTranslate` 或手动选目标。

## 陷阱

| 陷阱 | 说明 |
|------|------|
| 引导后意外英文目标 | 英文 UI 全新安装会自动设 `en` 一次。 |
| 工作区覆盖被忽略 | 多根工作区检查文件夹级设置。 |
| 预览 lang 陈旧 | 更改目标 → 配置监听器刷新预览。 |
| zh-CN vs zh-TW | 检测将两者都作为 `zh` 语族跳过；见[强制翻译](./force-translate.md)。 |
| 非法枚举 | 设置 UI 限制枚举；手写 JSON 须用精确代码。 |

## 多根工作区

打开多个文件夹时，各根 `.vscode/settings.json` 可设不同 `aiTranslate.targetLanguage`。状态栏反映活动编辑器的解析配置（`ConfigService.get(uri)`）。切换编辑器可能改变显示目标而无需手动选择——这是 VS Code 配置继承的预期行为，非扩展缺陷。

## 与扩展内文案的关系

扩展命令标题通过 `package.json` NLS 与 VS Code 显示语言合并；`initUiL10n` 则按 `targetLanguage` 选择部分运行时消息语言。因此可能出现：VS Code 界面为英文，而 AI Translate 通知为日文（当目标为 `ja` 且目录有对应条目）。这不改变 LLM 输出语言——输出始终由 `targetLanguage` 驱动。更改目标后 `resetUiL10nCache()` 确保不会继续显示上一目标的 UI 字符串。

## 迁移与团队规范

团队可在 `.vscode/settings.json` 提交默认 `targetLanguage`，覆盖成员本机 bootstrap 的一次性 `en` 默认（若成员从未设过全局目标）。多语言产品组可为文档子文件夹设 `en`、为源码注释审查设 `zh-CN`，依赖资源作用域解析。状态栏显示随活动编辑器变化时，留意当前文件解析到的目标，避免误以为「全局只一种语言」。

## 重置 bootstrap 状态（高级）

`CURSOR_UI_BOOTSTRAP_STATE_KEY` 存于全局状态；一般用户无需清除。若测试首次运行体验，可在开发者工具或扩展主机中清除该键后重载窗口——仅当所有层的 `targetLanguage` 均未设置时才会再次自动对齐 UI 区域。已手动设置过目标的用户不受此影响。

## 与 VS Code 显示语言的区别

将 VS Code 显示语言设为中文不会自动将 `targetLanguage` 改为 `zh-CN`，除非触发上述一次性 bootstrap 且您从未配置目标。扩展内 `t()` 消息可能随目标语言变化，与 VS Code 菜单语言独立。培训新成员时说明：改 VS Code 语言 ≠ 改翻译输出语言。

## 快速参考：用户常见疑问

**问：** 装完扩展为什么是英文目标？**答：** 英文 UI 一次性 bootstrap 映射 `en`，见步骤 3。**问：** 状态栏语言与设置不一致？**答：** 检查多根文件夹覆盖与活动编辑器 URI。**问：** 改目标后旧预览语言不对？**答：** 配置监听应自动刷新；手动 **Refresh Preview**。

## 与命令面板 NLS

命令标题 `%command.aiTranslate.selectTargetLanguage%` 等由 VS Code 按**编辑器 UI 语言**显示，而翻译输出按 `targetLanguage`。培训材料应同时展示状态栏代码（`ZH-CN`）与原生标签（简体中文），减少混淆。在 Cursor 与 VS Code 之间迁移时，bootstrap 状态键位于各自全局存储，不随设置同步迁移；已设 `targetLanguage` 的用户无感，全新配置档案可能再次触发一次性对齐。编写扩展文档时，应用内 `t()` 字符串与 `docs/zh-CN` 读者所见可能不同语言：文档描述的是 `targetLanguage` 对 LLM 与部分 UI 的影响，而非 VS Code 菜单语言。对外截图请标注状态栏目标代码以免误解。

## 小结

`targetLanguage` 驱动 LLM 输出与部分扩展 UI；VS Code 显示语言仅影响一次性 bootstrap 与命令标题 NLS。状态栏、设置 JSON、设置面板三处均可改目标，改后预览与缓存键自动跟随。新成员入职培训建议演示 bootstrap 与英文 UI 默认 `en` 目标，避免误以为扩展「默认翻译成中文」。文档与代码注释的本地化策略应在团队 wiki 中写明目标语言默认值与 bootstrap 行为。`BUILTIN_TARGET_LANGUAGES` 以外语言需改扩展源码，不能仅靠 settings 添加枚举值。更改目标后术语表与提示词版本一并变化，旧缓存自然失效。

## 相关文档

- [区域与目标语言](../reference/locales.md)
- [语言检测](../explanation/detection.md)
- [入门教程](../tutorials/getting-started.md)
