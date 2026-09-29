# Locales and target languages

LinguaLens uses a fixed set of **target language codes** for LLM prompts, detection families, cache metadata, and side-file naming. UI strings for the extension itself come from the VS Code `l10n` bundle under `./l10n`.

## Built-in target languages

Defined in `BUILTIN_TARGET_LANGUAGES` / `package.json` enum:

| Code | Native label (settings panel) | Detection family (`familyOf`) |
|------|------------------------------|-------------------------------|
| `zh-CN` | 简体中文 | `zh` |
| `zh-TW` | 繁體中文 | `zh` |
| `en` | English | `en` |
| `ja` | 日本語 | `ja` |
| `ko` | 한국어 | `ko` |
| `fr` | Français | `fr` |
| `de` | Deutsch | `de` |
| `es` | Español | `es` |
| `ru` | Русский | `ru` |

Setting: `aiTranslate.targetLanguage` (resource scope, default `zh-CN` in schema).

### Prompt behavior

`PromptBuilder` includes target language in system/user messages for all kinds: `hover`, `selection`, `documentBatch`, `documentFrontmatterBatch`. Changing target changes `promptVersion` and cache keys.

### Side files and preview URIs

- Preview query: `lang={target}` on `aitranslate:` URIs.
- `aiTranslate.document.sideFileNamePattern` variable `${lang}` expands to the code (e.g. `readme.zh-CN.md`).

## UI locale vs target language

Two related concepts:

1. **VS Code / Cursor UI locale** — `vscode.env.language` (e.g. `en-US`, `zh-cn`).
2. **Translation target** — where hover/document output should go.

### First-run bootstrap

If the user has never set `targetLanguage` at any configuration layer, `applyTargetLanguageCursorUiBootstrap` runs **once** and writes global `targetLanguage` from UI locale via `mapVscodeUiLanguageToTarget`:

| UI locale pattern | Default target |
|-------------------|----------------|
| `zh-cn`, `zh-hans`, `zh` | `zh-CN` |
| `zh-tw`, `zh-hk`, `zh-hant` | `zh-TW` |
| `ja*` | `ja` |
| `ko*` | `ko` |
| `fr*`, `de*`, `es*`, `ru*` | matching code |
| `en`, `en-*` | `en` |
| anything else | `en` |

English UI therefore defaults target to **English**, not Chinese.

After bootstrap, `CURSOR_UI_BOOTSTRAP_STATE_KEY` prevents repeat. Users can change target anytime; bootstrap does not re-run.

### Extension UI strings (`l10n`)

`initUiL10n(extensionPath, getRawTargetLanguage)` loads translated package strings for commands and messages where catalog entries exist. `resetUiL10nCache()` runs when `targetLanguage` changes.

Command titles in `package.json` use `%command.*%` keys resolved by VS Code NLS merge (`merge-nls.mjs` at build).

## Chinese variants and detection

Both `zh-CN` and `zh-TW` share the `zh` **family** in `LanguageDetector`. Han-heavy text is often **skipped** as already Chinese when targeting either variant.

`aiTranslate.detection.strictChineseVariant` is reserved for future variant-specific skip logic; **`decide()` does not implement it yet**. For zh-CN ↔ zh-TW document conversion, use `aiTranslate.document.forceTranslate` (see [Force translate](../how-to/force-translate.md)).

## Latin target languages

`en`, `fr`, `de`, `es` share Latin script heuristics; tinyld disambiguates longer text. Short identifiers may skip as `unreliableShort`.

## Cyrillic

`ru` target uses Cyrillic script stats and tinyld with candidate `['ru']`.

## CJK targets

`ja`, `ko`, `zh-*` use `targetRatio` against Han/kana/hangul counts — high ratio skips translation as already target-like.

## Workspace overrides

`targetLanguage` is resource-scoped:

```json
// .vscode/settings.json
{
  "aiTranslate.targetLanguage": "de"
}
```

Multi-root: per-folder settings override per-repo targets (e.g. docs repo → `en`, app repo → `zh-CN`).

## Status bar and quick pick

`StatusBarController.pickLanguage()` offers the same enum as settings. Display uses short codes or localized labels depending on theme; underlying value is always a `TargetLang` code.

## Related settings

| Setting | Role |
|---------|------|
| `aiTranslate.targetLanguage` | LLM output language |
| `aiTranslate.detection.*` | Skip/translate thresholds |
| `aiTranslate.document.forceTranslate` | Bypass “already target” for documents |
| `aiTranslate.statusBar.enabled` | Show language control |

## Related documentation

- [Target language UI](../how-to/target-language-ui.md)
- [Detection](../explanation/detection.md)
- [Getting started](../tutorials/getting-started.md)
