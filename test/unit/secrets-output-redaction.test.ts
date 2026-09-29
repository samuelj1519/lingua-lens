import { describe, expect, it, vi, beforeEach } from 'vitest';
import { redactSecrets } from '../../src/secrets/redact';
import { redactForUserFacingText } from '../../src/secrets/redactBinding';
import { formatLlmFailureLogLine } from '../../src/llm/requestFailureLog';
import { LlmError } from '../../src/llm/errors';
import { decide } from '../../src/detection/LanguageDetector';
import { LlmClient } from '../../src/llm/LlmClient';
import type { TranslateConfig } from '../../src/config/types';

const SECRET = 'sk-test-redact-key-abcdefghijklmnop';

describe('output redaction', () => {
  it('redactForUserFacingText masks Bearer and credential patterns without stored keys', () => {
    const out = redactForUserFacingText(`Authorization: Bearer ${SECRET} api_key=${SECRET}`);
    expect(out).toContain('Bearer ***');
    expect(out).toContain('api_key=***');
    expect(out).not.toContain(SECRET);
  });

  it('redactSecrets with request key masks raw and URL-encoded forms', () => {
    const msg = `invalid ${SECRET} and ${encodeURIComponent(SECRET)}`;
    const out = redactSecrets(msg, [SECRET]);
    expect(out).not.toContain(SECRET);
    expect(out).not.toContain(encodeURIComponent(SECRET));
  });

  it('LLM failure log line never includes Authorization or key material', () => {
    const line = formatLlmFailureLogLine({
      feature: 'hover',
      model: 'gpt-4',
      baseUrl: 'https://api.example.com/v1',
      httpStatus: 401,
      error: new LlmError('auth', 'Invalid key', 401),
    });
    expect(line).not.toContain(SECRET);
    expect(line).not.toMatch(/Bearer/i);
    expect(line).toContain('error=auth');
  });
});

describe('LlmClient request-scoped redaction', () => {
  const baseConfig: TranslateConfig = {
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
      maxChars: 8000,
      showOriginal: false,
    },
    detection: {
      minLength: 3,
      targetRatio: 0.6,
      reliableMinLength: 20,
      strictChineseVariant: false,
      skipPatterns: [],
    },
    llm: {
      baseUrl: 'https://api.example.com/v1',
      model: 'test-model',
      temperature: 0,
      timeoutMs: 5000,
      maxConcurrency: 1,
      maxTokens: 100,
      maxRetries: 0,
      systemPrompt: '',
      extraHeaders: {},
      extraBody: {},
      stream: false,
      jsonMode: 'off',
    },
    document: {
      batchSize: 1,
      maxBatchChars: 1000,
      sideFileNamePattern: '',
      sideFileContent: 'translated',
      autoRefresh: false,
      previewStyle: 'interleaved',
      codeLens: true,
      forceTranslate: false,
    },
    cache: { enabled: false, memoryEntries: 0, maxDiskMB: 0 },
    privacy: { exclude: [], allowedSchemes: ['file'] },
    glossary: { path: '', maxTerms: 0 },
    selection: { output: 'auto' },
    parser: { maxFileSizeKB: 1024 },
    statusBar: { enabled: true },
    log: { level: 'off' },
    markdown: { frontmatterFields: [] },
  };

  it('redacts the request API key in error bodies from the provider', async () => {
    const getSpy = vi.fn().mockResolvedValue(SECRET);
    const apiKeys = { get: getSpy, isConfigured: () => true } as never;
    const client = new LlmClient(() => baseConfig, apiKeys);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => `Key ${SECRET} is invalid`,
        headers: { get: () => null },
      }),
    );

    await expect(
      client.chat({
        messages: [{ role: 'user', content: 'hi' }],
        priority: 'interactive',
      }),
    ).rejects.toMatchObject({
      message: expect.not.stringContaining(SECRET),
    });
    expect(getSpy).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });
});

describe('no content secret detection', () => {
  const baseOpts = {
    target: 'zh-CN' as const,
    minLength: 3,
    targetRatio: 0.6,
    reliableMinLength: 20,
    strictChineseVariant: false,
    userSkipPatterns: [] as RegExp[],
  };

  it('does not skip translation for sk- style strings in body text', () => {
    const text = 'const x = "sk-proj-' + 'a'.repeat(24) + '";';
    expect(decide(text, baseOpts).action).toBe('translate');
  });
});
