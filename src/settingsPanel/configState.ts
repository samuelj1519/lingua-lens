import * as vscode from 'vscode';
import type { PanelConfigKey, SettingsScope } from './protocol';

export function configurationTarget(scope: SettingsScope): vscode.ConfigurationTarget {
  return scope === 'workspace' ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global;
}

const PANEL_KEYS: PanelConfigKey[] = [
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
];

export function readPanelValues(scope: SettingsScope): Record<string, unknown> {
  const cfg = vscode.workspace.getConfiguration('aiTranslate');
  const out: Record<string, unknown> = {};
  for (const key of PANEL_KEYS) {
    const inspect = cfg.inspect(key);
    if (scope === 'workspace') {
      out[key] = inspect?.workspaceValue ?? inspect?.workspaceFolderValue ?? inspect?.globalValue;
    } else {
      out[key] = inspect?.globalValue;
    }
  }
  return out;
}

export function readOverrides(): Record<string, 'workspace' | 'workspaceFolder' | null> {
  const cfg = vscode.workspace.getConfiguration('aiTranslate');
  const out: Record<string, 'workspace' | 'workspaceFolder' | null> = {};
  for (const key of PANEL_KEYS) {
    const inspect = cfg.inspect(key);
    if (inspect?.workspaceFolderValue !== undefined) out[key] = 'workspaceFolder';
    else if (inspect?.workspaceValue !== undefined) out[key] = 'workspace';
    else out[key] = null;
  }
  return out;
}

export async function updatePanelKey(
  key: string,
  value: unknown,
  scope: SettingsScope,
): Promise<void> {
  const cfg = vscode.workspace.getConfiguration('aiTranslate');
  await cfg.update(key, value, configurationTarget(scope));
}
