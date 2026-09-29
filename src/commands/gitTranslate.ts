import * as vscode from 'vscode';
import type { ConfigService } from '../config/ConfigService';
import type { PrivacyGuard } from '../privacy/PrivacyGuard';
import type { TranslationService } from '../translation/TranslationService';
import { getCommitMessageAtLine, getScmInputMessage } from '../git/GitService';
import { resolveSelectionTargetLanguage } from './selectionTarget';

export async function translateGitCommitAtLine(
  config: ConfigService,
  guard: PrivacyGuard,
  translation: TranslationService,
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.uri.scheme !== 'file') {
    void vscode.window.showWarningMessage('请在仓库内的文件中使用此命令');
    return;
  }
  const line = editor.selection.active.line + 1;
  const msg = await getCommitMessageAtLine(editor.document.uri.fsPath, line);
  if (!msg?.trim()) {
    void vscode.window.showWarningMessage('未找到该行的 Git 提交说明');
    return;
  }
  await translatePlainText(msg, config, guard, translation, 'Git 提交说明');
}

export async function translateScmInput(
  config: ConfigService,
  guard: PrivacyGuard,
  translation: TranslationService,
): Promise<void> {
  const msg = getScmInputMessage();
  if (!msg?.trim()) {
    void vscode.window.showWarningMessage('SCM 提交说明框为空');
    return;
  }
  await translatePlainText(msg, config, guard, translation, 'SCM 提交说明', true);
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
    if (replaceScm) {
      const replace = await vscode.window.showInformationMessage(
        '翻译完成，是否替换 SCM 输入框内容？',
        '替换',
        '仅查看',
      );
      if (replace === '替换') {
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
    void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
  }
}
