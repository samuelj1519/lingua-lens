import * as vscode from 'vscode';
import { configFilePath, isConfigHoverLanguage } from '../parsing/languages/configLanguages';

const DOC_LANGS = new Set(['markdown', 'plaintext']);

export function canTranslateWholeDocument(doc: vscode.TextDocument): boolean {
  if (doc.uri.scheme === 'aitranslate') return false;
  const path = configFilePath({ uri: doc.uri.toString() });
  if (isConfigHoverLanguage(doc.languageId, path)) return false;
  if (DOC_LANGS.has(doc.languageId)) return true;
  const ext = doc.fileName.toLowerCase();
  return ext.endsWith('.md') || ext.endsWith('.markdown') || ext.endsWith('.mdc') || ext.endsWith('.txt');
}
