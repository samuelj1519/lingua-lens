# Changelog

## 0.7.7

- **API key reads**: “configured” state for the status bar and settings panel uses `globalState` flags per LLM origin, synced on set/clear and reconciled at activation via `SecretStorage.keys()` (no secret values read). `get()` is only used when issuing an LLM request.
- **Redaction**: removed bulk `getAllStoredValues()`; LLM errors are redacted with the request-scoped key before `LlmError` is thrown. Logs, toasts, and hovers use pattern-only redaction (`Bearer`, `Authorization`, credential assignments) without reading SecretStorage.
- **Logging**: output-channel logging is synchronous again (no per-line async SecretStorage access).

## 0.7.6

- **API keys**: stored only in VS Code `SecretStorage`. LinguaLens reads a key only when you set or clear it (commands and settings panel) and when issuing an LLM request (`Authorization` header). Request headers and bodies are not written to logs.
- **Safe output**: toasts, hovers, the output channel, connection-test results, and LLM error text run through redaction so stored key values (including URL-encoded forms), `Bearer`/`Authorization` values, and common `key=value` patterns are not shown.
- **No content secret scanning**: comments, selections, and documents are translated without heuristic “looks like a key” checks; there is no `linguaLens.privacy.blockSecrets` setting. Use `linguaLens.privacy.exclude` for sensitive paths (`.env`, keys, etc.).

## 0.7.2

- **Document preview URI**: `DocTranslationService.previewUriFor` now uses the `lingualens:` scheme (via `PREVIEW_SCHEME`), matching the registered `TextDocumentContentProvider` — fixes “Unable to resolve resource” when opening Translate document preview
- **Preview eligibility**: preview virtual documents are excluded from whole-document translation using the same scheme constant
- **Cleanup**: rename integration-test env vars to `LINGUALENS_INTEGRATION_TEST` / `LINGUALENS_MOCK_PORT`; LinguaLens naming for quick-pick and hover marker helpers; legacy `aitranslate` references removed outside CHANGELOG

## 0.7.1

- **Reasoning / token budget errors**: detect empty `content` with `reasoning_content` or `finish_reason: length` (streaming and non-streaming) and surface a localized `reasoningBudget` error with actions to open `linguaLens.llm.extraBody` or apply the DeepSeek disable-thinking preset
- **Interactive completion floor**: hover/selection requests use at least 1024 completion tokens when thinking is not explicitly disabled in `extraBody`, still bounded by `linguaLens.llm.maxTokens`
- **LLM failure logging**: structured lines in the LinguaLens output channel (feature, model, host, HTTP status, `finish_reason`, token usage, error kind) without prompts or secrets
- **DeepSeek hint**: one-time suggestion when `baseUrl` host is `api.deepseek.com` and `extraBody` has no `thinking` key, with Apply / Don't ask again (`globalState`)

## 0.7.0

- Renamed from **cursor-ai-translate** / **AI Translate** to **LinguaLens** (`lingua-lens`, **`samuel-j.lingua-lens`**); settings and commands use **`linguaLens.*`** (preview scheme completed in **0.7.2**)

## 0.6.1

- Packaging: exclude `README.zh-CN.md`, `CONTRIBUTING*.md`, and `SECURITY*.md` from the VSIX (root `README.md`, `CHANGELOG.md`, and `LICENSE` still ship)
- Tests: extend `vsix-contents` to assert the above inclusion and exclusion rules

## 0.6.0

- **English-first codebase**: comments, logs, errors, and tests in `src/`, `scripts/`, and `test/` use English; user-facing runtime UI remains in `l10n/` and `package.nls.*`
- **Documentation**: full Diátaxis bilingual docs under `docs/en/` and `docs/zh-CN/` (substantive tutorials, how-to, explanation, and reference pages); legacy `DESIGN.md` / `DECISIONS.md` folded into explanation + ADR `decisions.md`
- **Generated reference**: settings (`generate-settings-reference.mjs`) and commands (`generate-commands-reference.mjs`) with sync tests; README landing pages in EN and zh-CN
- **Quality**: CJK guards for `src/`, `scripts/`, and `test/`; docs parity, link resolution, and minimum page length tests

## 0.5.3

- Packaging: VSIX excludes `dist/**/*.map`, `contributes/`, and `out/`; settings panel counts keys from merged `package.json`
- Tests: extended `vsix-contents` assertions

## 0.5.2

- Settings panel language dropdown syncs with `aiTranslate.targetLanguage`; extension-owned UI uses `t()` + `l10n/bundle.l10n.*`
- Bootstrap `targetLanguage` from `vscode.env.language` when unset
- Skip opening preview/side file when no segments need translation (`doc.alreadyTarget` status message)

## 0.5.1

- Reorganized i18n sources under `i18n/`; runtime bundles in `l10n/`
- VSIX content validation test; `opencc-js` devDependency

## 0.5.0

- Broad `package.nls` locales; settings webview (`aiTranslate.openSettingsPanel`)

## 0.4.6

- Document translation uses the same language detection as hover; `aiTranslate.document.forceTranslate`
- Segment-based progress notifications

## 0.4.5

- Grouped settings UI; `contributes/configuration.json` source + nls tests

## 0.4.4

- Markdown frontmatter field translation; `aiTranslate.markdown.frontmatterFields`

## 0.4.3

- Hover refresh actions; cache key improvements; SSE `delta.text` support

## 0.4.2

- List/table/blockquote container translation; structure validation

## 0.4.1

- Git blame hover; `extraBody` / `stream`; document preview assembly fixes

## 0.4.0

- Notebook Markdown cells; HTML/Vue/JSX attribute hovers; variable naming helper

## 0.3.0

- Git commit/SCM translation; `generateLocaleFile`

## 0.2.0

- Diagnostic and symbol-doc hover blocks; clipboard/terminal translation

## 0.1.1

- Hover selector fix; config-file hovers; document paragraph hovers

## 0.1.0

- Initial release: hover, selection, document preview, glossary, cache, privacy
