import * as vscode from 'vscode';
import type { ConfigService } from '../config/ConfigService';
import { t } from '../l10n/uiL10n';
import type { PrivacyGuard } from '../privacy/PrivacyGuard';
import type { TranslationService } from '../translation/TranslationService';
import { handleCommandLlmError } from '../llm/handleCommandError';

export async function translateSelectionPopup(
  config: ConfigService,
  guard: PrivacyGuard,
  translation: TranslationService,
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    void vscode.window.showWarningMessage(t('msg.selectTextFirst'));
    return;
  }
  const doc = editor.document;
  if (guard.check(doc) === 'excluded') return;
  if (!(await guard.ensureAcknowledged(true))) return;
  const text = doc.getText(editor.selection);
  const cfg = config.get(doc.uri);
  const unit = {
    kind: 'string' as const,
    range: { start: doc.offsetAt(editor.selection.start), end: doc.offsetAt(editor.selection.end) },
    rawText: text,
    text,
    placeholders: [],
    languageId: doc.languageId,
    source: 'selection' as const,
  };
  const showResult = async (bypassCache: boolean) => {
    const result = await translation.translate(unit, cfg.targetLanguage, {
      kind: 'selection',
      bypassCache,
      uri: doc.uri,
    });
    const pos = editor.selection.active;
    const deco = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: `  ➜ ${result.text.slice(0, 120)}${result.text.length > 120 ? '…' : ''}`,
        color: new vscode.ThemeColor('editorCodeLens.foreground'),
        margin: '0 0 0 1em',
      },
    });
    editor.setDecorations(deco, [new vscode.Range(pos, pos)]);
    const copyLabel = t('msg.copy');
    const replaceLabel = t('msg.replaceSelection');
    const refreshLabel = t('hover.action.refresh');
    const closeLabel = t('msg.close');
    const action = await vscode.window.showInformationMessage(
      result.text.slice(0, 500),
      copyLabel,
      replaceLabel,
      refreshLabel,
      closeLabel,
    );
    deco.dispose();
    if (action === copyLabel) await vscode.env.clipboard.writeText(result.text);
    if (action === replaceLabel) {
      await editor.edit((eb) => eb.replace(editor.selection, result.text));
    }
    if (action === refreshLabel) {
      await showResult(true);
    }
  };

  try {
    await showResult(false);
  } catch (e) {
    void handleCommandLlmError(e);
  }
}
