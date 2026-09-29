import * as vscode from 'vscode';
import type { ConfigService } from '../config/ConfigService';
import { decide } from '../detection/LanguageDetector';

export class SelectionTranslateCodeActionProvider implements vscode.CodeActionProvider {
  constructor(private readonly config: ConfigService) {}

  provideCodeActions(
    doc: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    _context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    const cfg = this.config.get(doc.uri);
    if (!cfg.enabled) return [];
    const sel = range instanceof vscode.Selection ? range : doc.getWordRangeAtPosition(range.start);
    if (!sel || sel.isEmpty) return [];

    const text = doc.getText(sel);
    const det = decide(text, {
      target: cfg.targetLanguage,
      minLength: cfg.detection.minLength,
      targetRatio: cfg.detection.targetRatio,
      reliableMinLength: cfg.detection.reliableMinLength,
      strictChineseVariant: cfg.detection.strictChineseVariant,
      userSkipPatterns: cfg.detection.skipPatterns.map((p) => new RegExp(p)),
      blockSecrets: cfg.privacy.blockSecrets,
    });
    if (det.action === 'skip') return [];

    const action = new vscode.CodeAction('Translate Selection', vscode.CodeActionKind.RefactorRewrite);
    action.command = {
      command: 'aiTranslate.translateSelectionPopup',
      title: 'Translate Selection',
    };
    return [action];
  }
}
