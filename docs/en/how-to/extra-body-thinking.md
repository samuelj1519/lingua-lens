# Extra body and thinking modes

## Goal

Merge vendor-specific fields into every chat completions request via `linguaLens.llm.extraBody`, especially to **disable “thinking”** or extended reasoning on DeepSeek and Qwen so translations stay concise and document JSON batches parse reliably.

## Prerequisites

- Provider configured with [Configure providers](./configure-providers.md).
- Understanding that `extraBody` is shallow-merged into the HTTP JSON body in `LlmClient` after standard fields (`model`, `messages`, `temperature`, etc.).

## How extra body works

`linguaLens.llm.extraBody` is a JSON object (default `{}`). At request time the extension spreads it into the POST body. Anything valid for your provider’s OpenAI-compatible API can be passed: `top_p`, `presence_penalty`, provider flags, etc.

**Cache impact:** Since 0.4.3, `TranslationService` hashes `JSON.stringify(extraBody ?? {})` (16-char SHA-256 prefix) into the cache key alongside text, target language, model, prompt version, and `baseUrl`. Changing `extraBody` invalidates cache entries for new lookups without clearing disk cache manually.

## Step 1: Edit in settings JSON

### DeepSeek — disable thinking

```json
{
  "linguaLens.llm.baseUrl": "https://api.deepseek.com/v1",
  "linguaLens.llm.model": "deepseek-chat",
  "linguaLens.llm.extraBody": {
    "thinking": {
      "type": "disabled"
    }
  }
}
```

This matches the built-in template `EXTRA_BODY_TEMPLATE_DEEPSEEK` in the settings panel.

### Qwen DashScope compatible — disable thinking

```json
{
  "linguaLens.llm.baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "linguaLens.llm.model": "qwen-plus",
  "linguaLens.llm.extraBody": {
    "enable_thinking": false
  }
}
```

Matches `EXTRA_BODY_TEMPLATE_QWEN` in the panel templates.

### OpenAI — typical extras (no thinking flag)

OpenAI’s public API does not use DeepSeek/Qwen thinking fields. You might still pass:

```json
{
  "linguaLens.llm.baseUrl": "https://api.openai.com/v1",
  "linguaLens.llm.model": "gpt-4o-mini",
  "linguaLens.llm.extraBody": {
    "seed": 42
  }
}
```

Only include keys your model and account support.

### Doubao / Ark

Consult Volcengine docs for OpenAI-compatible parameters. If no thinking flag is required, leave `extraBody` as `{}`:

```json
{
  "linguaLens.llm.baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
  "linguaLens.llm.model": "ep-xxxxxxxxxxxxxxxx",
  "linguaLens.llm.extraBody": {}
}
```

## Step 2: Edit in the settings panel

1. **LinguaLens: Open Settings Panel**.
2. Find **Extra body (JSON)**.
3. Paste valid JSON object text, or click template buttons **DeepSeek** / **Qwen** / **Clear**.
4. Invalid JSON posts `extraBodyError` back to the webview; fix syntax before saving.

The panel serializes objects with `JSON.stringify` for display; updates parse through `parseExtraBodyJson` (must be a plain object, not an array).

## Interactive `max_tokens` floor (0.7.1+)

Hover and selection use a per-request completion cap of `min(linguaLens.llm.maxTokens, estimate(source)×2.5+64)`, but when thinking is **not** explicitly disabled in `extraBody`, the extension raises that cap to **at least 1024** (still capped by `maxTokens`). This reduces empty translations when providers spend the completion budget on reasoning. If you disable thinking (DeepSeek `thinking.type: disabled` or Qwen `enable_thinking: false`), the lower heuristic applies again.

## Step 3: Verify behavior

1. **LinguaLens: Test Connection** — should still succeed; extra fields should not break a minimal completion.
2. Translate a short comment — response should be direct translation without long reasoning preamble.
3. Open a Markdown document preview — batch segments should return parseable JSON ids. If the model wraps output in thinking tags or prose, disable thinking or switch model.

## Step 4: Clear cache after material changes

If you previously cached translations **with** thinking enabled and now disable it, new keys apply automatically. Old entries may remain on disk until LRU eviction or **LinguaLens: Clear Cache**.

## Pitfalls

| Issue | Mitigation |
|-------|------------|
| Model returns empty content | Thinking consumed token budget; disable thinking or raise `maxTokens`. |
| `Invalid JSON` in panel | `extraBody` must be `{ "key": "value" }`, not a string or array. |
| Provider ignores unknown keys | Remove unsupported keys; check provider OpenAI compatibility matrix. |
| Different behavior per scope | `llm.extraBody` is **application** scope in package.json — set at User level unless you use multi-root overrides via settings panel scope bar. |
| Security | Do not put secrets in `extraBody`; use API key storage and `extraHeaders` only when necessary. |

## Related documentation

- [Configure providers](./configure-providers.md)
- [Caching](../explanation/caching.md)
- [Architecture — LLM client](../explanation/architecture.md)
