# Security

English | [简体中文](SECURITY.zh-CN.md)

## Reporting

If you believe you found a security issue, open a private report with the repository owner rather than filing a public issue with exploit details.

## Data sent to LLMs

LinguaLens sends text you explicitly hover, select, or translate (comments, strings, document segments, Git messages, etc.) to the HTTP endpoint configured in `aiTranslate.llm.baseUrl`. It does not upload your whole workspace.

## Secrets

- API keys are stored in VS Code **SecretStorage**, keyed by API origin.
- `aiTranslate.privacy.blockSecrets` tries to block obvious secrets from being sent.
- `.env` and excluded globs are not translated.

## Settings webview

The settings panel uses a strict CSP and does not embed API keys in HTML.

## Cache

Disk cache holds translation results under the extension global storage directory. Use **Clear cache** to remove it.
