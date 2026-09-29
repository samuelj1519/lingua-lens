# LinguaLens

English | [简体中文](README.zh-CN.md)

**Translate comments, strings, and docs inside VS Code and Cursor with your own OpenAI-compatible LLM—without sending API keys to settings files.**

LinguaLens works in **Visual Studio Code** and compatible editors (**Cursor**, **Windsurf**, **VSCodium**, etc.)—the marketplace display name follows Microsoft branding: **LinguaLens for Visual Studio Code**.

LinguaLens (`samuel-j.lingua-lens`) adds hover translation, selection and clipboard workflows, whole-document bilingual preview, config-file hovers, Git helpers, a glossary, LRU + disk cache, and a settings webview. Keys are stored in **SecretStorage** per API origin; only text you hover or explicitly translate is sent to your configured endpoint.

<!-- TODO: screenshot — hover translation on a code comment and Markdown document preview -->

## Why use it

| Capability | What you get |
| --- | --- |
| **Hover translation** | Tree-sitter (with regex fallback) extracts comments, strings, Markdown paragraphs, config values/keys, template UI text, and more. Optional blocks for diagnostics, symbol docs, Git commit messages, and active selections. |
| **Document preview** | `lingualens:` virtual document with interleaved or append layout; progress per translatable segment; side files such as `README.zh-CN.md`. |
| **Editor workflows** | Keybindings for selection, clipboard/terminal, replace/insert, and popup translation. CodeLens on Markdown for translate / refresh / side file. |
| **Operations** | Per-origin API keys, connection test, cache clear, workspace disable, privacy acknowledgement, secret blocking, and exclude globs. |
| **i18n** | Runtime UI follows `linguaLens.targetLanguage` (`l10n/bundle`); built-in settings labels follow the editor UI language (`package.nls`). |

## Quick start

1. Install the `.vsix` (`npm run package` in this repo) or launch from **F5** after `npm install && npm run build`.
2. Set `linguaLens.llm.baseUrl` and `linguaLens.llm.model` in settings (see table below).
3. Run **LinguaLens: Set API Key** and **LinguaLens: Test Connection**.
4. Hover a comment or run **Translate document (preview)** on a `.md` file.

Step-by-step tutorial: [Getting started](docs/en/tutorials/getting-started.md).

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

Details and pitfalls: [Configure providers](docs/en/how-to/configure-providers.md), [Extra body / thinking](docs/en/how-to/extra-body-thinking.md).

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

Full list (52 keys, seven UI sections): [Settings reference](docs/en/reference/settings.md) (auto-generated).

## Commands (palette)

| Command | Default key | When |
| --- | --- | --- |
| `linguaLens.setApiKey` | — | Always (palette / status bar). |
| `linguaLens.translateSelection` | `Ctrl+Alt+Shift+T` | Editor with selection. |
| `linguaLens.translateDocument` | `Ctrl+Alt+Shift+D` | Markdown / plain text editor. |
| `linguaLens.translateClipboardOrSelection` | `Ctrl+Alt+Shift+Y` | Terminal selection or clipboard. |
| `linguaLens.openSettingsPanel` | — | QuickPick / palette. |
| `linguaLens.clearCache` | — | Palette / status bar tooltip link. |

All commands, CodeLens, and context menus: [Commands reference](docs/en/reference/commands.md).

## FAQ

**Hover shows nothing** — Check `linguaLens.enabled`, file exclude globs, privacy acknowledgement, and whether detection skipped the fragment (already in target language). Enable `linguaLens.log.level`: `debug` and open **LinguaLens: Show Log**.

**401 / connection errors** — Confirm `baseUrl` includes `/v1` if your vendor requires it, model id is set, and the key matches that origin. See [Troubleshoot connection](docs/en/how-to/troubleshoot-connection.md).

**Document already in Chinese but still translating** — Turn off `linguaLens.document.forceTranslate`. Detection uses the same rules as hover unless forced.

**Stale translation after changing model** — Cache keys include `model`, `baseUrl`, and `extraBody` hash; use **Refresh** on hover or **Clear cache** if needed. See [Caching](docs/en/explanation/caching.md).

## Privacy and security

- Text under the cursor, in selections, or in document segments you translate is sent to `linguaLens.llm.baseUrl`.
- API keys never appear in `settings.json` or settings panel HTML ([CSP](docs/en/explanation/settings-panel-security.md)).
- `.env`, keys, and custom exclude globs are not read for translation.
- Disk cache lives under the extension global storage path (`cache/v2`).

[SECURITY.md](SECURITY.md) · [Contributing](CONTRIBUTING.md)

## Documentation map

- [Documentation home](docs/README.md)
- [Tutorials](docs/en/tutorials/index.md) · [How-to](docs/en/how-to/index.md) · [Reference](docs/en/reference/index.md) · [Explanation](docs/en/explanation/index.md)

## Upgrading from AI Translate (cursor-ai-translate)

1. Uninstall the old extension **`cursor-ai-translate.cursor-ai-translate`** from the Extensions view.
2. Install **`lingua-lens-0.7.0.vsix`** (or the current build from `npm run package`).
3. Reload the window. LinguaLens **migrates** any remaining **`aiTranslate.*` settings** into **`linguaLens.*`** on first activation (then removes legacy keys).
4. Disk translation cache is stored per extension ID in global storage—it **does not carry over**; expect cache misses until new entries are written. API keys in SecretStorage are per API origin and remain available.

## Development

```bash
npm install
npm run build
npm test
npm run package
```

`pretest` runs `merge-config`, `merge-nls`, and `generate-docs`.

## License

MIT — see [LICENSE](LICENSE).
