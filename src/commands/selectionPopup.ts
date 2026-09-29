import * as vscode from 'vscode';
import type { ConfigService } from '../config/ConfigService';
import type { PrivacyGuard } from '../privacy/PrivacyGuard';
import type { TranslationService } from '../translation/TranslationService';

export async function translateSelectionPopup(
  config: ConfigService,
  guard: PrivacyGuard,
  translation: TranslationService,
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    void vscode.window.showWarningMessage('请先选中文本');
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
  try {
    const result = await translation.translate(unit, cfg.targetLanguage, { kind: 'selection', uri: doc.uri });
    const pos = editor.selection.active;
    const deco = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: `  ➜ ${result.text.slice(0, 120)}${result.text.length > 120 ? '…' : ''}`,
        color: new vscode.ThemeColor('editorCodeLens.foreground'),
        margin: '0 0 0 1em',
      },
    });
    editor.setDecorations(deco, [new vscode.Range(pos, pos)]);
    const action = await vscode.window.showInformationMessage(
      result.text.slice(0, 500),
      '复制',
      '替换选区',
      '关闭',
    );
    deco.dispose();
    if (action === '复制') await vscode.env.clipboard.writeText(result.text);
    if (action === '替换选区') {
      await editor.edit((eb) => eb.replace(editor.selection, result.text));
    }
  } catch (e) {
    void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
  }
}
