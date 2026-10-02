import * as vscode from 'vscode';
import { PREVIEW_SCHEME } from '../constants/previewScheme';
import { configFilePath, isConfigHoverLanguage } from '../parsing/languages/configLanguages';
import { isStructuredWholeDocument } from './structuredDocumentProfile';

const DOC_LANGS = new Set(['markdown', 'plaintext']);

export function canTranslateWholeDocument(doc: vscode.TextDocument): boolean {
  if (doc.uri.scheme === PREVIEW_SCHEME) return false;
  const path = configFilePath({ uri: doc.uri.toString() });
  if (isConfigHoverLanguage(doc.languageId, path)) return false;
  if (isStructuredWholeDocument(doc)) return true;
  if (DOC_LANGS.has(doc.languageId)) return true;
  const ext = doc.fileName.toLowerCase();
  return ext.endsWith('.md') || ext.endsWith('.markdown') || ext.endsWith('.mdc') || ext.endsWith('.txt');
}
