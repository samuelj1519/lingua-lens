# Target language and UI localization

## Goal

Set the translation target language (`linguaLens.targetLanguage`), understand first-run bootstrap from the editor UI locale, and use localized extension UI strings via the `l10n` bundle.

## Prerequisites

- Extension activated (`initUiL10n` loads `./l10n` from extension path).
- Familiarity with [Locales reference](../reference/locales.md).

## Built-in target languages

Enum from `package.json` / `BUILTIN_TARGET_LANGUAGES`:

`zh-CN`, `zh-TW`, `en`, `ja`, `ko`, `fr`, `de`, `es`, `ru`.

Prompts and detection families map variants (e.g. both Chinese targets share `zh` family for script statistics).

## Step 1: Change target language in the status bar

1. Click the language segment on the status bar (**LinguaLens: Select Target Language**).
2. Pick a language from the quick pick.
3. `config.onDidChange` for `targetLanguage` resets UI l10n cache, refreshes CodeLens, status bar, and all `lingualens:` previews.

## Step 2: Change target in settings JSON

Resource scope (per workspace/folder/file overrides supported):

```json
{
  "linguaLens.targetLanguage": "ja"
}
```

## Step 3: First-run Cursor / VS Code UI bootstrap

On first activation, if `targetLanguage` was **never** set at global, workspace, or folder level:

1. `applyTargetLanguageCursorUiBootstrap` runs once (`CURSOR_UI_BOOTSTRAP_STATE_KEY` in global state).
2. `mapVscodeUiLanguageToTarget(vscode.env.language)` chooses the target.
3. English UI (`en`, `en-US`, …) maps to target **`en`**, not `zh-CN`.
4. Unmatched UI locales fall back to **`en`**.

A one-time hint may be stored (`CURSOR_UI_BOOTSTRAP_HINT_KEY`) for the settings panel locale message.

If you already have any layer’s `targetLanguage` defined, bootstrap does not overwrite it.

## Step 4: Settings panel language control

**LinguaLens: Open Settings Panel** shows native labels (`TARGET_LANGUAGE_NATIVE_LABELS`):

- 简体中文 → `zh-CN`
- 繁體中文 → `zh-TW`
- English → `en`
- etc.

Changing the dropdown posts `update` messages to the extension host and writes configuration at the selected scope (User / Workspace).

## Step 5: UI strings vs translation target

`initUiL10n(context.extensionPath, () => config.getRawTargetLanguage())` ties bundled UI translations to target language where catalog entries exist. Command titles in the palette use `%command.*%` NLS keys from `package.json`.

Extension UI language follows target selection for in-extension messages (`t('…')` keys), not VS Code’s display language — except the one-time bootstrap default.

## Step 6: Verify

- Status bar shows selected code (e.g. `ZH-CN`).
- Hover translates **into** that language from detected source families.
- Document preview URI includes `lang=` query matching target.
- Side file pattern `${lang}` expands to target code.

## strictChineseVariant (future behavior)

```json
{
  "linguaLens.detection.strictChineseVariant": false
}
```

Documented for distinguishing simplified vs traditional in detection. **Current `decide()` does not read this flag for variant split**; use `forceTranslate` or manual target choice for zh-CN vs zh-TW workflows today.

## Pitfalls

| Pitfall | Detail |
|---------|--------|
| Bootstrap surprised English target | Fresh install on English UI sets `en` automatically once. |
| Workspace override ignored | Check folder-level settings in multi-root workspaces. |
| Preview lang stale | Change target → previews refresh via config listener. |
| zh-CN vs zh-TW | Detection skips both as `zh` family; see [Force translate](./force-translate.md). |
| Invalid enum | Settings UI restricts enum; manual JSON must use exact codes. |

## Multi-root workspaces

When multiple folders are open, `linguaLens.targetLanguage` can differ per folder via `.vscode/settings.json` in each root. The status bar reflects the active editor’s resolved configuration (`ConfigService.get(uri)`). Switching editors may change the displayed target without a manual picker action — this is expected VS Code configuration inheritance, not a bug in the extension.

## Related documentation

- [Locales](../reference/locales.md)
- [Detection](../explanation/detection.md)
- [Getting started](../tutorials/getting-started.md)
