# LinguaLens

English | [简体中文](README.zh-CN.md)

**Translate comments, strings, and docs inside VS Code and Cursor with your own OpenAI-compatible LLM—API keys stay in VS Code SecretStorage, not in settings files.**

LinguaLens works in **Visual Studio Code** and compatible editors (**Cursor**, **Windsurf**, **VSCodium**, etc.). Marketplace name: **LinguaLens for Visual Studio Code** (`samuelj1519.lingua-lens`).

Hover translation, selection and clipboard workflows, whole-document bilingual preview, config-file hovers, Git helpers, a glossary, LRU + disk cache, and a settings webview. Only text you hover or explicitly translate is sent to the LLM endpoint you configure.

## See it in Cursor

These examples translate sample content into Simplified Chinese (`zh-CN`).

![An English code comment with a LinguaLens hover showing its Chinese translation and actions](resources/media/hover-translation.png)

Click **Translate document (preview)** above the Markdown text to open the source and translation side by side:

![Clicking the Translate document button above Markdown opens a bilingual preview on the right in Cursor](resources/media/document-preview.gif)

## Quick start

1. **Install** LinguaLens from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/) or [Open VSX](https://open-vsx.org/), or install a `.vsix` from [GitHub Releases](https://github.com/samuelj1519/lingua-lens/releases).
2. Run **LinguaLens: Set API Key** (Command Palette). The key is stored per API origin in **SecretStorage**.
3. Set **`linguaLens.llm.baseUrl`** and **`linguaLens.llm.model`** in Settings (or use **LinguaLens: Open Settings Panel**).
4. Run **LinguaLens: Test Connection**, then hover a comment or run **Translate document (preview)** on a Markdown file.

Tutorial: [Getting started](https://github.com/samuelj1519/lingua-lens/blob/main/docs/en/tutorials/getting-started.md).

## Why use it

| Capability | What you get |
| --- | --- |
| **Hover translation** | Tree-sitter (with regex fallback) extracts comments, strings, Markdown paragraphs, config values/keys, template UI text, and more. Optional blocks for diagnostics, symbol docs, Git commit messages, and active selections. |
| **Document preview** | `lingualens:` virtual document with interleaved or append layout; progress per translatable segment; side files such as `README.zh-CN.md`. |
| **Editor workflows** | Keybindings for selection, clipboard/terminal, replace/insert, and popup translation. CodeLens on Markdown for translate / refresh / side file. |
| **Operations** | Per-origin API keys, connection test, cache clear, workspace disable, privacy acknowledgement, and exclude globs for sensitive paths. |
| **i18n** | Runtime UI follows `linguaLens.targetLanguage` (`l10n/bundle`); built-in settings labels follow the editor UI language (`package.nls`). |

## Provider setup (OpenAI-compatible)

All providers use `POST {baseUrl}/chat/completions` with a Bearer token from **Set API Key**.

| Provider | Example `linguaLens.llm.baseUrl` | Notes |
| --- | --- | --- |
| OpenAI | `https://api.openai.com/v1` | Default in `package.json`. |
| DeepSeek | `https://api.deepseek.com/v1` | Often needs `extraBody` to disable thinking. |
| Qwen (DashScope) | `https://dashscope.aliyuncs.com/compatible-mode/v1` | Compatible-mode endpoint. |
| Doubao / Ark | `https://ark.cn-beijing.volces.com/api/v3` | Use your Ark OpenAI-compatible base URL. |

Example `settings.json` (User):

```json
{
  "linguaLens.llm.baseUrl": "https://api.deepseek.com/v1",
  "linguaLens.llm.model": "deepseek-chat",
  "linguaLens.llm.extraBody": {
    "thinking": { "type": "disabled" }
  },
  "linguaLens.targetLanguage": "zh-CN"
}
```

Details: [Configure providers](https://github.com/samuelj1519/lingua-lens/blob/main/docs/en/how-to/configure-providers.md) · [Extra body / thinking](https://github.com/samuelj1519/lingua-lens/blob/main/docs/en/how-to/extra-body-thinking.md).

## Key settings

| Setting | Default | Purpose |
| --- | --- | --- |
| `linguaLens.enabled` | `true` | Master switch per resource. |
| `linguaLens.targetLanguage` | `zh-CN` | Translation output + extension-owned UI language. |
| `linguaLens.llm.baseUrl` | `https://api.openai.com/v1` | API root (include `/v1` when required). |
| `linguaLens.llm.model` | _(empty)_ | Required before any LLM call. |
| `linguaLens.llm.extraBody` | `{}` | Merged into chat JSON (thinking flags, etc.). |
| `linguaLens.hover.enabled` | `true` | Hover translation master switch. |
| `linguaLens.document.forceTranslate` | `false` | Skip language detection for whole documents. |
| `linguaLens.cache.enabled` | `true` | Memory LRU + disk JSONL under global storage. |

Full list: [Settings reference](https://github.com/samuelj1519/lingua-lens/blob/main/docs/en/reference/settings.md) (auto-generated in repo).

## Commands (palette)

| Command | Default key | When |
| --- | --- | --- |
| `linguaLens.setApiKey` | — | Always (palette / status bar). |
| `linguaLens.translateSelection` | `Ctrl+Alt+Shift+T` | Editor with selection. |
| `linguaLens.translateDocument` | `Ctrl+Alt+Shift+D` | Markdown / plain text editor. |
| `linguaLens.translateClipboardOrSelection` | `Ctrl+Alt+Shift+Y` | Terminal selection or clipboard. |
| `linguaLens.openSettingsPanel` | — | QuickPick / palette. |
| `linguaLens.clearCache` | — | Palette / status bar tooltip link. |

All commands: [Commands reference](https://github.com/samuelj1519/lingua-lens/blob/main/docs/en/reference/commands.md).

## FAQ

**Hover shows nothing** — Check `linguaLens.enabled`, file exclude globs, privacy acknowledgement, and whether detection skipped the fragment (already in target language). Enable `linguaLens.log.level`: `debug` and open **LinguaLens: Show Log**.

**401 / connection errors** — Confirm `baseUrl` includes `/v1` if your vendor requires it, model id is set, and the key matches that origin. See [Troubleshoot connection](https://github.com/samuelj1519/lingua-lens/blob/main/docs/en/how-to/troubleshoot-connection.md).

**Document already in Chinese but still translating** — Turn off `linguaLens.document.forceTranslate`. Detection uses the same rules as hover unless forced.

**Stale translation after changing model** — Cache keys include `model`, `baseUrl`, and `extraBody` hash; use **Refresh** on hover or **Clear cache** if needed.

## Privacy and security

- **What is sent:** Text under the cursor, in selections, or in document segments you explicitly translate is sent to **`linguaLens.llm.baseUrl`** (your LLM provider). Nothing is sent to LinguaLens publishers or third-party analytics.
- **API keys:** Stored only in VS Code **SecretStorage** (per API origin). They are not written to `settings.json`, workspace files, or the settings panel webview.
- **Telemetry:** LinguaLens does **not** collect usage telemetry.
- **Sensitive files:** Default exclude globs skip `.env`, key files, `node_modules`, `.git`, and similar paths.
- **Local cache:** Translation cache is stored under the extension’s global storage on your machine.

[Security policy](https://github.com/samuelj1519/lingua-lens/blob/main/SECURITY.md) · [Contributing](https://github.com/samuelj1519/lingua-lens/blob/main/CONTRIBUTING.md)

## Documentation

- [Documentation home](https://github.com/samuelj1519/lingua-lens/tree/main/docs)
- [Tutorials](https://github.com/samuelj1519/lingua-lens/tree/main/docs/en/tutorials) · [How-to](https://github.com/samuelj1519/lingua-lens/tree/main/docs/en/how-to) · [Reference](https://github.com/samuelj1519/lingua-lens/tree/main/docs/en/reference) · [Explanation](https://github.com/samuelj1519/lingua-lens/tree/main/docs/en/explanation)

## Development

```bash
npm install
npm run build
npm test
npm run package
```

## License

MIT — see [LICENSE](LICENSE).
