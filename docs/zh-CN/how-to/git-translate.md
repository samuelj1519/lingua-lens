# 翻译 Git 提交信息

## 目标

翻译 Git 历史中的提交信息（在仓库文件中某行）或 SCM 提交输入框中的文本，使用与选区翻译相同的 LLM 与检测栈。

## 前提

- 已启用 Git 集成的仓库（`vscode.git` 扩展活动）。
- `aiTranslate.hover.gitCommitMessage` 启用（默认 true）以在提交行悬停；命令可独立使用。
- 已配置 LLM（[配置提供商](./configure-providers.md)）。
- 已确认隐私。

## 命令

| 命令 | 用途 |
|------|------|
| **AI Translate: Translate Git Commit at Line** | 读取受跟踪文件中活动行关联提交的提交信息。 |
| **AI Translate: Translate SCM Input** | 翻译源代码管理提交信息输入框中的当前文本。 |

## 步骤 1：翻译历史提交信息

1. 在 **file** scheme 工作区（`file://`）打开 Git 跟踪的文件。
2. 将光标放在属于某提交的行上（blame/历史上下文）。
3. 运行 **AI Translate: Translate Git Commit at Line**。
4. `getCommitMessageAtLine` 解析信息；若为空，显示警告（`msg.git.noCommitMessage`）。
5. 除非适用 SCM 替换流程，译文在虚拟 Markdown 文档中打开（标题来自 `hover.title.gitCommit`）。

要求：

- 须存在活动编辑器且 `document.uri.scheme === 'file'`。
- 否则：警告在仓库内使用（`msg.git.useInRepo`）。

## 步骤 2：翻译 SCM 输入框

1. 在**源代码管理**输入框中输入或粘贴草稿提交信息。
2. 运行 **AI Translate: Translate SCM Input**。
3. 输入为空时警告 `msg.scm.empty`。
4. 翻译后提示 **Replace**（写入第一个仓库的 `inputBox.value`）或仅查看。

`replaceScm` 路径使用 Git 扩展 API：

```typescript
git.getAPI(1).repositories[0].inputBox.value = result.text;
```

仅更新第一个仓库；多仓库工作区可能需要手动复制。

## 步骤 3：Git 文本的目标语言

`resolveSelectionTargetLanguage` 可能根据消息内容调整目标（与其他选区流程相同辅助函数）。工作区 `aiTranslate.targetLanguage` 为基线。

用户设置示例：

```json
{
  "aiTranslate.targetLanguage": "en",
  "aiTranslate.hover.gitCommitMessage": true
}
```

## 步骤 4：在提交关联行悬停

启用时，相关 Git 上下文上的文档悬停可通过 `DocumentHoverExtractor` / git 悬停路径显示提交信息译文（见架构）。确保悬停延迟与 max chars 适应提交信息长度。

## 步骤 5：验证

- 命令产生带译后主题/正文的 Markdown 预览。
- 提交信息中的密钥在 `privacy.blockSecrets` 匹配模式时被阻止（`msg.secretNotSent`）。
- **Test Connection** 仍有效；翻译使用 `kind: 'selection'` 缓存键。

## 提供商示例（与其他处相同）

DeepSeek：

```json
{
  "aiTranslate.llm.baseUrl": "https://api.deepseek.com/v1",
  "aiTranslate.llm.model": "deepseek-chat",
  "aiTranslate.llm.extraBody": { "thinking": { "type": "disabled" } }
}
```

Qwen：

```json
{
  "aiTranslate.llm.baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "aiTranslate.llm.model": "qwen-plus",
  "aiTranslate.llm.extraBody": { "enable_thinking": false }
}
```

## 陷阱

| 陷阱 | 缓解 |
|------|------|
| 行上无信息 | 行未链接到 Git 历史视图中的提交。 |
| SCM 替换错仓库 | 非第一个仓库请从预览手动复制。 |
| 约定式提交被破坏 | 替换前审阅译文；前缀可能被无意本地化。 |
| 长信息在 UI 截断 | 悬停 `maxChars` 可能裁剪；用命令获取全文。 |
| 排除工作区 | `.git` 路径排除文件翻译，不排除 Git 消息命令。 |

## 键盘与菜单发现

Git 翻译命令在命令面板 **AI Translate** 分类下。`package.json` 未绑定默认快捷键；若常翻译提交信息，可在 `keybindings.json` 自定义：

```json
{
  "key": "ctrl+shift+g t",
  "command": "aiTranslate.translateScmInput",
  "when": "scmRepository"
}
```

## 与悬停 Git 路径的关系

除显式命令外，`aiTranslate.hover.gitCommitMessage` 可在适当时机于悬停中展示提交信息译文，延迟与 `hover.extraDelayMs`、`maxChars` 同样适用。若提交信息极长，优先使用 **Translate Git Commit at Line** 命令打开完整虚拟文档，而非依赖悬停截断。悬停与命令共享 `kind: 'selection'` 类缓存键（文本 + 目标 + 模型等），重复查看同一提交应更快。

## 安全与合规

提交信息可能包含内部代号或凭据片段；`privacy.blockSecrets` 对 Git 文本同样生效。在开源仓库工作前，先 **Replace** SCM 输入前审阅译文，避免将内部中文说明意外提交到公开历史。`.git` 目录内文件本身受 `privacy.exclude` 保护，但 Git 命令读取的是 Git 扩展提供的消息对象，与是否在 `.git` 路径悬停无关。

## 多仓库与 monorepo

`translateScmInput` 仅写入 `repositories[0]`。在包含多个 Git 根的 VS Code 工作区中，先聚焦正确的 SCM 仓库或从预览复制译文。`Translate Git Commit at Line` 依赖当前文件所属仓库的 blame 信息；子模块或稀疏检出可能导致行与提交关联失败，此时应直接在 Git 日志视图中复制消息后用选区翻译。

## 语言与约定式提交

目标为英文时，模型可能翻译 `fix:` 前缀后的描述而保留前缀，也可能本地化前缀；审阅后再 **Replace**。若团队要求英文提交，将 `targetLanguage` 设为 `en` 并在 SCM 输入中保持英文草稿。缓存键与选区翻译相同，重复翻译同一草稿会加速。

## 与 blame 扩展的协作

若安装 GitLens 等增强 blame 的扩展，**Translate Git Commit at Line** 仍使用 VS Code Git API 解析行提交，不依赖第三方。光标行无 blame 关联时命令失败属正常。建议在源代码管理时间线中确认该行属于预期提交后再翻译，避免将合并提交信息误当作行级消息。

## 离线与不完整克隆

浅克隆或部分检出可能导致历史不完整，行关联提交消息为空。完整 `git fetch` 后重试。无网络时 Git 命令仍可能读取本地对象，但 LLM 翻译仍需网络与密钥。企业 Git 托管上的提交信息可能含合规声明，翻译前确认是否允许将内容发送到所选 LLM 区域，与[入门教程](../tutorials/getting-started.md) 中的隐私确认一致。为 **Translate SCM Input** 绑定快捷键可加速多语言团队提交习惯养成；示例键位见本指南键盘一节，注意勿与 Git 自带绑定冲突。

## 小结

Git 翻译桥接 SCM 与历史 blame，不修改 `.git` 内对象；输出为预览或可选替换输入框。多仓库与合规场景下，优先人工审阅再 **Replace**，并保留 `blockSecrets` 开启。历史行翻译依赖 Git 扩展 API 可用性；若 Git 扩展禁用，命令会早期失败而非调用 LLM。

## 相关文档

- [配置提供商](./configure-providers.md)
- [架构](../explanation/architecture.md)
