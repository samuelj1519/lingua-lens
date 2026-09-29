import type { TranslateConfig } from '../config/types';
import type { GlossaryService } from '../glossary/GlossaryService';
import { LlmError } from '../llm/errors';
import type { LlmClient } from '../llm/LlmClient';
import { parseBatchResponse, PromptBuilder, sanitizeModelOutput } from '../prompts/PromptBuilder';
import type { CacheService } from '../cache/CacheService';
import type { Placeholder, Segment, TargetLang, TextUnit } from '../types';
import { restore } from '../parsing/placeholders';
import type { StatsService } from '../stats/StatsService';
import { isCacheableTranslation } from './cacheable';
import { isSameTranslationAsSource } from '../util/textEquivalence';
import { sha256HexPrefix } from '../util/hash';
import * as vscode from 'vscode';

export interface TranslateResult {
  text: string;
  fromCache: 'memory' | 'disk' | false;
  placeholderOk: boolean;
  detected?: string;
}

export class TranslationService {
  private readonly prompts = new PromptBuilder();
  private readonly inflight = new Map<string, Promise<TranslateResult>>();
  private failures = 0;
  private pausedUntil = 0;

  constructor(
    private readonly getConfig: (uri?: import('vscode').Uri) => TranslateConfig,
    private readonly cache: CacheService,
    private readonly llm: LlmClient,
    private readonly glossary: GlossaryService,
    private readonly stats: StatsService,
  ) {}

  isPaused(): boolean {
    return Date.now() < this.pausedUntil;
  }

  resetPause(): void {
    this.failures = 0;
    this.pausedUntil = 0;
  }

  private workspaceFolder(uri?: vscode.Uri): vscode.Uri | undefined {
    if (!uri) return vscode.workspace.workspaceFolders?.[0]?.uri;
    return vscode.workspace.getWorkspaceFolder(uri)?.uri;
  }

  private cacheKey(
    text: string,
    target: TargetLang,
    kind: 'hover' | 'selection' | 'documentBatch' | 'documentFrontmatterBatch',
    uri?: vscode.Uri,
  ): string {
    const cfg = this.getConfig(uri);
    const glossary = this.glossary.match(text, this.workspaceFolder(uri), target);
    const batchKind =
      kind === 'documentFrontmatterBatch' ? 'documentFrontmatterBatch' : kind === 'documentBatch' ? 'documentBatch' : kind;
    const pv = this.prompts.promptVersion({
      kind: batchKind,
      targetLang: target,
      glossary,
      customSystemPrompt: cfg.llm.systemPrompt,
    });
    const extraBodyHash = sha256HexPrefix(JSON.stringify(cfg.llm.extraBody ?? {}), 16);
    return this.cache.key({
      text,
      targetLang: target,
      model: cfg.llm.model,
      promptVersion: pv,
      baseUrl: cfg.llm.baseUrl,
      extraBodyHash,
    });
  }

  async peekCache(
    unit: TextUnit,
    target: TargetLang,
    kind: 'hover' | 'selection',
    uri?: vscode.Uri,
  ): Promise<TranslateResult | undefined> {
    const key = this.cacheKey(unit.text, target, kind, uri);
    const mem = this.cache.getMemory(key);
    if (mem !== undefined) {
      return this.resultFromCached(mem, unit, key, 'memory');
    }
    const disk = await this.cache.get(key);
    if (!disk) return undefined;
    return this.resultFromCached(disk.value, unit, key, disk.tier);
  }

  private async resultFromCached(
    raw: string,
    unit: TextUnit,
    key: string,
    tier: 'memory' | 'disk',
  ): Promise<TranslateResult | undefined> {
    if (!isCacheableTranslation(raw)) {
      await this.cache.delete(key);
      return undefined;
    }
    const restored = restore(raw, unit.placeholders);
    if (!isCacheableTranslation(restored.text)) {
      await this.cache.delete(key);
      return undefined;
    }
    if (tier === 'disk') this.stats.inc('diskHits');
    return { text: restored.text, fromCache: tier, placeholderOk: restored.ok };
  }

  async translate(
    unit: TextUnit,
    target: TargetLang,
    opts: { kind: 'hover' | 'selection'; bypassCache?: boolean; uri?: import('vscode').Uri },
  ): Promise<TranslateResult> {
    const key = this.cacheKey(unit.text, target, opts.kind, opts.uri);
    if (!opts.bypassCache) {
      const cached = await this.peekCache(unit, target, opts.kind, opts.uri);
      if (cached) {
        if (cached.fromCache === 'memory') this.stats.inc('memoryHits');
        return cached;
      }
    }

    const existing = this.inflight.get(key);
    if (existing) return existing;

    const promise = this.doTranslate(unit, target, opts);
    this.inflight.set(key, promise);
    try {
      return await promise;
    } finally {
      this.inflight.delete(key);
    }
  }

  private async doTranslate(
    unit: TextUnit,
    target: TargetLang,
    opts: { kind: 'hover' | 'selection'; bypassCache?: boolean; uri?: vscode.Uri },
  ): Promise<TranslateResult> {
    const cfg = this.getConfig(opts.uri);
    await this.glossary.ensureLoaded(this.workspaceFolder(opts.uri));
    const glossaryTerms = this.glossary.match(unit.text, this.workspaceFolder(opts.uri), target);
    const messages = this.prompts.buildSingle(unit.text, {
      kind: opts.kind,
      targetLang: target,
      unitKind: unit.kind,
      languageId: unit.languageId,
      glossary: glossaryTerms,
      customSystemPrompt: cfg.llm.systemPrompt,
    });
    const maxTokens = Math.min(cfg.llm.maxTokens, estimateTokens(unit.text) * 2.5 + 64);
    try {
      const res = await this.llm.chat({
        messages,
        maxTokens: Math.ceil(maxTokens),
        priority: 'interactive',
      });
      this.stats.inc('apiCalls');
      if (res.usage) {
        this.stats.inc('promptTokens', res.usage.promptTokens);
        this.stats.inc('completionTokens', res.usage.completionTokens);
      }
      this.failures = 0;
      const cleaned = sanitizeModelOutput(res.content);
      if (!isCacheableTranslation(cleaned)) {
        throw new LlmError('invalidResponse', '模型返回空译文');
      }
      const restored = restore(cleaned, unit.placeholders);
      if (!isCacheableTranslation(restored.text)) {
        throw new LlmError('invalidResponse', '模型返回空译文');
      }
      this.cache.set(
        this.cacheKey(unit.text, target, opts.kind, opts.uri),
        cleaned,
        { model: cfg.llm.model, targetLang: target },
      );
      return { text: restored.text, fromCache: false, placeholderOk: restored.ok };
    } catch (e) {
      this.stats.inc('errors');
      if (e instanceof LlmError && ['auth', 'network', 'server'].includes(e.kind)) {
        this.failures++;
        if (this.failures >= 5) this.pausedUntil = Date.now() + 60_000;
      }
      throw e;
    }
  }

  async invalidateDocumentSegmentCaches(
    segments: Segment[],
    target: TargetLang,
    uri?: vscode.Uri,
  ): Promise<void> {
    for (const seg of segments) {
      if (seg.kind === 'preserved') continue;
      const kind = seg.kind === 'frontmatter' ? 'documentFrontmatterBatch' : 'documentBatch';
      const key = this.cacheKey(seg.sourceText, target, kind, uri);
      await this.cache.delete(key);
    }
  }

  async translateBatch(
    items: {
      id: string;
      text: string;
      placeholders: Placeholder[];
      batchCacheKind?: 'documentBatch' | 'documentFrontmatterBatch';
    }[],
    target: TargetLang,
    signal: AbortSignal,
    fileName?: string,
    uri?: vscode.Uri,
  ): Promise<Map<string, TranslateResult | LlmError>> {
    const cfg = this.getConfig(uri);
    const results = new Map<string, TranslateResult | LlmError>();
    const pending = [...items];

    await this.glossary.ensureLoaded(this.workspaceFolder(uri));
    const glossaryText = items.map((i) => i.text).join('\n');
    const glossary = this.glossary.match(glossaryText, this.workspaceFolder(uri), target);
    const extraBodyHash = sha256HexPrefix(JSON.stringify(cfg.llm.extraBody ?? {}), 16);

    while (pending.length > 0) {
      if (signal.aborted) break;
      const batch = pending.splice(0, cfg.document.batchSize);
      try {
        const batchKind = batch[0]?.batchCacheKind ?? 'documentBatch';
        const messages = this.prompts.buildBatch(
          batch.map((b) => ({ id: b.id, text: b.text })),
          {
            kind: batchKind,
            targetLang: target,
            glossary,
            customSystemPrompt: cfg.llm.systemPrompt,
            fileName,
          },
        );
        const res = await this.llm.chat({
          messages,
          json: true,
          maxTokens: cfg.llm.maxTokens,
          priority: 'background',
          signal,
        });
        this.stats.inc('apiCalls');
        const map = parseBatchResponse(res.content);
        for (const item of batch) {
          const raw = map.get(item.id);
          if (raw === undefined) {
            results.set(item.id, new LlmError('invalidResponse', `缺失 id ${item.id}`));
            continue;
          }
          const cleaned = sanitizeModelOutput(raw);
          if (!isCacheableTranslation(cleaned)) {
            results.set(item.id, new LlmError('invalidResponse', '模型返回空译文'));
            continue;
          }
          const restored = restore(cleaned, item.placeholders);
          if (isSameTranslationAsSource(item.text, restored.text, item.placeholders)) {
            results.set(item.id, {
              text: restored.text,
              fromCache: false,
              placeholderOk: restored.ok,
            });
            continue;
          }
          const itemBatchKind = item.batchCacheKind ?? 'documentBatch';
          const key = this.cache.key({
            text: item.text,
            targetLang: target,
            model: cfg.llm.model,
            promptVersion: this.prompts.promptVersion({
              kind: itemBatchKind,
              targetLang: target,
              glossary,
              customSystemPrompt: cfg.llm.systemPrompt,
            }),
            baseUrl: cfg.llm.baseUrl,
            extraBodyHash,
          });
          this.cache.set(key, cleaned, { model: cfg.llm.model, targetLang: target });
          results.set(item.id, {
            text: restored.text,
            fromCache: false,
            placeholderOk: restored.ok,
          });
        }
      } catch (e) {
        for (const item of batch) {
          results.set(item.id, e instanceof LlmError ? e : new LlmError('invalidResponse', String(e)));
        }
      }
    }
    return results;
  }
}

function estimateTokens(text: string): number {
  let n = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    n += cp > 0x2e80 ? 1 : 0.25;
  }
  return Math.ceil(n);
}
