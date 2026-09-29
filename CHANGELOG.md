# Changelog

## 0.6.0

- **English-first codebase**: comments, logs, errors, and tests in `src/`, `scripts/`, and `test/` use English; user-facing runtime UI remains in `l10n/` and `package.nls.*`
- **Documentation**: Diátaxis bilingual docs under `docs/en/` and `docs/zh-CN/` (tutorials, how-to, reference, explanation), plus `CONTRIBUTING` / `SECURITY` in EN and zh-CN
- **Generated settings reference** from `contributes/configuration.json` + nls (`scripts/generate-settings-reference.mjs`) with sync test
- **Quality**: CJK-in-`src/` guard test (allowlist for native language labels); docs parity and link resolution tests
- **README**: English default (`README.md`) and `README.zh-CN.md` with language switcher

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
