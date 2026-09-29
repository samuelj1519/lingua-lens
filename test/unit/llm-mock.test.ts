import { describe, expect, it, afterAll } from 'vitest';
import { startMockServer } from '../mock-server';
import { LlmClient } from '../../src/llm/LlmClient';
import type { TranslateConfig } from '../../src/config/types';

const mockConfig: TranslateConfig = {
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
    maxRetries: 1,
    systemPrompt: '',
    extraHeaders: {},
    extraBody: {},
    stream: false,
    jsonMode: 'on',
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
};

let server: ReturnType<typeof import('http').createServer>;
let port = 0;

describe('LlmClient mock', () => {
  it('sends chat completion', async () => {
    const { server: s, port: p, requests } = await startMockServer();
    server = s;
    port = p;
    mockConfig.llm.baseUrl = `http://127.0.0.1:${port}/v1`;
    const apiKeys = {
      get: async () => 'test-key',
      set: async () => {},
      clear: async () => {},
      clearAll: async () => {},
      onDidChange: { event: () => ({ dispose: () => {} }) },
    };
    const client = new LlmClient(() => mockConfig, apiKeys as never);
    const res = await client.chat({
      messages: [{ role: 'user', content: 'Hello' }],
      priority: 'interactive',
    });
    expect(res.content).toContain('zh-CN');
    expect(requests.length).toBe(1);
  }, 10000);

  afterAll(() => {
    server?.close();
  });
});
