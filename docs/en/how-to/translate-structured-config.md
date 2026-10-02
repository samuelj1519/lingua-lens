# Translate structured config files (JSON, YAML, TOML, XML, INI)

## Goal

Translate human-readable **string values** in config and data files while keeping syntax, keys, comments, and formatting byte-identical except for replaced string contents.

## Supported formats

| Format | Extensions / language id |
| --- | --- |
| JSON / JSONC | `.json`, `.jsonc`, `json`, `jsonc` |
| YAML | `.yaml`, `.yml`, `yaml` |
| TOML | `.toml`, `toml` |
| XML | `.xml`, `.plist`, `xml` |
## Entry points (same as Markdown)

- **LinguaLens: Translate Document** (title bar globe, CodeLens, Explorer context menu, `Ctrl+Alt+Shift+D`).
- **LinguaLens: Generate Side File** for a translated on-disk copy.
- **LinguaLens: Refresh Document Translation** from the source editor.

## Preview behavior

Structured previews reuse the **same translation session** as side-file export. The `lingualens:` document shows a **valid copy of the source format** with translated string values filled in as segments complete (no Markdown bilingual wrapper), so JSON/YAML remain parseable during translation.

## What is translated

- JSON/JSONC/TOML/YAML: **string values** only.
- XML: text between tags; attribute values only when they look like human text (not `href`, `id`, `class`, etc.).
- **Comments are not translated** (they are developer metadata; translating them risks breaking tooling and mixed-language diffs).

## Skipped values

URLs, file paths, semver, hex colors, UUIDs, plain numbers, and identifier-like tokens are not sent to the model.
