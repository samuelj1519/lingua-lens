# Troubleshoot LLM connection

## Goal

Diagnose and fix failures from **AI Translate: Test Connection**, hover errors, or `LlmError` messages (auth, network, server, no key, no model).

## Prerequisites

- Know your intended `baseUrl` and `model` ([Configure providers](./configure-providers.md)).
- Ability to open **AI Translate: Show Log** and set `aiTranslate.log.level` to `debug` temporarily.

## Step 1: Confirm configuration

```json
{
  "aiTranslate.llm.baseUrl": "https://api.openai.com/v1",
  "aiTranslate.llm.model": "gpt-4o-mini",
  "aiTranslate.llm.timeoutMs": 30000,
  "aiTranslate.llm.maxRetries": 3
}
```

| Check | Command / action |
|-------|------------------|
| Model non-empty | Inspect settings — default model is `""`. |
| Key present | **Set API Key** for origin shown in prompt. |
| URL shape | Must resolve to `{base}/chat/completions`. |

## Step 2: Run test connection

**AI Translate: Test Connection** calls `LlmClient.testConnection()` with a minimal completion. Outcomes:

- **Information message** — HTTP 2xx and parseable content.
- **Error message** — surfaced to UI; see categories below.

## Step 3: Map errors to fixes

### `API Key is not set` (`noKey`)

- Run **AI Translate: Set API Key**.
- After switching `baseUrl` host, set key again (storage is per origin).
- **Clear API Key** → current origin or all origins if rotating keys.

### `Model name is not configured` (`noModel`)

Set `aiTranslate.llm.model` to a valid id for your endpoint.

### Auth errors (`auth`)

- Wrong or expired key.
- Ark/DashScope: use API key from correct console product.
- Corporate proxy stripping `Authorization` header — configure system proxy or `extraHeaders` if provider requires additional headers.

### Network errors (`network`)

- DNS or TLS failure, timeout (`timeoutMs` too low for slow networks).
- Local server not running (`http://127.0.0.1:…`).
- Firewall blocking egress — allow provider domain.

### Server errors (`server`)

- 5xx from provider — retry later; extension backs off and may **pause** interactive translation for 60s after 5 failures (`TranslationService`).
- Rate limits — reduce `maxConcurrency` or document `batchSize`.

### Invalid response (`invalidResponse`)

- Empty model output (thinking mode consuming tokens — [disable thinking](./extra-body-thinking.md)).
- JSON batch mode unsupported — set `llm.jsonMode` to `off` or change model.

## Step 4: Provider-specific checks

**OpenAI**

```json
{
  "aiTranslate.llm.baseUrl": "https://api.openai.com/v1",
  "aiTranslate.llm.model": "gpt-4o-mini"
}
```

**DeepSeek**

```json
{
  "aiTranslate.llm.baseUrl": "https://api.deepseek.com/v1",
  "aiTranslate.llm.model": "deepseek-chat",
  "aiTranslate.llm.extraBody": { "thinking": { "type": "disabled" } }
}
```

**Qwen compatible**

```json
{
  "aiTranslate.llm.baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "aiTranslate.llm.model": "qwen-plus",
  "aiTranslate.llm.extraBody": { "enable_thinking": false }
}
```

**Doubao Ark**

```json
{
  "aiTranslate.llm.baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
  "aiTranslate.llm.model": "ep-xxxxxxxxxxxxxxxx"
}
```

Verify endpoint id and region match the console URL.

## Step 5: Integration test mode (developers)

When `AITRANSLATE_INTEGRATION_TEST=1`, activation points `baseUrl` to `http://127.0.0.1:${AITRANSLATE_MOCK_PORT||18765}/v1` and sets model `mock`. Use only in automated tests.

## Step 6: Reset pause state

After repeated failures, translation pauses. Fix root cause, then:

- **Set API Key** again (calls `translation.resetPause()`), or
- Wait 60 seconds.

## Step 7: Verify end-to-end

1. Test connection succeeds.
2. Short selection translate succeeds.
3. Log shows `apiCalls` without error spam.
4. Optional: `curl` the same URL with `Authorization: Bearer $KEY` outside VS Code to isolate extension vs network.

Example curl (OpenAI-shaped):

```bash
curl -sS "${BASE_URL%/}/chat/completions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"max_tokens":5}'
```

## Pitfalls

| Pitfall | Detail |
|---------|--------|
| Trailing slash on baseUrl | Handled by trim logic; avoid double `/v1/v1`. |
| Stream mode | `llm.stream` true changes response handling; disable to simplify debugging. |
| JSON mode auto-off | Client remembers models that reject `response_format` per capability key. |
| Secrets in logs | Use `info` in production; `trace` may log request metadata — avoid on shared machines. |
| Workspace disabled | `aiTranslate.enabled` false — commands return early without LLM calls. |

## Related documentation

- [Configure providers](./configure-providers.md)
- [Extra body](./extra-body-thinking.md)
- [Architecture — LLM client](../explanation/architecture.md)
