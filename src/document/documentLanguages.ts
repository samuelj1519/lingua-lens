/** Language IDs and extensions for paragraph hover / document translation. */
export const DOCUMENT_HOVER_LANGUAGE_IDS = new Set([
  'markdown',
  'plaintext',
  'restructuredtext',
  'asciidoc',
]);

export function isDocumentHoverLanguage(languageId: string, filePath?: string): boolean {
  if (DOCUMENT_HOVER_LANGUAGE_IDS.has(languageId)) return true;
  if (!filePath) return false;
  const lower = filePath.toLowerCase();
  return /\.(md|markdown|mdc|txt|rst|adoc|asciidoc)$/.test(lower);
}
