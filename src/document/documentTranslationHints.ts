import * as vscode from 'vscode';
import { t } from '../l10n/uiL10n';

const ALREADY_TARGET_STATUS_MS = 3000;

export function showAlreadyTargetLanguageStatusHint(): void {
  void vscode.window.setStatusBarMessage(t('doc.alreadyTarget'), ALREADY_TARGET_STATUS_MS);
}
