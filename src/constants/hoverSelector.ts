import type * as vscode from 'vscode';

/** VS Code does not treat `language: '*'` as a wildcard; omit language and match by scheme only. */
export function buildHoverDocumentSelector(schemes: readonly string[]): vscode.DocumentSelector {
  const unique = [...new Set(schemes)];
  return unique.map((scheme) => ({ scheme }));
}
