# 命令与快捷键

> 由 `scripts/generate-commands-reference.mjs` 根据 `package.json` 的 `contributes` 自动生成。

命令面板中的标题格式为 **LinguaLens: …**（`category` 为 `LinguaLens`）。悬停内链命令（`linguaLens.hover.*`）默认不在命令面板中列出（`when: false`）。

| Command ID | Title | Keybinding | Surfaces |
| --- | --- | --- | --- |
| `linguaLens.toggle` | 切换启用 | — | command palette |
| `linguaLens.selectTargetLanguage` | 选择目标语言 | — | command palette |
| `linguaLens.setApiKey` | 设置 API Key | — | command palette |
| `linguaLens.clearApiKey` | 清除 API Key | — | command palette |
| `linguaLens.testConnection` | 测试连接 | — | command palette |
| `linguaLens.translateSelection` | 翻译选中内容 | `ctrl+alt+shift+t` / mac: `cmd+alt+shift+t` (when: `editorTextFocus && editorHasSelection`) | command palette, editor context |
| `linguaLens.translateDocument` | 翻译文档 (双语预览) | `ctrl+alt+shift+d` / mac: `cmd+alt+shift+d` (when: `editorTextFocus && (resourceLangId == markdown || resourceLangId == plaintext || resourceLangId == json || resourceLangId == jsonc || resourceLangId == yaml || resourceLangId == toml || resourceLangId == xml || resourceExtname == .md || resourceExtname == .markdown || resourceExtname == .txt || resourceExtname == .json || resourceExtname == .jsonc || resourceExtname == .yaml || resourceExtname == .yml || resourceExtname == .toml || resourceExtname == .xml || resourceExtname == .plist || resourceExtname == .MD || resourceExtname == .MARKDOWN || resourceExtname == .TXT || resourceExtname == .JSON || resourceExtname == .JSONC || resourceExtname == .YAML || resourceExtname == .YML || resourceExtname == .TOML || resourceExtname == .XML || resourceExtname == .PLIST)`) | command palette, editor context, editor title, explorer context, CodeLens (Markdown) |
| `linguaLens.refreshPreview` | 刷新翻译 | — | command palette, editor title |
| `linguaLens.refreshDocumentTranslation` | 刷新全文翻译 | — | command palette, CodeLens (Markdown) |
| `linguaLens.hover.refresh` | 刷新译文 | — | hover markdown link |
| `linguaLens.showQuickPick` | LinguaLens 菜单 | — | command palette, status bar |
| `linguaLens.translateSelectionPopup` | 翻译选区（弹窗） | `ctrl+alt+shift+p` / mac: `cmd+alt+shift+p` (when: `editorTextFocus && editorHasSelection`) | command palette |
| `linguaLens.selection.replace` | 用译文替换选区 | — | command palette |
| `linguaLens.selection.insertBelow` | 在下方插入译文 | — | command palette |
| `linguaLens.generateSideFile` | 生成译文文件 | — | command palette, editor context, editor title, explorer context, CodeLens (Markdown) |
| `linguaLens.clearCache` | 清除翻译缓存 | — | command palette |
| `linguaLens.disableForWorkspace` | 在此工作区禁用 | — | command palette |
| `linguaLens.enableForWorkspace` | 在此工作区启用 | — | command palette |
| `linguaLens.openGlossary` | 打开术语表 | — | command palette |
| `linguaLens.showLog` | 显示日志 | — | command palette |
| `linguaLens.openSettings` | 打开设置 | — | command palette |
| `linguaLens.openSettingsPanel` | 打开设置面板 | — | command palette, status bar QuickPick |
| `linguaLens.acknowledgePrivacy` | 确认隐私提示 | — | — |
| `linguaLens.hover.copy` | 复制译文 | — | hover markdown link |
| `linguaLens.hover.insertComment` | 插入为注释 | — | hover markdown link |
| `linguaLens.hover.retranslate` | 重新翻译 | — | hover markdown link |
| `linguaLens.translateClipboardOrSelection` | 翻译终端选区或剪贴板 | `ctrl+alt+shift+y` / mac: `cmd+alt+shift+y` | command palette |
| `linguaLens.translateReplaceSelection` | 翻译并替换选区 | `ctrl+alt+shift+r` / mac: `cmd+alt+shift+r` (when: `editorTextFocus && editorHasSelection`) | command palette |
| `linguaLens.translateInsertBelow` | 翻译并在下方插入 | `ctrl+alt+shift+b` / mac: `cmd+alt+shift+b` (when: `editorTextFocus && editorHasSelection`) | command palette |
| `linguaLens.translateGitCommitAtLine` | 翻译当前行 Git 提交说明 | — | command palette |
| `linguaLens.translateScmInput` | 翻译 SCM 提交说明 | — | command palette |
| `linguaLens.generateLocaleFile` | 生成语言包译文文件 | — | command palette |
| `linguaLens.suggestVariableNames` | 根据描述建议英文变量名 | — | command palette |
| `linguaLens.applyDeepSeekExtraBodyPreset` | 应用 DeepSeek 关闭思考预设 | — | — |
| `linguaLens.openExtraBodySettings` | 打开 Extra Body 设置 | — | — |

## CodeLens

Markdown / 纯文本编辑器在文件顶部显示 **翻译全文（对照预览）**、**生成译文文件**、**刷新全文翻译**（预览已打开时）等 CodeLens，具体文案来自 `l10n/bundle`（跟随 `linguaLens.targetLanguage`）。

## Status bar

右侧 **Tr/译** 图标打开 QuickPick（启用/禁用、目标语言、设置面板、翻译全文等）；相邻项显示当前 `targetLanguage`。
