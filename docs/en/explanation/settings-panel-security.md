# Settings panel security

The **AI Translate: Open Settings Panel** command opens a Webview-based UI (`SettingsPanelController` + `settingsPanel/webview/main.ts`) for editing many `aiTranslate.*` keys without hand-editing JSON. This page explains how that UI is hardened and what secrets it never touches.

## Threat model (practical)

The webview runs in an isolated context with HTML served from the extension. Risks to mitigate:

1. **Cross-site scripting** if untrusted content could execute scripts.
2. **API key exfiltration** via DOM or postMessage leaks.
3. **Over-privileged resource loading** (remote scripts, iframes).

The panel is a local settings form, not a general browser — attack surface is small but we still apply CSP and keep secrets in the extension host.

## Content Security Policy

`panelHtml.ts` generates HTML with a per-session **nonce**:

```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
```

Implications:

- **default-src 'none'** — blocks images, fonts, and frames unless explicitly allowed (they are not).
- **style-src 'unsafe-inline'** — inline CSS in the template is permitted (VS Code theme variables).
- **script-src 'nonce-…'** — only the bundled script tag with matching nonce runs.

The extension sets `localResourceRoots` on the webview (controller) so script URIs resolve only to packaged extension files.

## API keys stay out of the webview

User API keys are stored via `ApiKeyStore` → VS Code `SecretStorage`, keyed by LLM origin.

The settings panel:

- Does **not** render an API key field.
- Does **not** pass keys in `postMessage` payloads.
- Directs users to command **AI Translate: Set API Key** (password input box in native UI).

`testConnection` runs in the extension host after reading the secret there; only success/error strings return to the webview.

This matches the product expectation: webviews are harder to audit than SecretStorage prompts.

## Message protocol

Typed messages in `settingsPanel/protocol.ts`:

- Webview → extension: `update` with key/value, `testConnection`, `setScope`, extra body templates, etc.
- Extension → webview: `state` snapshot, `extraBodyError`, test results.

Allowed configuration keys are whitelisted (`PANEL_CONFIG_KEYS`); arbitrary keys cannot be written from the webview.

`llm.extraBody` updates parse JSON in the host (`parseExtraBodyJson`); malformed JSON never partially corrupts stored object without error feedback.

## Extra body and headers

`extraBody` is visible in the panel as JSON text — it may contain non-secret provider flags only. Do not place API keys in `extraBody` or `extraHeaders`; use **Set API Key** and official header mechanisms.

## Scope bar

User vs Workspace scope toggles determine `ConfigurationTarget` for updates. Workspace writes require a workspace folder; the controller resolves folder URI safely.

## Comparison to core Settings UI

**AI Translate: Open Settings** opens VS Code’s native settings editor (`@ext:…`). That editor also does not display SecretStorage keys. The webview panel adds templates (DeepSeek/Qwen extra body) and grouped fields.

## Trust and workspace folders

Opening a malicious workspace cannot execute arbitrary code in the panel without a compromised extension binary, because the webview only loads extension-packaged JavaScript. Still follow normal VS Code guidance: trust workspace authors before enabling full features, especially when workspace settings override `llm.baseUrl` to an attacker-controlled host — the extension would send your translated text there once you acknowledge privacy and supply a key.

The panel’s `testConnection` button triggers the same host-side code path as the palette command; results are status strings only, never raw HTTP bodies containing provider error stacks with embedded credentials.

## Related documentation

- [Configure providers](../how-to/configure-providers.md)
- [Extra body](../how-to/extra-body-thinking.md)
- [Architecture](./architecture.md)
