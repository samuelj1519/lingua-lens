import * as vscode from 'vscode';
import type { ConfigService } from '../config/ConfigService';
import type { DocTranslationService } from '../document/DocTranslationService';

export async function showAiTranslateQuickPick(
  config: ConfigService,
  docService: DocTranslationService,
): Promise<void> {
  const cfg = config.get();
  const items: vscode.QuickPickItem[] = [
    {
      label: cfg.enabled ? '$(circle-slash) 禁用 AI Translate' : '$(check) 启用 AI Translate',
      description: 'toggle',
    },
    { label: '$(globe) 选择目标语言', description: 'language' },
    { label: '$(book) 翻译全文（对照预览）', description: 'document' },
    { label: '$(new-file) 生成译文文件', description: 'sidefile' },
    { label: '$(settings-gear) 打开设置', description: 'settings' },
    { label: '$(key) 设置 API Key', description: 'apikey' },
  ];
  const pick = await vscode.window.showQuickPick(items, { title: 'AI Translate' });
  if (!pick) return;
  switch (pick.description) {
    case 'toggle':
      await vscode.commands.executeCommand('aiTranslate.toggle');
      break;
    case 'language':
      await vscode.commands.executeCommand('aiTranslate.selectTargetLanguage');
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
      await vscode.commands.executeCommand('aiTranslate.openSettings');
      break;
    case 'apikey':
      await vscode.commands.executeCommand('aiTranslate.setApiKey');
      break;
  }
}
