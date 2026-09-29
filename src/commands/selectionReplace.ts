import * as vscode from 'vscode';
import type { ConfigService } from '../config/ConfigService';
import type { PrivacyGuard } from '../privacy/PrivacyGuard';
import type { TranslationService } from '../translation/TranslationService';
import type { TargetLang } from '../types';
import { TARGET_LANG_NAMES } from '../detection/families';
import { resolveSelectionTargetLanguage } from './selectionTarget';

export async function translateReplaceSelection(
  config: ConfigService,
  guard: PrivacyGuard,
  translation: TranslationService,
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    void vscode.window.showWarningMessage('请先选中要翻译的文本');
    return;
  }
  const target = await pickTargetLanguage(editor.document.getText(editor.selection), config);
  if (!target) return;
  await runSelectionTransform(editor, config, guard, translation, target, 'replace');
}

export async function translateInsertBelow(
  config: ConfigService,
  guard: PrivacyGuard,
  translation: TranslationService,
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    void vscode.window.showWarningMessage('请先选中要翻译的文本');
    return;
  }
  const target = await pickTargetLanguage(editor.document.getText(editor.selection), config);
  if (!target) return;
  await runSelectionTransform(editor, config, guard, translation, target, 'below');
}

async function pickTargetLanguage(
  text: string,
  config: ConfigService,
): Promise<TargetLang | undefined> {
  const cfg = config.get();
  const suggested = resolveSelectionTargetLanguage(text, cfg);
  const items = (Object.keys(TARGET_LANG_NAMES) as TargetLang[]).map((id) => ({
    label: TARGET_LANG_NAMES[id],
    description: id === suggested ? '推荐' : undefined,
    id,
  }));
  const pick = await vscode.window.showQuickPick(items, {
    title: '翻译目标语言',
    placeHolder: TARGET_LANG_NAMES[suggested],
  });
  return pick?.id;
}

async function runSelectionTransform(
  editor: vscode.TextEditor,
  _config: ConfigService,
  guard: PrivacyGuard,
  translation: TranslationService,
  target: TargetLang,
  mode: 'replace' | 'below',
): Promise<void> {
  const doc = editor.document;
  const block = guard.check(doc);
  if (block === 'excluded') {
    void vscode.window.showWarningMessage('该文件已被排除');
    return;
  }
  if (!(await guard.ensureAcknowledged(true))) return;

  const text = doc.getText(editor.selection);
  if (guard.containsSecret(text)) {
    void vscode.window.showWarningMessage('疑似密钥，未发送');
    return;
  }

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
    const result = await translation.translate(unit, target, { kind: 'selection', uri: doc.uri });
    if (mode === 'replace') {
      await editor.edit((eb) => eb.replace(editor.selection, result.text));
    } else {
      const end = editor.selection.end;
      const line = doc.lineAt(end.line);
      const insertPos = line.text.length === end.character ? end.line + 1 : end.line;
      const prefix = doc.lineAt(insertPos).text.match(/^\s*/)?.[0] ?? '';
      await editor.edit((eb) => {
        const pos = new vscode.Position(insertPos, 0);
        eb.insert(pos, `${prefix}${result.text}\n`);
      });
    }
  } catch (e) {
    void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
  }
}
