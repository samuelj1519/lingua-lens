# Architecture decision records

This document mirrors and extends `docs/DECISIONS.md` for English readers. Status notes reflect the current codebase.

| ID | Topic | Decision | Status |
|----|-------|----------|--------|
| D1 | Publisher ID | `cursor-ai-translate` | Active |
| D2 | Minimum VS Code | `^1.85.0` (logged at activation) | Active |
| D3 | Language ID library | `tinyld` for Latin/Cyrillic long text only | Active |
| D4 | Parser WASM | `tree-sitter-wasms` + `web-tree-sitter`, copied to `dist/wasm/` | Active |
| D5 | Incremental parse | Dirty flag → full re-parse of file URI | Active |
| D6 | Hover command trust | VS Code 1.85+ `MarkdownString` command whitelist | Active |
| D7 | Cache key includes `baseUrl` | Originally **excluded** | **Superseded** |
| D8 | `strictChineseVariant` | Not implemented in `decide()`; zh-CN/zh-TW share `zh` family | Active |
| D9 | JSX text nodes | Default **do not translate** | Active |
| D10 | Document preview | Virtual `aitranslate:` URI, not Webview | Active |
| D11 | Long selection output | Virtual Markdown document beside editor | Active |

## D7 (superseded): Cache key and endpoint

**Original (DECISIONS.md):** Cache keys did not include `baseUrl`, aligned with early design doc Q7.

**Current (≥ 0.4.3):** `CacheService.key` and `TranslationService.cacheKey` include:

- `baseUrl` (full string)
- `extraBodyHash` (SHA-256 prefix of serialized `llm.extraBody`)

**Rationale for change:** Switching provider URL or thinking-related body fields must not serve translations produced by a different backend or request shape. Disk cache lives in global storage across projects; collision without `baseUrl` caused stale wrong-language-model pairs.

**Migration:** Old cache entries under `cache/v2` simply age out or users run **Clear Cache**. No schema migration required — key hash domain changed.

## D8: Chinese variants

Configuration exposes `aiTranslate.detection.strictChineseVariant` for future simplified/traditional handling. `LanguageDetector.decide()` does not branch on it today. Both `zh-CN` and `zh-TW` targets use Han script statistics under family `zh`. Users who need conversion between variants should use `document.forceTranslate` or explicit selection translate until variant logic ships.

## D10: Why virtual documents for preview

Webviews excel at rich HTML but complicate diffing, accessibility, and editor keybindings. A `TextDocumentContentProvider` keeps preview text in the normal editor model (read-only virtual URI), supports refresh commands in the title bar, and reuses `BilingualRenderer` string output directly.

## D3: Why tinyld is scoped

Hover must feel instant. Script statistics handle CJK reliably. Calling ML language ID on every mouse move would be expensive; tinyld runs only when Latin/Cyrillic text is long enough (`reliableMinLength`) and script class is ambiguous.

## D5: Parser incrementality

True incremental tree-sitter edits are complex with WASM bundling. MVP marks buffers dirty on `onDidChangeTextDocument` and re-parses on next extract. Acceptable for typical file sizes under `parser.maxFileSizeKB`.

## Process

New decisions should append rows here and to `docs/DECISIONS.md` (Chinese table) when behavior changes. Superseded rows stay for history with strikethrough context in prose.

## Open questions (not yet ADRs)

Future ADRs may cover: true incremental tree-sitter without full re-parse, OpenCC post-processing for zh variants, JSX text opt-in, and per-URI cache namespaces. Track GitHub issues before relying on these behaviors.

When documenting superseded decisions (like D7), keep the original row in `docs/DECISIONS.md` for Chinese readers but add an English status column here so release notes and migration guides stay aligned without silent behavior changes. Contributors should update both files in the same pull request when behavior changes.

## Related documentation

- [Caching](./caching.md)
- [Detection](./detection.md)
- [Architecture](./architecture.md)
