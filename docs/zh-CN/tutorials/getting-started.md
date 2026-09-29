# LinguaLens 入门

LinguaLens（扩展 ID `samuel-j.lingua-lens`）将 OpenAI 兼容的 LLM 翻译带入 VS Code 与 Cursor。它可在悬停时翻译代码注释与字符串字面量、翻译编辑器选区、在并排预览中翻译整篇 Markdown 或纯文本文档，并协助 Git 提交信息与 SCM 输入框。本教程从安装到首次成功的 API 调用与翻译。

## 开始前需要准备

您需要正在运行的编辑器（VS Code **1.85+** 或兼容的 Cursor 构建）、访问 LLM 提供商的网络，以及该提供商的 API 密钥。扩展将密钥保存在编辑器 Secret Storage 中，键为 `linguaLens.llm.baseUrl` 的**源（origin）**（例如 `https://api.openai.com`），而非写在 `settings.json` 中。

建议但非必须：在磁盘上打开工作区文件夹，以便术语表文件、工作区作用域设置与文档旁路文件正确解析。在**受限不受信任**工作区中，不读取术语表路径与自定义检测跳过模式；悬停与选区仍可用，限制见扩展 manifest。

## 安装扩展

1. **从 VSIX：** 在仓库根目录运行 `npm run package` 生成 `.vsix`，然后通过 **Extensions: Install from VSIX…** 或 `code --install-extension lingua-lens-*.vsix` 安装。
2. **从源码（开发）：** 运行 `npm install`、`npm run build`，按 **F5** 启动 Extension Development Host。

安装后，扩展在 **`onStartupFinished`** 激活。当 `linguaLens.statusBar.enabled` 为 true（默认）时，状态栏应显示 **LinguaLens**。

## 配置 LLM 端点

打开**设置**（`@ext:samuel-j.lingua-lens`）或运行 **LinguaLens: Open Settings Panel** 使用引导表单。至少设置：

| 设置 | 用途 |
|------|------|
| `linguaLens.llm.baseUrl` | OpenAI 兼容 API 根（默认 `https://api.openai.com/v1`） |
| `linguaLens.llm.model` | 聊天请求中发送的模型 id（任何调用前必填） |

OpenAI 示例：

```json
{
  "linguaLens.llm.baseUrl": "https://api.openai.com/v1",
  "linguaLens.llm.model": "gpt-4o-mini"
}
```

其他提供商见[配置提供商](../how-to/configure-providers.md)与[Extra body 与思考模式](../how-to/extra-body-thinking.md)。

## 设置 API 密钥

1. 从命令面板运行 **LinguaLens: Set API Key**。
2. 在提示中输入密钥。提示会显示从当前 `baseUrl` 派生的**源**，因为密钥按端点源存储。
3. 运行 **LinguaLens: Test Connection** 验证 `baseUrl`、模型与密钥。成功显示信息消息；失败显示 HTTP 客户端错误（鉴权、网络或服务器）。

设置面板不会在 webview HTML 中嵌入 API 密钥；密钥仅通过扩展宿主的 Secret Storage API 写入。见[设置面板安全](../explanation/settings-panel-security.md)。

## 选择目标语言

`linguaLens.targetLanguage` 在 `package.json` 中默认为 `zh-CN`，但在**首次激活**时，若您从未在任何配置层设置该值（`applyTargetLanguageCursorUiBootstrap`），扩展可能一次性将目标与 UI 区域对齐。例如英文 UI 映射到目标 `en`；繁体中文 UI 映射到 `zh-TW`。

随时更改目标：

- 状态栏语言选择器（**LinguaLens: Select Target Language**），或
- 设置面板顶部的语言下拉框，或
- 用户或工作区作用域的 `settings.json`。

内置目标：`zh-CN`、`zh-TW`、`en`、`ja`、`ko`、`fr`、`de`、`es`、`ru`。见[区域与目标语言参考](../reference/locales.md)。

## 确认隐私（首次使用）

在文本发送到 LLM 之前，**PrivacyGuard** 可能要求您确认内容会离开本机。排除路径（默认含 `.env`、`node_modules`、`.git`、密钥等）会阻止翻译。启用 `linguaLens.privacy.blockSecrets`（默认）时，启发式密钥检测可跳过悬停与选区。若需重置确认状态，运行 **LinguaLens: Acknowledge Privacy**。

## 第一次悬停翻译

1. 确保 `linguaLens.enabled` 与 `linguaLens.hover.enabled` 为 true。
2. 打开源文件（TypeScript、Python、Go 等，经 tree-sitter 支持；见[文件类型](../reference/file-types.md)）。
3. 在**注释**或**字符串字面量**上悬停足够久（编辑器悬停延迟 + `linguaLens.hover.extraDelayMs`，默认 700 ms）。
4. 若分段通过[语言检测](../explanation/detection.md)，悬停中显示译文及操作（复制、替换、插入注释、重新翻译）。

用 **LinguaLens: Toggle** 或状态栏切换扩展全局翻译。

## 第一次选区翻译

1. 在编辑器中选中文本。
2. 运行 **LinguaLens: Translate Selection**（有选区时 `Ctrl+Alt+Shift+T` / `Cmd+Alt+Shift+T`）或使用编辑器上下文菜单。
3. 输出遵循 `linguaLens.selection.output`：`auto` 对短文本使用通知，对较长结果（>300 字符）在编辑器旁打开虚拟 Markdown 文档。

相关命令：剪贴板或选区（`Ctrl+Alt+Shift+Y`）、替换选区（`Ctrl+Alt+Shift+R`）、在下方插入译文（`Ctrl+Alt+Shift+B`）。

## 第一次文档预览

文档翻译仅适用于 **Markdown**（`markdown`）与**纯文本**（`plaintext`）。

1. 打开 `README.md` 或任意 `.md` 文件。
2. 运行 **LinguaLens: Translate Document**（资源语言为 markdown 或 plaintext 时 `Ctrl+Alt+Shift+D` / `Cmd+Alt+Shift+D`），或点击编辑器标题栏地球图标。
3. 打开 scheme 为 `lingualens:` 的虚拟文档，显示双语预览（`linguaLens.document.previewStyle`：`interleaved` 或 `append`）。
4. 在预览标题栏使用刷新图标（**LinguaLens: Refresh Preview**）绕过缓存并重新获取分段。

翻译完成后，使用 **LinguaLens: Generate Side File** 将译文文件写入磁盘。模式：`linguaLens.document.sideFileNamePattern`（默认 `${fileBasenameNoExtension}.${lang}${fileExtname}`）。

## 术语表（可选）

在工作区放置 `.translate-glossary.json`（可通过 `linguaLens.glossary.path` 配置）。与源文本匹配的术语会注入提示词。运行 **LinguaLens: Open Glossary** 创建或编辑文件。JSON 按捆绑 schema 校验。

## 缓存与成本控制

译文缓存在内存与扩展全局存储下的磁盘（`cache/v2`）。键包含源文本、目标语言、模型、提示词版本、`baseUrl` 以及 `llm.extraBody` 的哈希（自 0.4.3）。见[缓存](../explanation/caching.md)与[清空缓存](../how-to/cache.md)。

连续五次鉴权/网络/服务器失败后，交互翻译暂停 60 秒，直至您设置新 API 密钥或错误清除（`TranslationService.resetPause`）。

## 工作区启用/禁用

- **LinguaLens: Disable for Workspace** 将第一个工作区文件夹的 `enabled` 设为 false。
- **LinguaLens: Enable for Workspace** 清除文件夹覆盖。

若需更细控制，资源作用域的 `linguaLens.enabled` 仍可按文件模式应用。

## 诊断与日志

- **LinguaLens: Show Log** 打开输出通道；级别来自 `linguaLens.log.level`（默认 `info`）。
- 状态栏反映启用状态、目标语言与密钥是否存在。

## 下一步

| 目标 | 指南 |
|------|------|
| 接入 DeepSeek、Qwen、豆包、OpenAI | [配置提供商](../how-to/configure-providers.md) |
| 关闭提供商「思考」额外字段 | [Extra body 与思考](../how-to/extra-body-thinking.md) |
| Markdown frontmatter 标题 | [Frontmatter](../how-to/frontmatter.md) |
| 强制翻译已是中文的文档 | [强制翻译](../how-to/force-translate.md) |
| Git 提交行 | [Git 翻译](../how-to/git-translate.md) |
| 连接错误 | [排查连接](../how-to/troubleshoot-connection.md) |
| 架构概览 | [架构](../explanation/architecture.md) |
| 全部设置 | [设置参考](../reference/settings.md)（生成） |
| 全部命令 | [命令参考](../reference/commands.md)（生成） |

## 设置阶段常见陷阱

- **模型为空：** 在设置 `linguaLens.llm.model` 之前，`LlmClient` 会以「Model name is not configured」拒绝请求。
- **端点与密钥不匹配：** 密钥按 `baseUrl` 源存储；切换提供商需再次 **Set API Key** 或 **Clear API Key**。
- **悬停从不出现：** 文本可能过短（`detection.minLength`）、已在目标语族、被路径排除，或悬停开关（`hover.comments` / `hover.strings`）关闭。
- **文档命令不可见：** 除非文件为 markdown/plaintext 且非 `lingualens:` 预览，命令会隐藏。
- **虚拟工作区：** 整文档功能受限；悬停与选区仍可用（见 `package.json` capabilities）。

悬停与**测试连接**成功后，您已具备工作闭环：检测 → 可选缓存 → LLM → 占位符恢复 → UI。其余文档在不改变此基本流程的前提下深化各阶段。
