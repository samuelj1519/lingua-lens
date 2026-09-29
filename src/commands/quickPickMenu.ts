import * as vscode from 'vscode';
import type { ConfigService } from '../config/ConfigService';
import type { DocTranslationService } from '../document/DocTranslationService';
import { EXTENSION_SETTINGS_FILTER } from '../constants/extensionId';
import { t } from '../l10n/uiL10n';

export async function showAiTranslateQuickPick(
  config: ConfigService,
  docService: DocTranslationService,
): Promise<void> {
  const cfg = config.get();
  const items: vscode.QuickPickItem[] = [
    {
      label: cfg.enabled ? `$(circle-slash) ${t('quickpick.disable')}` : `$(check) ${t('quickpick.enable')}`,
      description: 'toggle',
    },
    { label: `$(globe) ${t('quickpick.selectLanguage')}`, description: 'language' },
    { label: `$(book) ${t('quickpick.translateDocument')}`, description: 'document' },
    { label: `$(new-file) ${t('quickpick.generateSideFile')}`, description: 'sidefile' },
    { label: `$(settings-gear) ${t('quickpick.openSettings')}`, description: 'settings' },
    { label: `$(layout) ${t('quickpick.settingsPanel')}`, description: 'settingsPanel' },
    { label: `$(key) ${t('quickpick.setApiKey')}`, description: 'apikey' },
  ];
  const pick = await vscode.window.showQuickPick(items, { title: t('quickpick.title') });
  if (!pick) return;
  switch (pick.description) {
    case 'toggle':
      await vscode.commands.executeCommand('linguaLens.toggle');
      break;
    case 'language':
      await vscode.commands.executeCommand('linguaLens.selectTargetLanguage');
      break;
    case 'document': {
      const ed = vscode.window.activeTextEditor;
      if (ed) await docService.openPreview(ed.document);
      break;
    }
    case 'sidefile': {
      const ed = vscode.window.activeTextEditor;
      if (ed) await docService.generateSideFile(ed.document);
      break;
    }
    case 'settings':
      await vscode.commands.executeCommand('workbench.action.openSettings', EXTENSION_SETTINGS_FILTER);
      break;
    case 'settingsPanel':
      await vscode.commands.executeCommand('linguaLens.openSettingsPanel');
      break;
    case 'apikey':
      await vscode.commands.executeCommand('linguaLens.setApiKey');
      break;
  }
}
