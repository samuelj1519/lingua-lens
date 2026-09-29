import { describe, expect, it } from 'vitest';
import { formatDiagnosticMessages } from '../../src/hover/diagnosticFormat';
import { isAiTranslateHoverContent } from '../../src/hover/hoverMarkers';
import { resolveSelectionTargetLanguage } from '../../src/commands/selectionTarget';
import type { TranslateConfig } from '../../src/config/types';

describe('diagnostic hover helpers', () => {
  it('formats multiple diagnostics', () => {
    const text = formatDiagnosticMessages([
      { message: 'Type error', range: {} as never, severity: 0, source: 'ts' },
      { message: 'Unused var', range: {} as never, severity: 1 },
    ]);
    expect(text).toContain('[ts]');
    expect(text).toContain('Unused var');
  });

  it('detects own hover marker', () => {
    expect(isAiTranslateHoverContent('**AI 翻译** `zh-CN`')).toBe(true);
    expect(isAiTranslateHoverContent('normal docs')).toBe(false);
  });
});

const baseCfg: TranslateConfig = {
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
  detection: {
    minLength: 3,
    targetRatio: 0.6,
    reliableMinLength: 20,
    strictChineseVariant: false,
    skipPatterns: [],
  },
  llm: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'm',
    temperature: 0.2,
    timeoutMs: 30000,
    maxConcurrency: 4,
    maxTokens: 4096,
    maxRetries: 3,
    systemPrompt: '',
    extraHeaders: {},
    extraBody: {},
    stream: false,
    jsonMode: 'auto',
  },
  document: {
    batchSize: 8,
    maxBatchChars: 4000,
    sideFileNamePattern: '{basename}.{lang}{ext}',
    sideFileContent: 'translated',
    autoRefresh: false,
    previewStyle: 'interleaved',
    codeLens: true,
  },
  cache: { enabled: true, memoryEntries: 500, maxDiskMB: 50 },
  privacy: { exclude: [], allowedSchemes: ['file'], blockSecrets: true },
  glossary: { path: '.translate-glossary.json', maxTerms: 200 },
  selection: { output: 'auto' },
  parser: { maxFileSizeKB: 512 },
  statusBar: { enabled: true },
  log: { level: 'off' },
};

describe('selection target language', () => {
  it('suggests English for Chinese selection when target is zh-CN', () => {
    expect(resolveSelectionTargetLanguage('这是中文说明文字', baseCfg)).toBe('en');
  });
});
