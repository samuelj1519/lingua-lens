import * as vscode from 'vscode';
import { adapterForDocument } from './structured/registry';

export const STRUCTURED_LANGUAGE_IDS = new Set(['json', 'jsonc', 'yaml', 'toml', 'xml']);

const STRUCTURED_EXT_RE = /\.(json|jsonc|yaml|yml|toml|xml|plist)$/i;

const STRUCTURED_LANG_WHEN =
  'resourceLangId =~ /^(json|jsonc|yaml|toml|xml)$/';

/** VS Code `when` clause fragment for editor menus / title bar (structured + md + txt). */
export const DOCUMENT_TRANSLATE_WHEN =
  `resourceScheme != lingualens && (resourceLangId == markdown || resourceLangId == plaintext || ${STRUCTURED_LANG_WHEN} || resourceExtname =~ /\\.(json|jsonc|yaml|yml|toml|xml|plist)$/i)`;

export const DOCUMENT_TRANSLATE_KEYBINDING_WHEN =
  'editorTextFocus && (resourceLangId =~ /^(markdown|plaintext|json|jsonc|yaml|toml|xml)$/ || resourceExtname =~ /\\.(md|markdown|txt|json|jsonc|yaml|yml|toml|xml|plist)$/i)';

export const EXPLORER_TRANSLATE_EXT_RE =
  /\.(md|markdown|txt|json|jsonc|yaml|yml|toml|xml|plist)$/i;

export function isStructuredWholeDocument(doc: vscode.TextDocument): boolean {
  return adapterForDocument(doc.languageId, doc.fileName) !== undefined;
}

export type DocumentRenderMode = 'prose' | 'structured';

export function documentRenderMode(doc: vscode.TextDocument): DocumentRenderMode {
  return isStructuredWholeDocument(doc) ? 'structured' : 'prose';
}

export function matchesStructuredExtension(fileName: string): boolean {
  return STRUCTURED_EXT_RE.test(fileName);
}

/** CodeLens registration: same coverage as editor/title translate actions (excludes `lingualens:`). */
export const DOCUMENT_TRANSLATE_CODE_LENS_SELECTORS: vscode.DocumentFilter[] = [
  { language: 'markdown' },
  { language: 'plaintext' },
  { language: 'json' },
  { language: 'jsonc' },
  { language: 'yaml' },
  { language: 'toml' },
  { language: 'xml' },
  { pattern: '**/*.json' },
  { pattern: '**/*.jsonc' },
  { pattern: '**/*.yaml' },
  { pattern: '**/*.yml' },
  { pattern: '**/*.toml' },
  { pattern: '**/*.xml' },
  { pattern: '**/*.plist' },
];
