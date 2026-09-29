# Manage translation cache

## Goal

Control how LinguaLens stores and reuses LLM results to save latency and API cost, and know when to clear cache after configuration or content changes.

## Prerequisites

- Basic understanding of [Caching](../explanation/caching.md) key components: text, `targetLang`, `model`, `promptVersion`, `baseUrl`, `extraBodyHash` (since **0.4.3**).

## Cache layers

`CacheService` maintains:

1. **Memory LRU** — size `linguaLens.cache.memoryEntries` (default 2000).
2. **Disk JSONL** — under extension `globalStorageUri/cache/v2`, capped by `linguaLens.cache.maxDiskMB` (default 50 MB).

Lookup order: memory → disk → miss → LLM. Disk hits promote to memory.

## Step 1: Enable or disable caching

Application scope:

```json
{
  "linguaLens.cache.enabled": true,
  "linguaLens.cache.memoryEntries": 2000,
  "linguaLens.cache.maxDiskMB": 50
}
```

When `enabled` is false, `get`/`set` no-op; every translation calls the API.

## Step 2: Understand what invalidates logically

A **new cache key** is computed when any of these change:

- Source segment text (after placeholder extraction for hover/strings).
- `linguaLens.targetLanguage`.
- `linguaLens.llm.model`.
- `linguaLens.llm.baseUrl`.
- `linguaLens.llm.extraBody` (hashed).
- Prompt version (built-in prompt templates, glossary terms matched, custom `llm.systemPrompt`).

Changing temperature alone does **not** change the key unless it is moved into `extraBody` on your provider.

## Step 3: Clear cache manually

1. Run **LinguaLens: Clear Cache** from Command Palette.
2. Confirm the modal warning.
3. Memory and disk stores are wiped; message `msg.cacheCleared` appears.

Use after:

- Large prompt or glossary experiments.
- Suspect corrupt entries (empty values are deleted on read).
- Debugging “stale” translations when you changed settings that are **not** in the key (rare).

## Step 4: Bypass cache per operation

| Action | Behavior |
|--------|----------|
| **Refresh Preview** on `lingualens:` document | `bypassCache: true` → `invalidateDocumentSegmentCaches` then re-translate. |
| Hover **retranslate** / refresh commands | Passes `bypassCache` through `refreshHoverTranslation`. |
| Selection translate | Uses cache by default; no dedicated bypass command except re-run after clear. |

## Step 5: Document batch caching

`translateBatch` writes per-item keys after successful parse. `peekDocumentBatchCache` allows fast preview reopen. Identity translations (`isSameTranslationAsSource`) may skip cache write but still return result.

## Step 6: Monitor cache effectiveness

Status bar / stats service tracks `memoryHits`, `diskHits`, `apiCalls` (internal). For rough verification, translate the same hover twice: second should be faster with no new API call in log at `info`.

Settings panel may show cache stats via `cacheService.stats()` (memory entry count, disk bytes).

## Tuning for large projects

```json
{
  "linguaLens.cache.memoryEntries": 5000,
  "linguaLens.cache.maxDiskMB": 200
}
```

Disk compaction runs on a delayed timer after init (`compact()` ~30s). `deactivate` flushes disk.

## Pitfalls

| Pitfall | Detail |
|---------|--------|
| Stale translation after system prompt edit | Prompt version changes key — old entries orphaned until disk cap eviction. |
| Same text, different providers | `baseUrl` in key — correct behavior. |
| Empty cache entries | Removed automatically on read (`trim` check). |
| Disabled cache still inflight dedupe | `inflight` Map dedupes concurrent identical keys in one session. |
| Privacy | Cache stores **translated plaintext** on disk in global storage — protect machine access. |

## Developer note on cache location

Disk files live under the extension’s `globalStorageUri` (per machine, per extension install), not inside your repository. They are not synced by Git. Uninstalling the extension may remove global storage depending on editor behavior; treat cache as disposable acceleration, not source of truth.

## Related documentation

- [Caching](../explanation/caching.md)
- [Extra body](./extra-body-thinking.md)
- [Configure providers](./configure-providers.md)
