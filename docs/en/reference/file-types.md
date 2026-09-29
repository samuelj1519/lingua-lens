# File types and language support

LinguaLens treats **code**, **config**, **Markdown/plain documents**, and **Git messages** differently. This reference lists what the extension extracts for hover/selection and what supports whole-document translation.

## Whole-document translation

| Language ID | Extensions (typical) | Segmenter |
|-------------|----------------------|-----------|
| `markdown` | `.md`, `.markdown` | `MarkdownSegmenter` (structure + frontmatter) |
| `plaintext` | `.txt` | `PlainTextSegmenter` (paragraphs) |

Commands and menus gate on `resourceLangId == markdown || plaintext` or extension regex `\.(md|markdown|txt)$`.

Virtual preview URIs use scheme `aitranslate:` — not translatable as source.

## Tree-sitter hover languages

`LANGUAGE_SPECS` in `src/parsing/languages/specs.ts` defines grammars bundled under `dist/wasm/`:

| VS Code `languageId` | WASM grammar | Comments | Strings / templates |
|----------------------|--------------|----------|---------------------|
| `typescript` | tree-sitter-typescript | yes | strings, template_string |
| `typescriptreact` | tree-sitter-tsx | yes | strings, templates |
| `javascript` | tree-sitter-javascript | yes | strings, templates |
| `javascriptreact` | tree-sitter-javascript | yes | strings, templates |
| `python` | tree-sitter-python | yes | strings, concatenated_string |
| `rust` | tree-sitter-rust | line/block | string_literal, raw_string_literal |
| `go` | tree-sitter-go | yes | interpreted/raw string literals |
| `java` | tree-sitter-java | yes | string_literal, text_block |
| `c` | tree-sitter-c | yes | string_literal |
| `cpp`, `cuda-cpp` | tree-sitter-cpp | yes | string_literal, raw_string_literal |
| `yaml` | tree-sitter-yaml | yes | scalars + mapping pairs |
| `toml` | tree-sitter-toml | yes | strings + pairs |
| `json` | tree-sitter-json | no | strings + pairs |
| `jsonc` | tree-sitter-json | no | strings + pairs |
| `json5` | tree-sitter-json | no | strings + pairs |

If `getSpec(languageId)` returns undefined, tree-sitter string/comment hover may not run for that id (other extractors may still apply).

### Parser limits

- `aiTranslate.parser.maxFileSizeKB` (default 1024) — files larger than this skip tree-sitter parsing for hover extraction.
- WASM loaded once per grammar; `ParserService` releases on document close.

### JSX / TSX

Decision D9: **JSX text nodes are not translated** by default (only comments and strings in TSX/JSX grammars).

## Config file hover

`configLanguages.ts` extends detection beyond strict `languageId`:

**Language IDs:** `yaml`, `toml`, `json`, `jsonc`, `json5`, `ini`, `properties`, `xml`, `editorconfig`.

**Extension fallback:** `.json`, `.jsonc`, `.json5`, `.yaml`, `.yml`, `.toml`, `.ini`, `.cfg`, `.conf`, `.properties`, `.props`, `.xml`, `.editorconfig`, `.env.example`.

When `aiTranslate.hover.configKeys` is true, structured key/value extraction runs with format-specific pair node types from specs (YAML mappings, TOML pairs, JSON pairs).

## Other hover sources

Controlled by `aiTranslate.hover.*` toggles:

| Toggle | Source |
|--------|--------|
| `comments` | Line/block/doc comments via tree-sitter |
| `strings` | String literals and templates |
| `documents` | Markdown/plain segment at cursor |
| `configKeys` | Config files as above |
| `diagnostics` | Linter/compiler messages |
| `symbolDocs` | Symbol documentation |
| `gitCommitMessage` | Git-associated lines |
| `selection` | Selection-specific hover provider |

Max length per hover: `aiTranslate.hover.maxChars` (default 4000).

## Privacy exclusions

Default `aiTranslate.privacy.exclude` globs include `.env`, keys, `node_modules`, `.git`, `secrets/**`, etc. Files matching are blocked in `PrivacyGuard.check()` for translation commands and hovers.

Allowed URI schemes: `aiTranslate.privacy.allowedSchemes` (default `file`, `untitled`, `vscode-remote`, `vscode-notebook-cell`).

## Locale file generation

**LinguaLens: Generate Locale File** operates on the active editor URI (often JSON/JSONC locale bundles). It uses translation services to produce localized string files — pair with glossary for product terminology.

## Virtual and untrusted workspaces

- **Virtual workspaces:** document translation limited; hover/selection per capability flag.
- **Untrusted workspaces:** glossary path and custom `detection.skipPatterns` restricted; other features may run with warnings.

## Choosing file types for your workflow

| Workflow | Recommended file setup |
|----------|-------------------------|
| Code review comments | Open source in supported language id |
| README translation | `markdown` + Translate Document |
| Release notes plain text | `plaintext` or rename to `.md` for structure |
| Config review | Open as yaml/json with configKeys hover on |
| Secrets | Keep in excluded paths — never translate |

## Related documentation

- [Translate Markdown](../how-to/translate-markdown.md)
- [Architecture](../explanation/architecture.md)
- [Segmentation](../explanation/segmentation.md)
