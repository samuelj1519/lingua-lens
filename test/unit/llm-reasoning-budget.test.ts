import { afterAll, describe, expect, it } from 'vitest';
import { LlmClient } from '../../src/llm/LlmClient';
import type { TranslateConfig } from '../../src/config/types';
import { startMockServer } from '../mock-server';

const baseMockConfig = (): TranslateConfig => ({
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
  privacy: { exclude: [], allowedSchemes: ['file'] },
  glossary: { path: '.translate-glossary.json', maxTerms: 50 },
  selection: { output: 'auto' },
  parser: { maxFileSizeKB: 1024 },
  statusBar: { enabled: true },
});

let server: ReturnType<typeof import('http').createServer>;

const apiKeys = {
  get: async () => 'test-key',
  set: async () => {},
  clear: async () => {},
  clearAll: async () => {},
  onDidChange: { event: () => ({ dispose: () => {} }) },
};

async function clientWithScenario(
  scenario: string,
  stream = false,
): Promise<{ client: LlmClient; cleanup: () => void }> {
  const { server: s, port } = await startMockServer();
  server = s;
  const cfg = baseMockConfig();
  cfg.llm.baseUrl = `http://127.0.0.1:${port}/v1`;
  cfg.llm.stream = stream;
  const origFetch = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    headers.set('x-mock-scenario', scenario);
    return origFetch(input, { ...init, headers });
  }) as typeof fetch;
  return {
    client: new LlmClient(() => cfg, apiKeys as never),
    cleanup: () => {
      globalThis.fetch = origFetch;
      s.close();
    },
  };
}

describe('LlmClient reasoning budget', () => {
  it('throws reasoningBudget when content empty but reasoning_content is present', async () => {
    const { client, cleanup } = await clientWithScenario('reasoning-empty');
    await expect(
      client.chat({ messages: [{ role: 'user', content: 'Hi' }], priority: 'interactive', feature: 'test' }),
    ).rejects.toMatchObject({ kind: 'reasoningBudget' });
    cleanup();
  }, 10000);

  it('throws reasoningBudget when finish_reason is length and content empty', async () => {
    const { client, cleanup } = await clientWithScenario('length-empty');
    await expect(
      client.chat({ messages: [{ role: 'user', content: 'Hi' }], priority: 'interactive' }),
    ).rejects.toMatchObject({ kind: 'reasoningBudget' });
    cleanup();
  }, 10000);

  it('throws reasoningBudget for streamed reasoning-only completion', async () => {
    const { client, cleanup } = await clientWithScenario('stream-reasoning', true);
    await expect(
      client.chat({ messages: [{ role: 'user', content: 'Hi' }], priority: 'interactive' }),
    ).rejects.toMatchObject({ kind: 'reasoningBudget' });
    cleanup();
  }, 10000);

  afterAll(() => {
    server?.close();
  });
});
