import { describe, expect, it } from 'vitest';
import { singleTranslateMaxTokens, SINGLE_TRANSLATE_MIN_COMPLETION_TOKENS } from '../../src/llm/singleTranslateMaxTokens';
import type { TranslateConfig } from '../../src/config/types';

function cfg(extraBody: Record<string, unknown>, maxTokens = 4096): TranslateConfig {
  return {
    enabled: true,
    targetLanguage: 'zh-CN',
    hover: {} as TranslateConfig['hover'],
    detection: {} as TranslateConfig['detection'],
    llm: {
      baseUrl: 'https://api.example.com/v1',
      model: 'm',
      temperature: 0,
      timeoutMs: 1,
      maxConcurrency: 1,
      maxTokens,
      maxRetries: 0,
      systemPrompt: '',
      extraHeaders: {},
      extraBody,
      stream: false,
      jsonMode: 'off',
    },
    document: {} as TranslateConfig['document'],
    cache: {} as TranslateConfig['cache'],
    privacy: {} as TranslateConfig['privacy'],
    glossary: {} as TranslateConfig['glossary'],
    selection: {} as TranslateConfig['selection'],
    parser: {} as TranslateConfig['parser'],
    statusBar: {} as TranslateConfig['statusBar'],
  };
}

describe('singleTranslateMaxTokens', () => {
  it('raises floor to 1024 when thinking is not explicitly disabled', () => {
    const n = singleTranslateMaxTokens(cfg({}), 'x');
    expect(n).toBeGreaterThanOrEqual(SINGLE_TRANSLATE_MIN_COMPLETION_TOKENS);
  });

  it('skips floor when thinking is disabled in extraBody', () => {
    const n = singleTranslateMaxTokens(cfg({ thinking: { type: 'disabled' } }), 'x');
    expect(n).toBeLessThan(200);
  });

  it('never exceeds llm.maxTokens', () => {
    const n = singleTranslateMaxTokens(cfg({}, 512), 'x');
    expect(n).toBe(512);
  });
});
