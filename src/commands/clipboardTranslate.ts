import * as vscode from 'vscode';
import type { ConfigService } from '../config/ConfigService';
import type { PrivacyGuard } from '../privacy/PrivacyGuard';
import type { TranslationService } from '../translation/TranslationService';
import { resolveSelectionTargetLanguage } from './selectionTarget';

export async function translateClipboardOrSelection(
  config: ConfigService,
  guard: PrivacyGuard,
  translation: TranslationService,
): Promise<void> {
  const savedClipboard = await vscode.env.clipboard.readText();
  let text: string | undefined;

  const terminal = vscode.window.activeTerminal;
  if (terminal) {
    await vscode.commands.executeCommand('workbench.action.terminal.copySelection');
    const copied = await vscode.env.clipboard.readText();
    await vscode.env.clipboard.writeText(savedClipboard);
    if (copied.trim()) text = copied;
  }

  if (!text?.trim()) {
    text = savedClipboard?.trim() ? savedClipboard : undefined;
  }

  if (!text?.trim()) {
    void vscode.window.showWarningMessage('未找到终端选区或剪贴板文本');
    return;
  }

  if (!(await guard.ensureAcknowledged(true))) return;
  if (guard.containsSecret(text)) {
    void vscode.window.showWarningMessage('疑似密钥，未发送');
    return;
  }

  const cfg = config.get();
  const target = resolveSelectionTargetLanguage(text, cfg);
  const unit = {
    kind: 'string' as const,
    range: { start: 0, end: text.length },
    rawText: text,
    text,
    placeholders: [],
    languageId: 'plaintext',
    source: 'selection' as const,
  };

  try {
    const result = await translation.translate(unit, target, { kind: 'selection' });
    const panel = await vscode.window.showTextDocument(
      await vscode.workspace.openTextDocument({
        language: 'markdown',
        content: `# 翻译 (${target})\n\n${result.text}\n`,
      }),
      { viewColumn: vscode.ViewColumn.Beside, preview: true },
    );
    const copy = await vscode.window.showInformationMessage('翻译完成', '复制译文');
    if (copy === '复制译文') {
      await vscode.env.clipboard.writeText(result.text);
    }
    void panel;
  } catch (e) {
    void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
  }
}
