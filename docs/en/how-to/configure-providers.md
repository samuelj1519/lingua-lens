# Configure LLM providers

## Goal

Point AI Translate at an OpenAI-compatible chat completions API: set `aiTranslate.llm.baseUrl`, `aiTranslate.llm.model`, store an API key, and optionally tune timeouts, concurrency, and `extraBody` for vendor-specific request fields.

## Prerequisites

- Extension installed and activated (`onStartupFinished`).
- An API key from your provider.
- Network egress allowed from your machine to the provider host.

## Step 1: Pick a provider profile

AI Translate speaks the **OpenAI Chat Completions** protocol. The client builds the URL as `{baseUrl}/chat/completions` unless `baseUrl` already ends with `/chat/completions` (`LlmClient.chatUrl`).

Keys are stored in VS Code Secret Storage **per origin** of `baseUrl` (scheme + host + port). Changing only the path on the same host reuses the same key; changing host requires a new key.

## Step 2: Apply settings (user or workspace)

Open **Preferences: Open User Settings (JSON)** or workspace settings. Examples below are complete enough to copy; replace placeholders.

### OpenAI

```json
{
  "aiTranslate.llm.baseUrl": "https://api.openai.com/v1",
  "aiTranslate.llm.model": "gpt-4o-mini",
  "aiTranslate.llm.temperature": 0.2,
  "aiTranslate.llm.timeoutMs": 30000,
  "aiTranslate.llm.maxTokens": 4096
}
```

### DeepSeek

```json
{
  "aiTranslate.llm.baseUrl": "https://api.deepseek.com/v1",
  "aiTranslate.llm.model": "deepseek-chat",
  "aiTranslate.llm.extraBody": {
    "thinking": { "type": "disabled" }
  }
}
```

DeepSeek may enable “thinking” by default on some models; disabling it keeps responses short and JSON batch mode stable. See [Extra body and thinking](./extra-body-thinking.md).

### Qwen (DashScope compatible mode)

```json
{
  "aiTranslate.llm.baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "aiTranslate.llm.model": "qwen-plus",
  "aiTranslate.llm.extraBody": {
    "enable_thinking": false
  }
}
```

Use the **compatible-mode** base URL so request/response shapes match OpenAI. Model ids follow DashScope naming (`qwen-turbo`, `qwen-plus`, etc.).

### Doubao / Volcengine Ark

```json
{
  "aiTranslate.llm.baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
  "aiTranslate.llm.model": "ep-xxxxxxxxxxxxxxxx",
  "aiTranslate.llm.extraHeaders": {}
}
```

Ark endpoints use an **endpoint id** (`ep-…`) as the model field. Region and URL must match where you created the endpoint in the Volcengine console.

### Local OpenAI-compatible server (LM Studio, vLLM, etc.)

```json
{
  "aiTranslate.llm.baseUrl": "http://127.0.0.1:1234/v1",
  "aiTranslate.llm.model": "your-local-model-name",
  "aiTranslate.llm.jsonMode": "auto"
}
```

Document batch translation requests JSON responses when `jsonMode` is not `off`. If your server does not support `response_format`, set `aiTranslate.llm.jsonMode` to `off` and expect possible batch parsing failures.

## Step 3: Store the API key

1. **AI Translate: Set API Key** — enter the key (password field).
2. For local servers without auth, some users still set a dummy key if the server ignores `Authorization`; others leave key unset and see `noKey` until configured.

## Step 4: Optional advanced LLM settings

| Setting | When to change |
|---------|----------------|
| `aiTranslate.llm.stream` | Enable SSE streaming for chat (default false). |
| `aiTranslate.llm.maxConcurrency` | Parallel document batches (default 4). |
| `aiTranslate.llm.maxRetries` | HTTP retries with backoff (default 3). |
| `aiTranslate.llm.extraHeaders` | Custom headers (rare; some gateways). |
| `aiTranslate.llm.systemPrompt` | Appended/replaced system instructions (affects prompt version and cache). |
| `aiTranslate.llm.jsonMode` | `auto` / `on` / `off` for JSON batch document calls. |

## Step 5: Verify

1. Run **AI Translate: Test Connection**.
2. Hover a comment or run **Translate Selection** on a short English phrase with target `zh-CN`.
3. Open **AI Translate: Show Log** at `debug` if you need request-level detail.

Success criteria: test connection message, hover or selection shows translated text, log shows API calls without repeated auth errors.

## Step 6: Use the settings panel (optional)

**AI Translate: Open Settings Panel** edits the same keys through a webview with scope toggles (User / Workspace). Extra body templates for DeepSeek and Qwen match the JSON above. API keys are **not** edited in the panel; use **Set API Key**.

## Pitfalls

| Symptom | Likely cause |
|---------|----------------|
| `API Key is not set` | No secret for this `baseUrl` origin. |
| `Model name is not configured` | `llm.model` is empty string (default in package.json). |
| 404 on chat URL | `baseUrl` missing `/v1` or wrong region (Ark). |
| Empty or invalid JSON in document mode | Model does not support JSON mode; tune `jsonMode` or model. |
| Stale translations after provider switch | Cache keys include `baseUrl` and `extraBody` hash; still clear cache if you changed prompts only. |
| Wrong language quality | Temperature too high; lower `llm.temperature` (default 0.2). |

## Related documentation

- [Troubleshoot connection](./troubleshoot-connection.md)
- [Extra body and thinking](./extra-body-thinking.md)
- [Caching](../explanation/caching.md)
- [Settings reference](../reference/settings.md)
