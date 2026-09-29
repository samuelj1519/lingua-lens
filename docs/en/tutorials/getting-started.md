# Getting started with LinguaLens

LinguaLens (extension ID `samuel-j.lingua-lens`) brings OpenAI-compatible LLM translation into VS Code and Cursor. It can translate code comments and string literals on hover, translate editor selections, translate whole Markdown or plain-text documents in a side-by-side preview, and help with Git commit messages and SCM input. This tutorial walks you from installation through your first successful API call and translation.

## What you need before you begin

You need a running editor (VS Code **1.85+** or a compatible Cursor build), network access to an LLM provider, and an API key for that provider. The extension stores keys in the editor Secret Storage, keyed by the **origin** of `aiTranslate.llm.baseUrl` (for example `https://api.openai.com`), not in your `settings.json`.

Optional but recommended: a workspace folder open on disk so glossary files, workspace-scoped settings, and document side files resolve correctly. In **restricted untrusted** workspaces, glossary path and custom detection skip patterns are not read; hover and selection still work with limitations documented in the extension manifest.

## Install the extension

1. **From a VSIX:** Run `npm run package` in the repository root to produce a `.vsix`, then install it with **Extensions: Install from VSIX…** or `code --install-extension lingua-lens-*.vsix`.
2. **From source (development):** Run `npm install`, `npm run build`, and press **F5** to launch an Extension Development Host.

After install, the extension activates on **`onStartupFinished`**. You should see **LinguaLens** in the status bar when `aiTranslate.statusBar.enabled` is true (default).

## Configure the LLM endpoint

Open **Settings** (`@ext:samuel-j.lingua-lens`) or run **LinguaLens: Open Settings Panel** for a guided form. At minimum set:

| Setting | Purpose |
|--------|---------|
| `aiTranslate.llm.baseUrl` | OpenAI-compatible API root (default `https://api.openai.com/v1`) |
| `aiTranslate.llm.model` | Model id sent in chat requests (required before any call) |

Example for OpenAI:

```json
{
  "aiTranslate.llm.baseUrl": "https://api.openai.com/v1",
  "aiTranslate.llm.model": "gpt-4o-mini"
}
```

For other providers, see [Configure providers](../how-to/configure-providers.md) and [Extra body and thinking modes](../how-to/extra-body-thinking.md).

## Set your API key

1. Run **LinguaLens: Set API Key** from the Command Palette.
2. Enter the key when prompted. The prompt shows the **origin** derived from your current `baseUrl`, because keys are stored per endpoint origin.
3. Run **LinguaLens: Test Connection** to verify `baseUrl`, model, and key. Success shows an information message; failures show the error from the HTTP client (auth, network, or server).

The settings panel never embeds your API key in the webview HTML; keys are only written through the Secret Storage API from the extension host. See [Settings panel security](../explanation/settings-panel-security.md).

## Choose a target language

`aiTranslate.targetLanguage` defaults to `zh-CN` in `package.json`, but on **first activation** the extension may align the target with your UI locale once if you have never set the value at any configuration layer (`applyTargetLanguageCursorUiBootstrap`). For example, English UI maps to target `en`; Traditional Chinese UI maps to `zh-TW`.

Change the target anytime:

- Status bar language picker (**LinguaLens: Select Target Language**), or
- The language dropdown at the top of the settings panel, or
- `settings.json` at user or workspace scope.

Supported built-in targets: `zh-CN`, `zh-TW`, `en`, `ja`, `ko`, `fr`, `de`, `es`, `ru`. See [Locales reference](../reference/locales.md).

## Acknowledge privacy (first use)

Before text is sent to your LLM, **PrivacyGuard** may ask you to acknowledge that content leaves your machine. Excluded paths (default includes `.env`, `node_modules`, `.git`, keys) block translation. With `aiTranslate.privacy.blockSecrets` enabled (default), heuristic secret detection can skip hover and selection. Run **LinguaLens: Acknowledge Privacy** if you need to reset acknowledgment state.

## Your first hover translation

1. Ensure `aiTranslate.enabled` is true and `aiTranslate.hover.enabled` is true.
2. Open a source file (TypeScript, Python, Go, and others supported via tree-sitter; see [File types](../reference/file-types.md)).
3. Hover over a **comment** or **string literal** long enough for the editor hover delay plus `aiTranslate.hover.extraDelayMs` (default 700 ms).
4. If the segment passes [language detection](../explanation/detection.md), a translation appears in the hover with actions (copy, replace, insert comment, retranslate).

Toggle extension-wide translation with **LinguaLens: Toggle** or the status bar.

## Your first selection translation

1. Select text in the editor.
2. Run **LinguaLens: Translate Selection** (`Ctrl+Alt+Shift+T` / `Cmd+Alt+Shift+T` when a selection exists) or use the editor context menu.
3. Output follows `aiTranslate.selection.output`: `auto` uses a notification for short text and opens a virtual Markdown document beside the editor for longer results (>300 characters).

Related commands: clipboard-or-selection (`Ctrl+Alt+Shift+Y`), replace selection (`Ctrl+Alt+Shift+R`), insert translation below (`Ctrl+Alt+Shift+B`).

## Your first document preview

Document translation applies to **Markdown** (`markdown`) and **plain text** (`plaintext`) only.

1. Open `README.md` or any `.md` file.
2. Run **LinguaLens: Translate Document** (`Ctrl+Alt+Shift+D` when the resource language is markdown or plaintext) or click the globe icon in the editor title bar.
3. A virtual document opens with scheme `aitranslate:` showing bilingual preview (`aiTranslate.document.previewStyle`: `interleaved` or `append`).
4. Use the refresh icon in the preview title bar (**LinguaLens: Refresh Preview**) to bypass cache and re-fetch segments.

To write a translated file to disk, use **LinguaLens: Generate Side File** after translation completes. Pattern: `aiTranslate.document.sideFileNamePattern` (default `${fileBasenameNoExtension}.${lang}${fileExtname}`).

## Glossary (optional)

Place a `.translate-glossary.json` file (configurable via `aiTranslate.glossary.path`) in your workspace. Terms matching source text are injected into prompts. Run **LinguaLens: Open Glossary** to create or edit the file. JSON is validated against the bundled schema.

## Caching and cost control

Translations are cached in memory and on disk under extension global storage (`cache/v2`). Keys include source text, target language, model, prompt version, `baseUrl`, and a hash of `llm.extraBody` (since 0.4.3). See [Caching](../explanation/caching.md) and [Clear cache](../how-to/cache.md).

After five consecutive auth/network/server failures, interactive translation pauses for 60 seconds until you set a new API key or errors clear (`TranslationService.resetPause`).

## Workspace enable/disable

- **LinguaLens: Disable for Workspace** sets `enabled` false for the first workspace folder.
- **LinguaLens: Enable for Workspace** clears the folder override.

Resource-scoped `aiTranslate.enabled` still applies per file pattern if you use finer control.

## Diagnostics and logs

- **LinguaLens: Show Log** opens the output channel; level from `aiTranslate.log.level` (default `info`).
- Status bar reflects enabled state, target language, and key presence.

## Where to go next

| Goal | Guide |
|------|--------|
| Wire DeepSeek, Qwen, Doubao, OpenAI | [Configure providers](../how-to/configure-providers.md) |
| Disable provider “thinking” extra fields | [Extra body and thinking](../how-to/extra-body-thinking.md) |
| Markdown frontmatter titles | [Frontmatter](../how-to/frontmatter.md) |
| Force translate already-Chinese docs | [Force translate](../how-to/force-translate.md) |
| Git commit lines | [Git translate](../how-to/git-translate.md) |
| Connection errors | [Troubleshoot connection](../how-to/troubleshoot-connection.md) |
| Architecture overview | [Architecture](../explanation/architecture.md) |
| All settings | [Settings reference](../reference/settings.md) (generated) |
| All commands | [Commands reference](../reference/commands.md) (generated) |

## Common pitfalls at setup time

- **Empty model:** `LlmClient` rejects requests with “Model name is not configured” until `aiTranslate.llm.model` is set.
- **Wrong key for endpoint:** Keys are per `baseUrl` origin; switching providers requires **Set API Key** again or **Clear API Key**.
- **Hover never appears:** Text may be too short (`detection.minLength`), already in the target language family, excluded by path, or hover toggles (`hover.comments` / `hover.strings`) may be off.
- **Document command missing:** The command is hidden unless the file is markdown/plaintext and not already an `aitranslate:` preview.
- **Virtual workspaces:** Whole-document features are limited; hover and selection remain available per `package.json` capabilities.

Once hover and **Test Connection** succeed, you have a working loop: detection → optional cache → LLM → placeholder restore → UI. The rest of the documentation deepens each stage without changing this basic flow.
