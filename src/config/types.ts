import type { TargetLang } from '../types';

export interface TranslateConfig {
  enabled: boolean;
  targetLanguage: TargetLang;
  hover: {
    enabled: boolean;
    extraDelayMs: number;
    comments: boolean;
    strings: boolean;
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
    jsonMode: 'auto' | 'on' | 'off';
  };
  document: {
    batchSize: number;
    maxBatchChars: number;
    sideFileNamePattern: string;
    sideFileContent: 'translated' | 'bilingual';
    autoRefresh: boolean;
  };
  cache: {
    enabled: boolean;
    memoryEntries: number;
    maxDiskMB: number;
  };
  privacy: {
    exclude: string[];
    allowedSchemes: string[];
    blockSecrets: boolean;
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
}
