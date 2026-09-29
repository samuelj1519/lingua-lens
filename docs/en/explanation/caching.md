# Caching

LinguaLens caches LLM **model output strings** (before placeholder restore in memory, stored raw from model) to reduce latency and repeated charges for identical work.

## Key composition (since 0.4.3)

`CacheService.key()` hashes a NUL-separated payload:

1. **text** — source segment or unit text (placeholders already extracted in unit.text for hover).
2. **targetLang** — e.g. `zh-CN`.
3. **model** — `linguaLens.llm.model`.
4. **promptVersion** — from `PromptBuilder.promptVersion()` (kind, target, glossary hash, custom system prompt).
5. **baseUrl** — full configured base URL string.
6. **extraBodyHash** — first 16 hex chars of SHA-256 of `JSON.stringify(extraBody ?? {})`.

```typescript
// Conceptual (see TranslationService.cacheKey and CacheService.key)
sha256Hex(
  [text, targetLang, model, promptVersion, baseUrl, extraBodyHash].join('\0')
)
```

Engineering decision **D7** originally excluded `baseUrl` from keys; that decision is **superseded** — keys now include `baseUrl` and `extraBodyHash` so switching endpoints or thinking flags does not return wrong cached translations. See [Decisions](./decisions.md).

### What is NOT in the key

- `temperature`, `timeoutMs`, `maxRetries` (unless encoded in provider-specific `extraBody`).
- API key (never cached).
- File path or URI (same string in two files shares cache — usually desirable).

### Prompt version

Changing `llm.systemPrompt`, glossary matches, or batch kind (`hover` vs `documentBatch` vs `documentFrontmatterBatch`) changes `promptVersion` and therefore the key.

## Storage tiers

| Tier | Location | Policy |
|------|----------|--------|
| Memory | `LruCache` in process | `cache.memoryEntries` (default 2000) |
| Disk | `globalStorageUri/cache/v2` JSONL shards | `cache.maxDiskMB` (default 50) |

On disk hit, entry promotes to memory. `configure()` rebuilds caches when settings change.

## Read path

`TranslationService.translate` / `peekCache`:

1. If cache disabled → miss.
2. Memory hit → `resultFromCached` → restore placeholders → return.
3. Disk hit → stats `diskHits`, promote, restore.
4. Invalid or empty cached value → delete key, miss.

`isCacheableTranslation` rejects empty/whitespace-only strings.

## Write path

After successful LLM response and sanitize:

- `cache.set(key, cleaned, { model, targetLang })`.
- Batch path sets per item when translation differs from source (`isSameTranslationAsSource` may skip write).

## Invalidation

- **Clear Cache** command — wipes all tiers.
- **Refresh Preview** with bypass — `invalidateDocumentSegmentCaches` deletes keys for current session segments.
- **delete(key)** on corrupt entries during read.

## Inflight deduplication

Separate from cache: `inflight` Map in `TranslationService` ensures concurrent identical keys share one Promise (thundering herd protection).

## Failure pause interaction

Caching does not bypass `TranslationService` pause after repeated auth/network/server errors. Cached reads still work while paused.

## Privacy note

Disk cache contains **translation plaintext** in the user’s global storage directory. Protect workstation access; clear cache on shared machines.

## Operational tuning

Increase `memoryEntries` for large monorepos with repetitive comments. Increase `maxDiskMB` for long document sessions. Disable cache only when debugging model stochasticity (temperature > 0).

## Version history note

Before 0.4.3, cache keys omitted `baseUrl` and `extraBodyHash`. Upgrading the extension does not migrate old shard files; they remain until size-based compaction or manual clear. After upgrade, first lookup with new key misses old entries — behavior is safe, not stale cross-provider.

Glossary changes affect `promptVersion` even when source text is unchanged, so a term added mid-session causes cache misses on the next hover — by design, so new terminology reaches the model without manual clear.

## Related documentation

- [Manage cache](../how-to/cache.md)
- [Extra body](../how-to/extra-body-thinking.md)
- [Architecture](./architecture.md)
