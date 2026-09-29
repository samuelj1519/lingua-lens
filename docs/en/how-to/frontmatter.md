# Translate YAML frontmatter fields

## Goal

Translate human-readable values in Markdown YAML frontmatter (title, description, summary, etc.) while preserving delimiters, keys, and non-translatable structure.

## Prerequisites

- Markdown document with optional `---` / `+++` / `;;;` style frontmatter blocks (detected by `detectFrontmatterBlock`).
- `aiTranslate.markdown.frontmatterFields` lists which keys are candidates for translation.
- Document translation flow started or planned ([Translate Markdown](./translate-markdown.md)).

## Default fields

From `package.json`:

```json
{
  "aiTranslate.markdown.frontmatterFields": [
    "description",
    "title",
    "summary",
    "subtitle",
    "excerpt",
    "about"
  ]
}
```

Add or remove field names (case-sensitive match to parsed YAML keys) for your content system (Hugo, Docusaurus, Astro, etc.).

## Step 1: Structure your frontmatter

Example:

```yaml
---
title: Getting started
description: How to install the extension and connect an API.
---
```

Only **configured fields** become `frontmatter` segments with translatable value ranges. Other keys and punctuation are `preserved` segments.

## Step 2: Segment behavior

`buildFrontmatterSegments` in `frontmatterSegments.ts`:

- Locates the frontmatter block at the top of the file.
- For each configured field present in the block, emits a segment with kind `frontmatter` and a value range excluding quotes when applicable.
- Emits preserved segments for delimiters, keys, colons, and non-listed fields.

Frontmatter batches use cache kind `documentFrontmatterBatch` (distinct prompt version from body `documentBatch`).

## Step 3: Translate via document preview

1. Open the Markdown file.
2. Run **LinguaLens: Translate Document**.
3. Watch frontmatter values translate in the preview while `---` lines and key names stay intact.

Detection still applies: if a field value is already mostly in the target language (e.g. target `zh-CN` and Chinese title), the plan may **skip** that segment unless [force translate](./force-translate.md) is enabled.

## Step 4: Adjust field list for your stack

Blog with custom keys:

```json
{
  "aiTranslate.markdown.frontmatterFields": [
    "title",
    "seoDescription",
    "heroTitle",
    "heroSubtitle"
  ]
}
```

Keep technical ids (`slug`, `layout`, `date`) **out** of the list so they are never sent to the LLM.

## Step 5: Verify output

- Source file on disk is unchanged until you copy from preview or generate a side file.
- Preview shows bilingual or interleaved frontmatter translations.
- Re-run **Refresh Preview** with bypass to pick up glossary or prompt changes.

## Glossary interaction

Workspace glossary terms apply to batch text concatenated for glossary matching in `translateBatch`. Long frontmatter values benefit from consistent terminology entries in `.translate-glossary.json`.

## Pitfalls

| Pitfall | Mitigation |
|---------|------------|
| Field not translated | Key not in `frontmatterFields` or value skipped by detection. |
| Broken YAML | Multiline folded scalars and complex nested YAML may not parse as simple key-value; keep frontmatter flat for best results. |
| Quotes translated | Segmenter targets value ranges; if quotes are inside the value range, model may alter them — use straight quotes in source. |
| TOML frontmatter | Some sites use `+++`; detector supports alternate fences; field list still applies to parsed keys. |
| Cache staleness | Change target language or clear cache after editing frontmatter in preview-only workflow. |

## Example workspace settings for a docs site

If your static site generator stores SEO text only in frontmatter, keep body detection aggressive and list every prose key explicitly:

```json
{
  "aiTranslate.targetLanguage": "en",
  "aiTranslate.markdown.frontmatterFields": [
    "title",
    "description",
    "og_title",
    "og_description",
    "twitter_description"
  ],
  "aiTranslate.document.forceTranslate": false,
  "aiTranslate.llm.baseUrl": "https://api.openai.com/v1",
  "aiTranslate.llm.model": "gpt-4o-mini"
}
```

Run **Generate Side File** after preview if you need committed translated frontmatter in a sibling file rather than copying from the virtual preview.

## Related documentation

- [Translate Markdown](./translate-markdown.md)
- [Segmentation — frontmatter](../explanation/segmentation.md)
- [Detection](../explanation/detection.md)
