# Changelog

## 0.7.1

- **Reasoning / token budget errors**: detect empty `content` with `reasoning_content` or `finish_reason: length` (streaming and non-streaming) and surface a localized `reasoningBudget` error with actions to open `linguaLens.llm.extraBody` or apply the DeepSeek disable-thinking preset
- **Interactive completion floor**: hover/selection requests use at least 1024 completion tokens when thinking is not explicitly disabled in `extraBody`, still bounded by `linguaLens.llm.maxTokens`
- **LLM failure logging**: structured lines in the LinguaLens output channel (feature, model, host, HTTP status, `finish_reason`, token usage, error kind) without prompts or secrets
- **DeepSeek hint**: one-time suggestion when `baseUrl` host is `api.deepseek.com` and `extraBody` has no `thinking` key, with Apply / Don't ask again (`globalState`)

## 0.7.0

- Renamed from **cursor-ai-translate** / **AI Translate** to **LinguaLens** (`lingua-lens`, **`samuel-j.lingua-lens`**); settings, commands, and preview scheme use **`linguaLens.*`** / **`lingualens:`**

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
