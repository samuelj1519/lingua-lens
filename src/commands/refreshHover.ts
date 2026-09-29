import * as vscode from 'vscode';
import type { ConfigService } from '../config/ConfigService';
import type { HoverActionRegistry } from '../hover/HoverActionRegistry';
import type { TranslationService } from '../translation/TranslationService';
import { isCacheableTranslation } from '../translation/cacheable';

export async function refreshHoverTranslation(
  id: string,
  config: ConfigService,
  translation: TranslationService,
  registry: HoverActionRegistry,
): Promise<void> {
  const action = registry.get(id);
  if (!action) {
    void vscode.window.showWarningMessage('悬停操作已过期，请再次悬停');
    return;
  }
  const uri = vscode.Uri.parse(action.uri);
  const target = action.targetLanguage ?? config.get(uri).targetLanguage;
  try {
    const result = await translation.translate(action.unit, target, {
      kind: action.translateKind,
      bypassCache: true,
      uri,
    });
    if (!isCacheableTranslation(result.text)) {
      void vscode.window.showErrorMessage('模型返回空译文');
      return;
    }
    registry.updateTranslation(id, result.text);
    const editor = vscode.window.visibleTextEditors.find((e) => e.document.uri.toString() === action.uri);
    if (editor) {
      const anchor = editor.document.positionAt(action.range.start);
      editor.selection = new vscode.Selection(anchor, anchor);
      await vscode.window.showTextDocument(editor.document, editor.viewColumn);
      await vscode.commands.executeCommand('editor.action.showHover');
    } else {
      void vscode.window.showInformationMessage('已刷新译文，请将光标移回原文后再次悬停');
    }
  } catch (e) {
    void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
  }
}
