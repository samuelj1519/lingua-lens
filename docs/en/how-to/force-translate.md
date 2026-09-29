# Force translate documents

## Goal

Translate Markdown or plain-text documents even when language detection concludes that segments are already in the target language family, or when the document gate would otherwise show “already target language” and refuse to open a preview.

## Prerequisites

- Understanding of [detection](../explanation/detection.md): by default, segments dominated by the target script (e.g. Han characters for `zh-CN`) are skipped.
- LLM configured; document translation prerequisites from [Translate Markdown](./translate-markdown.md).

## When you need force translate

Typical scenarios:

- You want **zh-TW** output but the source is **zh-CN** (same `zh` family — detection treats both as Chinese script).
- Editorial policy requires rephrasing in the target locale despite surface language match.
- Mixed-language docs where detection under-counts translatable prose.
- You are validating prompt or glossary changes on text that would normally skip.

Note: `linguaLens.detection.strictChineseVariant` exists in settings for future simplified/traditional distinction, but **`LanguageDetector.decide` does not implement variant split yet** (see [Detection](../explanation/detection.md)). Force translate is the practical workaround for zh-CN ↔ zh-TW today.

## Step 1: Enable the setting

Resource-scoped (per workspace or folder):

```json
{
  "linguaLens.document.forceTranslate": true
}
```

Default is `false` in `package.json`.

## Step 2: Run document translation

1. Open your `.md` file.
2. Run **LinguaLens: Translate Document**.
3. `isDocumentAlreadyInTargetLanguage(translatableCount, forceTranslate)` returns false when force is true, so preview opens even if every segment would otherwise be skipped.
4. Per-segment planning (`buildDocumentTranslationPlan` + `shouldTranslateDocumentText`) respects force when evaluating whether to batch each segment.

## Step 3: Verify segments are sent to the LLM

- Progress notification should show a non-zero segment count.
- Log at `debug` should show API calls for batches.
- Preview displays new wording; compare with source.

## Step 4: Disable when finished

Force mode increases API cost and can “translate” English comments in a Chinese doc into awkward duplicates. Turn off after bulk jobs:

```json
{
  "linguaLens.document.forceTranslate": false
}
```

## Interaction with hover and selection

`document.forceTranslate` affects **document pipeline only**. Hover and selection still use `decide()` independently. For selection, you always explicitly request translation. For hover, tune `detection.targetRatio`, `minLength`, or skip patterns instead.

## Provider settings (unchanged)

Force translate does not bypass privacy or secrets. Example stack:

```json
{
  "linguaLens.document.forceTranslate": true,
  "linguaLens.targetLanguage": "zh-TW",
  "linguaLens.llm.baseUrl": "https://api.deepseek.com/v1",
  "linguaLens.llm.model": "deepseek-chat",
  "linguaLens.llm.extraBody": {
    "thinking": { "type": "disabled" }
  }
}
```

## Verification checklist

- [ ] Preview opens without “already target language” hint.
- [ ] `totalTranslatable` in session is greater than zero.
- [ ] Cached entries update when text changes (refresh with bypass if needed).

## Pitfalls

| Pitfall | Detail |
|---------|--------|
| Redundant API spend | Every segment may translate including already-native prose. |
| Glossary required for terms | Without glossary, proper nouns may be transliterated differently pass to pass. |
| Identity skip still applies | `isSameTranslationAsSource` can skip caching when model returns unchanged text. |
| Not for code files | Force flag does not enable document mode on `.ts` files. |
| strictChineseVariant | Setting alone does not change behavior until implemented in `decide()`. |

## Selection and hover contrast

Force translate never disables `PrivacyGuard` path excludes or privacy acknowledgment. For hover on code comments that detection skips because they are already English while your target is `en`, the issue is not force translate — lower `detection.minLength` or add a skip pattern exception instead.

## Related documentation

- [Detection](../explanation/detection.md)
- [Translate Markdown](./translate-markdown.md)
- [Locales](../reference/locales.md)
