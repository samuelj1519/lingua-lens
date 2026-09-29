import * as vscode from 'vscode';
import type { ConfigService } from '../config/ConfigService';
import { t } from '../l10n/uiL10n';
import type { PrivacyGuard } from '../privacy/PrivacyGuard';
import type { TranslationService } from '../translation/TranslationService';
import { getCommitMessageAtLine, getScmInputMessage } from '../git/GitService';
import { resolveSelectionTargetLanguage } from './selectionTarget';
import { handleCommandLlmError } from '../llm/handleCommandError';

export async function translateGitCommitAtLine(
  config: ConfigService,
  guard: PrivacyGuard,
  translation: TranslationService,
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.uri.scheme !== 'file') {
    void vscode.window.showWarningMessage(t('msg.git.useInRepo'));
    return;
  }
  const line = editor.selection.active.line + 1;
  const msg = await getCommitMessageAtLine(editor.document.uri.fsPath, line);
  if (!msg?.trim()) {
    void vscode.window.showWarningMessage(t('msg.git.noCommitMessage'));
    return;
  }
  await translatePlainText(msg, config, guard, translation, t('hover.title.gitCommit'));
}

export async function translateScmInput(
  config: ConfigService,
  guard: PrivacyGuard,
  translation: TranslationService,
): Promise<void> {
  const msg = getScmInputMessage();
  if (!msg?.trim()) {
    void vscode.window.showWarningMessage(t('msg.scm.empty'));
    return;
  }
  await translatePlainText(msg, config, guard, translation, 'SCM', true);
}

async function translatePlainText(
  text: string,
  config: ConfigService,
  guard: PrivacyGuard,
  translation: TranslationService,
  title: string,
  replaceScm = false,
): Promise<void> {
  if (!(await guard.ensureAcknowledged(true))) return;
  if (guard.containsSecret(text)) {
    void vscode.window.showWarningMessage(t('msg.secretNotSent'));
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
    if (replaceScm) {
      const replaceLabel = t('msg.replace');
      const viewLabel = t('msg.viewOnly');
      const replace = await vscode.window.showInformationMessage(t('msg.scm.replacePrompt'), replaceLabel, viewLabel);
      if (replace === replaceLabel) {
        const git = vscode.extensions.getExtension('vscode.git')?.exports as
          | { getAPI(version: number): { repositories: { inputBox: { value: string } }[] } }
          | undefined;
        const repo = git?.getAPI(1).repositories[0];
        if (repo) repo.inputBox.value = result.text;
      }
    }
    const doc = await vscode.workspace.openTextDocument({
      language: 'markdown',
      content: `# ${title} (${target})\n\n${result.text}\n\n---\n\n${text}`,
    });
    await vscode.window.showTextDocument(doc, { preview: true });
  } catch (e) {
    void handleCommandLlmError(e);
  }
}
