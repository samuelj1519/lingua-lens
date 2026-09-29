export type SettingsScope = 'global' | 'workspace';

export type SettingsPanelMessageFromWebview =
  | { type: 'ready' }
  | { type: 'setScope'; scope: SettingsScope }
  | {
      type: 'update';
      key: string;
      value: unknown;
    }
  | { type: 'applyExtraBodyTemplate'; template: 'deepseek' | 'qwen' | 'clear' }
  | { type: 'testConnection' }
  | { type: 'clearCache' }
  | { type: 'openNativeSettings' }
  | { type: 'openSetApiKey' };

export type SettingsPanelMessageToWebview =
  | {
      type: 'init';
      strings: Record<string, string>;
      scope: SettingsScope;
      values: Record<string, unknown>;
      overrides: Record<string, 'workspace' | 'workspaceFolder' | null>;
      apiKeyConfigured: boolean;
      cacheStats: { memoryEntries: number; diskBytes: number };
      totalNativeSettings: number;
      targetLanguage: string;
    }
  | { type: 'state'; values: Record<string, unknown>; overrides: Record<string, 'workspace' | 'workspaceFolder' | null> }
  | { type: 'testResult'; ok: boolean; message: string }
  | { type: 'cacheCleared' }
  | { type: 'extraBodyError'; message: string };

export const PANEL_CONFIG_KEYS = [
  'llm.baseUrl',
  'llm.model',
  'llm.stream',
  'llm.extraBody',
  'targetLanguage',
  'detection.strictChineseVariant',
  'hover.enabled',
  'hover.extraDelayMs',
  'hover.comments',
  'hover.strings',
  'hover.documents',
  'hover.configKeys',
  'hover.diagnostics',
  'hover.symbolDocs',
  'hover.gitCommitMessage',
  'hover.selection',
  'document.previewStyle',
  'document.codeLens',
  'document.forceTranslate',
  'cache.enabled',
] as const;

export type PanelConfigKey = (typeof PANEL_CONFIG_KEYS)[number];
