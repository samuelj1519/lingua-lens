# AI Translate (cursor-ai-translate)

English | [简体中文](README.zh-CN.md)

Translate code comments, string literals, and Markdown/plain-text docs in Cursor / VS Code using an OpenAI-compatible LLM. API keys are stored only in VS Code **SecretStorage**, never in `settings.json`.

The repository root is the extension source tree.

## Features

- **Hover translation** for code, config files, and documents; optional diagnostic and symbol-doc blocks
- **Config-file hovers** for YAML, TOML, JSON/JSONC/JSON5, INI, XML, `.properties`, and `key=value` files
- **Selection, terminal, and clipboard** translation with keybindings
- **Whole-document preview** on the `aitranslate:` virtual URI with side-file export (e.g. `README.zh-CN.md`)
- **Git** commit-message hovers and SCM input helpers
- **Glossary**, **LRU + disk cache**, privacy guards, and a **settings webview**

<!-- TODO: add screenshot or GIF of hover + document preview -->

## Quick start

1. Build or install the `.vsix` (`npm run package`).
2. Run **AI Translate: Set API Key**.
3. Set `aiTranslate.llm.baseUrl` and `aiTranslate.llm.model` (see [Configure providers](docs/en/how-to/configure-providers.md)).
4. Hover a comment or run **Translate document (preview)** on a Markdown file.

Full walkthrough: [Getting started](docs/en/tutorials/getting-started.md).

## LLM providers

OpenAI-compatible `POST /chat/completions` endpoints work out of the box (OpenAI, DeepSeek, Qwen/DashScope, Doubao, etc.). Use `aiTranslate.llm.extraBody` to disable “thinking” modes when your provider supports it—see [extraBody how-to](docs/en/how-to/extra-body-thinking.md).

## Commands and settings

| Resource | Link |
| --- | --- |
| Settings reference | [docs/en/reference/settings.md](docs/en/reference/settings.md) (auto-generated) |
| Commands | [docs/en/reference/commands.md](docs/en/reference/commands.md) |
| All documentation | [docs/README.md](docs/README.md) |

## FAQ and troubleshooting

- **Nothing on hover?** Check `aiTranslate.enabled`, file exclusions, and privacy acknowledgement.
- **Connection errors?** Use **Test connection** and see [troubleshoot connection](docs/en/how-to/troubleshoot-connection.md).
- **Already in target language?** Detection skips segments; use selection translate or `aiTranslate.document.forceTranslate`.

## Privacy and security

The extension sends text you hover or translate to the configured LLM endpoint. Keys live in SecretStorage per API origin. Disk cache is stored under the extension global storage path. Details: [SECURITY.md](SECURITY.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Design notes: [docs/DESIGN.md](docs/DESIGN.md), [docs/DECISIONS.md](docs/DECISIONS.md).

## License

MIT — see [LICENSE](LICENSE).
