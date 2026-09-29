import { afterEach, describe, expect, it, vi } from 'vitest';
import { LlmClient } from '../../src/llm/LlmClient';
import type { TranslateConfig } from '../../src/config/types';
import { startMockServer } from '../mock-server';

const cfg = (): TranslateConfig => ({
  enabled: true,
  targetLanguage: 'zh-CN',
  hover: {
    enabled: true,
    extraDelayMs: 0,
    comments: true,
    strings: true,
    documents: true,
    configKeys: true,
    diagnostics: true,
    symbolDocs: true,
    gitCommitMessage: true,
    selection: true,
    maxChars: 4000,
    showOriginal: false,
  },
  detection: { minLength: 3, targetRatio: 0.6, reliableMinLength: 20, strictChineseVariant: false, skipPatterns: [] },
  llm: {
    baseUrl: 'http://127.0.0.1:0/v1',
    model: 'mock',
    temperature: 0.2,
    timeoutMs: 5000,
    maxConcurrency: 2,
    maxTokens: 100,
    maxRetries: 0,
    systemPrompt: '',
    extraHeaders: {},
    extraBody: {},
    stream: false,
    jsonMode: 'off',
  },
  document: {
    batchSize: 5,
    maxBatchChars: 1000,
    sideFileNamePattern: '',
    sideFileContent: 'translated',
    autoRefresh: false,
    previewStyle: 'interleaved',
    codeLens: true,
  },
  cache: { enabled: true, memoryEntries: 100, maxDiskMB: 1 },
  privacy: { exclude: [], allowedSchemes: ['file'], blockSecrets: true },
  glossary: { path: '.translate-glossary.json', maxTerms: 50 },
  selection: { output: 'auto' },
  parser: { maxFileSizeKB: 1024 },
  statusBar: { enabled: true },
});

describe('LlmClient failure logging', () => {
  let server: ReturnType<typeof import('http').createServer>;
  const origFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = origFetch;
    server?.close();
  });

  it('logs reasoningBudget failures to the output logger', async () => {
    const { server: s, port } = await startMockServer();
    server = s;
    const c = cfg();
    c.llm.baseUrl = `http://127.0.0.1:${port}/v1`;
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      headers.set('x-mock-scenario', 'reasoning-empty');
      return origFetch(input, { ...init, headers });
    }) as typeof fetch;
    const log = { error: vi.fn() };
    const client = new LlmClient(() => c, {
      get: async () => 'k',
      set: async () => {},
      clear: async () => {},
      clearAll: async () => {},
      onDidChange: { event: () => ({ dispose: () => {} }) },
    } as never, log as never);
    await expect(
      client.chat({ messages: [{ role: 'user', content: 'x' }], priority: 'interactive', feature: 'hover' }),
    ).rejects.toMatchObject({ kind: 'reasoningBudget' });
    expect(log.error).toHaveBeenCalled();
    expect(String(log.error.mock.calls[0][0])).toContain('feature=hover');
  }, 10000);
});
