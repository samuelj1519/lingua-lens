import * as vscode from 'vscode';
import { PREVIEW_SCHEME } from '../constants/previewScheme';
import {
  DOCUMENT_TRANSLATE_CODE_LENS_SELECTORS,
  matchesStructuredExtension,
  STRUCTURED_LANGUAGE_IDS,
} from './structuredDocumentProfile';

const PROSE_LANGUAGE_IDS = new Set(['markdown', 'plaintext']);
const PROSE_EXT_RE = /\.(md|markdown|mdc|txt)$/i;

/**
 * Whether whole-document translate / side file / refresh apply to this editor document.
 * Keep in sync with `package.json` menu `when` clauses and `DOCUMENT_TRANSLATE_CODE_LENS_SELECTORS`.
 */
export function isWholeDocumentTranslationSupported(doc: vscode.TextDocument): boolean {
  if (doc.uri.scheme === PREVIEW_SCHEME) return false;

  const { languageId, fileName } = doc;

  if (STRUCTURED_LANGUAGE_IDS.has(languageId)) return true;
  if (matchesStructuredExtension(fileName)) return true;

  if (PROSE_LANGUAGE_IDS.has(languageId)) return true;
  if (PROSE_EXT_RE.test(fileName)) return true;

  return false;
}

/** @deprecated Use {@link isWholeDocumentTranslationSupported}. */
export const canTranslateWholeDocument = isWholeDocumentTranslationSupported;

export { DOCUMENT_TRANSLATE_CODE_LENS_SELECTORS };
