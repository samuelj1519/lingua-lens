import * as vscode from 'vscode';
import { getCommitMessageAtLine } from '../git/GitService';
import { decide } from '../detection/LanguageDetector';
import type { TranslateConfig } from '../config/types';

/** True when cursor is in the trailing blame gutter area at end of line. */
export function isGitBlameHoverPosition(doc: vscode.TextDocument, pos: vscode.Position): boolean {
  const line = doc.lineAt(pos.line);
  const len = line.text.length;
  if (len === 0) return pos.character === 0;
  const trailing = pos.character >= len - 1 || (pos.character >= len - 3 && /\s$/.test(line.text));
  return trailing;
}

export async function fetchCommitMessageForBlame(
  doc: vscode.TextDocument,
  line: number,
): Promise<string | undefined> {
  if (doc.uri.scheme !== 'file') return undefined;
  return getCommitMessageAtLine(doc.uri.fsPath, line);
}

export function shouldTranslateCommitMessage(msg: string, cfg: TranslateConfig): boolean {
  const det = decide(msg, {
    target: cfg.targetLanguage,
    minLength: cfg.detection.minLength,
    targetRatio: cfg.detection.targetRatio,
    reliableMinLength: cfg.detection.reliableMinLength,
    strictChineseVariant: cfg.detection.strictChineseVariant,
    userSkipPatterns: cfg.detection.skipPatterns.map((p) => new RegExp(p)),
  });
  if (det.action === 'translate') return true;
  if (det.detected === 'en' || det.detected === 'other') return true;
  return false;
}
