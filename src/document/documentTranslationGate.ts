/** True when whole-document translation should not run (no preview, no side file). */
export function isDocumentAlreadyInTargetLanguage(
  translatableCount: number,
  forceTranslate: boolean,
): boolean {
  return translatableCount === 0 && !forceTranslate;
}
