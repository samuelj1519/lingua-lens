import type { TargetLang } from '../types';

export interface TranslateConfig {
  enabled: boolean;
  targetLanguage: TargetLang;
  hover: {
    enabled: boolean;
    extraDelayMs: number;
    comments: boolean;
    strings: boolean;
    documents: boolean;
    configKeys: boolean;
    diagnostics: boolean;
    symbolDocs: boolean;
    gitCommitMessage: boolean;
    selection: boolean;
    maxChars: number;
    showOriginal: boolean;
  };
  detection: {
    minLength: number;
    targetRatio: number;
    reliableMinLength: number;
    strictChineseVariant: boolean;
    skipPatterns: string[];
  };
  llm: {
    baseUrl: string;
    model: string;
    temperature: number;
    timeoutMs: number;
    maxConcurrency: number;
    maxTokens: number;
    maxRetries: number;
    systemPrompt: string;
    extraHeaders: Record<string, string>;
    extraBody: Record<string, unknown>;
    stream: boolean;
    jsonMode: 'auto' | 'on' | 'off';
  };
  document: {
    batchSize: number;
    maxBatchChars: number;
    sideFileNamePattern: string;
    sideFileContent: 'translated' | 'bilingual';
    autoRefresh: boolean;
    previewStyle: 'interleaved' | 'append';
    codeLens: boolean;
    forceTranslate: boolean;
  };
  cache: {
    enabled: boolean;
    memoryEntries: number;
    maxDiskMB: number;
  };
  privacy: {
    exclude: string[];
    allowedSchemes: string[];
  };
  glossary: {
    path: string;
    maxTerms: number;
  };
  selection: {
    output: 'auto' | 'notification' | 'document';
  };
  parser: {
    maxFileSizeKB: number;
  };
  statusBar: {
    enabled: boolean;
  };
  log: {
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'off';
  };
  markdown: {
    frontmatterFields: string[];
  };
}
