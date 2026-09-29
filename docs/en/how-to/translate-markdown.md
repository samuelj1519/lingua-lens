# Translate Markdown documents

## Goal

Translate a Markdown file in the editor with segment-aware batching, a live `aitranslate:` preview beside the source, and optional export to a side file on disk.

## Prerequisites

- LLM configured and API key set ([Configure providers](./configure-providers.md)).
- Active document language id `markdown` or `plaintext` (plain text uses paragraph segmentation only).
- File not excluded by `aiTranslate.privacy.exclude`.
- Privacy acknowledged when prompted.

## Step 1: Open the source document

Open `*.md`, `*.markdown`, or a plaintext file. The extension does not offer whole-document translation for code files through this pipeline (use hover/selection there).

## Step 2: Start the preview

Choose one entry point:

1. **AI Translate: Translate Document** (Command Palette or `Ctrl+Alt+Shift+D` / `Cmd+Alt+Shift+D`).
2. Editor title bar **globe** icon (when not already in preview).
3. Explorer context menu on `.md` / `.txt`.

`DocTranslationService.openPreview`:

- Segments the document (`MarkdownSegmenter` or `PlainTextSegmenter`).
- Builds a translation plan per segment (`buildDocumentTranslationPlan`).
- If no segments need translation and `forceTranslate` is false, shows “already target language” hint and stops.
- Opens virtual URI `aitranslate:/{basename}.{lang}.preview.md?source=…&lang=…` in a column beside the source.

## Step 3: Wait for segment progress

Translation runs in the background with progress notifications (`DocumentSegmentProgressReporter`). Segments batch through `TranslationService.translateBatch` with size `aiTranslate.document.batchSize` (default 8) and character limits `maxBatchChars`.

Results render through `BilingualRenderer` and `PreviewContentProvider` using `aiTranslate.document.previewStyle`:

- **`interleaved`** — translation blocks inserted near source structure.
- **`append`** — translations grouped after source blocks.

## Step 4: Refresh when the source changes

- Edit the **source** file, then run **AI Translate: Refresh Document Translation** on the source editor to re-segment and translate (may open preview if session missing).
- In the **preview** tab, use the title bar **refresh** (**AI Translate: Refresh Preview**) to re-read source, optionally **bypass cache** (`invalidateDocumentSegmentCaches` + new API calls).

`aiTranslate.document.autoRefresh` (advanced, default false) can tie refresh to edits when enabled.

## Step 5: Export a side file (optional)

1. Run **AI Translate: Generate Side File** from source editor or explorer.
2. If no session exists, the extension starts one and waits for translation.
3. Output path uses `aiTranslate.document.sideFileNamePattern` (default `${fileBasenameNoExtension}.${lang}${fileExtname}` → `readme.zh-CN.md`).
4. Content mode `aiTranslate.document.sideFileContent`: `translated` or `bilingual`.

## Step 6: CodeLens (optional)

When `aiTranslate.document.codeLens` is true, CodeLens above the document offers quick actions aligned with translate/refresh commands.

## Settings reference (document section)

```json
{
  "aiTranslate.document.previewStyle": "interleaved",
  "aiTranslate.document.batchSize": 8,
  "aiTranslate.document.maxBatchChars": 4000,
  "aiTranslate.document.codeLens": true,
  "aiTranslate.document.forceTranslate": false,
  "aiTranslate.document.sideFileNamePattern": "${fileBasenameNoExtension}.${lang}${fileExtname}",
  "aiTranslate.document.sideFileContent": "translated"
}
```

## Verification

- Preview tab scheme is `aitranslate`.
- Translated paragraphs appear for foreign-language sections; code fences and many structural elements stay preserved (see [Segmentation](../explanation/segmentation.md)).
- Log shows `apiCalls` incrementing; repeat preview without edits should hit cache ([Cache](./cache.md)).

## Pitfalls

| Pitfall | Detail |
|---------|--------|
| “Markdown only” warning | `canTranslateWholeDocument` rejects non-markdown/plaintext. |
| Nothing to translate | Detection marks all segments as target language; enable [force translate](./force-translate.md) or change target. |
| Partial table/list failures | Lists may fall back to per-line mode (`list-lines` plan); large tables are preserved containers. |
| JSON batch errors | Model must return id→text JSON for batches; tune model or `llm.jsonMode`. |
| Huge files | Parser obeys `aiTranslate.parser.maxFileSizeKB` for tree-sitter hovers; document path reads full text — very large files may be slow or memory-heavy. |
| Preview closed | Closing preview document calls `onClosePreview`; reopen with Translate Document. |

## Related documentation

- [Frontmatter](./frontmatter.md)
- [Force translate](./force-translate.md)
- [Architecture — document pipeline](../explanation/architecture.md)
