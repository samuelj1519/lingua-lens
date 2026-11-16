import { describe, expect, it, vi } from 'vitest';
import type { TranslateConfig } from '../../src/config/types';
import type { ChatMessage } from '../../src/llm/LlmClient';
import type { GlossaryTerm, TextUnit } from '../../src/types';
import { sha256Hex } from '../../src/util/hash';

vi.mock('vscode', () => {
  const folder = {
    toString: () => 'file:///workspace',
    fsPath: '/workspace',
    scheme: 'file',
    path: '/workspace',
  };
  return {
    workspace: {
      workspaceFolders: [{ uri: folder }],
      getWorkspaceFolder: () => ({ uri: folder }),
    },
  };
});

const cfg = {
  llm: {
    baseUrl: 'https://example.test/v1',
    model: 'test-model',
    systemPrompt: '',
    extraBody: {},
    maxTokens: 512,
  },
  document: { batchSize: 8 },
} as TranslateConfig;

const terms: GlossaryTerm[] = [
  { source: 'cache', target: 'cache-word', doNotTranslate: false, caseSensitive: false },
  { source: 'glossary', target: 'glossary-word', doNotTranslate: false, caseSensitive: false },
];

function memoryCache() {
  const store = new Map<string, string>();
  return {
    store,
    key(parts: {
      text: string;
      targetLang: string;
      model: string;
      promptVersion: string;
      baseUrl: string;
      extraBodyHash: string;
    }) {
      return sha256Hex(
        [parts.text, parts.targetLang, parts.model, parts.promptVersion, parts.baseUrl, parts.extraBodyHash].join(
          '\u0000',
        ),
      );
    },
    getMemory(key: string) {
      return store.get(key);
    },
    async get(key: string) {
      const value = store.get(key);
      if (value === undefined) return undefined;
      return { value, tier: 'memory' as const };
    },
    set(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
  };
}

function batchInput(messages: ChatMessage[]): { items: { id: string; text: string; glossary?: string }[] } {
  const user = messages[1]?.content ?? '';
  const marker = 'Input:\n';
  const json = user.slice(user.indexOf(marker) + marker.length);
  return JSON.parse(json) as { items: { id: string; text: string; glossary?: string }[] };
}

describe('document batch cache reuses a segment', () => {
  it('reads a segment with the same glossary key that the batch wrote', async () => {
    const { TranslationService } = await import('../../src/translation/TranslationService');
    const calls: ChatMessage[][] = [];
    const cache = memoryCache();
    const service = new TranslationService(
      () => cfg,
      cache as never,
      {
        async chat(req: { messages: ChatMessage[] }) {
          calls.push(req.messages);
          const input = batchInput(req.messages);
          return {
            content: JSON.stringify({
              items: input.items.map((item) => ({ id: item.id, translation: `tr:${item.text}` })),
            }),
            model: 'test-model',
            latencyMs: 1,
          };
        },
      } as never,
      {
        async ensureLoaded() {},
        match(text: string) {
          return terms.filter((term) => new RegExp(`\\b${term.source}\\b`, 'i').test(text));
        },
      } as never,
      { inc() {} } as never,
    );

    await service.translateBatch(
      [
        { id: 'a', text: 'the cache layer', placeholders: [] },
        { id: 'b', text: 'the glossary file', placeholders: [] },
      ],
      'zh-CN',
      new AbortController().signal,
      'notes.md',
    );

    const input = batchInput(calls[0]);
    expect(input.items.find((item) => item.id === 'a')?.glossary ?? '').toContain('cache => cache-word');
    expect(input.items.find((item) => item.id === 'a')?.glossary ?? '').not.toContain('glossary-word');
    expect(input.items.find((item) => item.id === 'b')?.glossary ?? '').toContain('glossary => glossary-word');
    expect(input.items.find((item) => item.id === 'b')?.glossary ?? '').not.toContain('cache-word');

    const againA = await service.peekDocumentBatchCache('the cache layer', [], 'zh-CN', 'documentBatch');
    const againB = await service.peekDocumentBatchCache('the glossary file', [], 'zh-CN', 'documentBatch');
    expect(againA?.text).toBe('tr:the cache layer');
    expect(againB?.text).toBe('tr:the glossary file');
    expect(calls).toHaveLength(1);
  });

  it('stores a translation that matches the source so the next read skips the model', async () => {
    const { TranslationService } = await import('../../src/translation/TranslationService');
    let calls = 0;
    const service = new TranslationService(
      () => cfg,
      memoryCache() as never,
      {
        async chat(req: { messages: ChatMessage[] }) {
          calls += 1;
          const input = batchInput(req.messages);
          return {
            content: JSON.stringify({
              items: input.items.map((item) => ({ id: item.id, translation: item.text })),
            }),
            model: 'test-model',
            latencyMs: 1,
          };
        },
      } as never,
      {
        async ensureLoaded() {},
        match() {
          return [];
        },
      } as never,
      { inc() {} } as never,
    );

    await service.translateBatch(
      [{ id: 'same', text: 'Keep this identifier', placeholders: [] }],
      'zh-CN',
      new AbortController().signal,
    );
    const cached = await service.peekDocumentBatchCache('Keep this identifier', [], 'zh-CN', 'documentBatch');
    expect(cached?.text).toBe('Keep this identifier');
    expect(calls).toBe(1);
  });

  it('loads the glossary before a hover read so a warm entry still hits', async () => {
    const { TranslationService } = await import('../../src/translation/TranslationService');
    let loaded = false;
    let calls = 0;
    const service = new TranslationService(
      () => cfg,
      memoryCache() as never,
      {
        async chat() {
          calls += 1;
          return { content: 'translated comment', model: 'test-model', latencyMs: 1 };
        },
      } as never,
      {
        async ensureLoaded() {
          loaded = true;
        },
        match(text: string) {
          if (!loaded) return [];
          return terms.filter((term) => new RegExp(`\\b${term.source}\\b`, 'i').test(text));
        },
      } as never,
      { inc() {} } as never,
    );
    const unit: TextUnit = {
      kind: 'lineComment',
      range: { start: 0, end: 18 },
      rawText: 'use the cache here',
      text: 'use the cache here',
      placeholders: [],
      languageId: 'typescript',
      source: 'tree-sitter',
    };

    await service.translate(unit, 'zh-CN', { kind: 'hover' });
    loaded = false;
    const cached = await service.peekCache(unit, 'zh-CN', 'hover');
    expect(cached?.text).toBe('translated comment');
    expect(calls).toBe(1);
  });
});
