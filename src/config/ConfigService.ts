import * as vscode from 'vscode';
import type { TargetLang } from '../types';
import type { TranslateConfig } from './types';

export type { TranslateConfig } from './types';

const TARGET_LANGS: TargetLang[] = ['zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'ru'];

const DEFAULT_EXCLUDE = [
  '**/.env',
  '**/.env.*',
  '**/*.pem',
  '**/*.key',
  '**/*.p12',
  '**/id_rsa*',
  '**/secrets/**',
  '**/.git/**',
  '**/node_modules/**',
];

export class ConfigService implements vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<vscode.ConfigurationChangeEvent>();
  readonly onDidChange = this.emitter.event;
  private readonly sub: vscode.Disposable;

  constructor() {
    this.sub = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('aiTranslate')) {
        this.emitter.fire(e);
      }
    });
  }

  get(resource?: vscode.Uri): TranslateConfig {
    const cfg = vscode.workspace.getConfiguration('aiTranslate', resource);
    const userExclude = vscode.workspace.getConfiguration('aiTranslate').inspect<string[]>('privacy.exclude');
    const wsExclude = resource
      ? vscode.workspace.getConfiguration('aiTranslate', resource).inspect<string[]>('privacy.exclude')
      : undefined;
    const excludeSet = new Set<string>(DEFAULT_EXCLUDE);
    for (const v of [userExclude?.globalValue, userExclude?.workspaceValue, wsExclude?.workspaceFolderValue]) {
      if (Array.isArray(v)) {
        for (const p of v) excludeSet.add(p);
      }
    }

    const target = cfg.get<string>('targetLanguage', 'zh-CN');
    const targetLanguage = (TARGET_LANGS.includes(target as TargetLang) ? target : 'zh-CN') as TargetLang;

    const extraHeaders = cfg.get<Record<string, string>>('llm.extraHeaders', {});
    return {
      enabled: cfg.get<boolean>('enabled', true),
      targetLanguage,
      hover: {
        enabled: cfg.get<boolean>('hover.enabled', true),
        extraDelayMs: cfg.get<number>('hover.extraDelayMs', 700),
        comments: cfg.get<boolean>('hover.comments', true),
        strings: cfg.get<boolean>('hover.strings', true),
        maxChars: cfg.get<number>('hover.maxChars', 4000),
        showOriginal: cfg.get<boolean>('hover.showOriginal', false),
      },
      detection: {
        minLength: cfg.get<number>('detection.minLength', 3),
        targetRatio: cfg.get<number>('detection.targetRatio', 0.6),
        reliableMinLength: cfg.get<number>('detection.reliableMinLength', 20),
        strictChineseVariant: cfg.get<boolean>('detection.strictChineseVariant', false),
        skipPatterns: cfg.get<string[]>('detection.skipPatterns', []),
      },
      llm: {
        baseUrl: cfg.get<string>('llm.baseUrl', 'https://api.openai.com/v1'),
        model: cfg.get<string>('llm.model', ''),
        temperature: cfg.get<number>('llm.temperature', 0.2),
        timeoutMs: cfg.get<number>('llm.timeoutMs', 30000),
        maxConcurrency: cfg.get<number>('llm.maxConcurrency', 4),
        maxTokens: cfg.get<number>('llm.maxTokens', 4096),
        maxRetries: cfg.get<number>('llm.maxRetries', 3),
        systemPrompt: cfg.get<string>('llm.systemPrompt', ''),
        extraHeaders: extraHeaders ?? {},
        jsonMode: cfg.get<'auto' | 'on' | 'off'>('llm.jsonMode', 'auto'),
      },
      document: {
        batchSize: cfg.get<number>('document.batchSize', 15),
        maxBatchChars: cfg.get<number>('document.maxBatchChars', 6000),
        sideFileNamePattern: cfg.get<string>(
          'document.sideFileNamePattern',
          '${fileBasenameNoExtension}.${lang}${fileExtname}',
        ),
        sideFileContent: cfg.get<'translated' | 'bilingual'>('document.sideFileContent', 'translated'),
        autoRefresh: cfg.get<boolean>('document.autoRefresh', false),
      },
      cache: {
        enabled: cfg.get<boolean>('cache.enabled', true),
        memoryEntries: cfg.get<number>('cache.memoryEntries', 2000),
        maxDiskMB: cfg.get<number>('cache.maxDiskMB', 50),
      },
      privacy: {
        exclude: [...excludeSet],
        allowedSchemes: cfg.get<string[]>('privacy.allowedSchemes', ['file', 'untitled', 'vscode-remote']),
        blockSecrets: cfg.get<boolean>('privacy.blockSecrets', true),
      },
      glossary: {
        path: cfg.get<string>('glossary.path', '.translate-glossary.json'),
        maxTerms: cfg.get<number>('glossary.maxTerms', 50),
      },
      selection: {
        output: cfg.get<'auto' | 'notification' | 'document'>('selection.output', 'auto'),
      },
      parser: {
        maxFileSizeKB: cfg.get<number>('parser.maxFileSizeKB', 1024),
      },
      statusBar: {
        enabled: cfg.get<boolean>('statusBar.enabled', true),
      },
    };
  }

  async setEnabled(value: boolean, resource?: vscode.Uri): Promise<void> {
    const cfg = vscode.workspace.getConfiguration('aiTranslate', resource);
    const inspect = cfg.inspect<boolean>('enabled');
    const target =
      inspect?.workspaceFolderValue !== undefined
        ? vscode.ConfigurationTarget.WorkspaceFolder
        : inspect?.workspaceValue !== undefined
          ? vscode.ConfigurationTarget.Workspace
          : vscode.ConfigurationTarget.Global;
    await cfg.update('enabled', value, target);
  }

  async setTargetLanguage(lang: TargetLang, resource?: vscode.Uri): Promise<void> {
    const cfg = vscode.workspace.getConfiguration('aiTranslate', resource);
    const inspect = cfg.inspect<string>('targetLanguage');
    const target =
      inspect?.workspaceFolderValue !== undefined
        ? vscode.ConfigurationTarget.WorkspaceFolder
        : inspect?.workspaceValue !== undefined
          ? vscode.ConfigurationTarget.Workspace
          : vscode.ConfigurationTarget.Global;
    await cfg.update('targetLanguage', lang, target);
  }

  dispose(): void {
    this.sub.dispose();
    this.emitter.dispose();
  }
}
