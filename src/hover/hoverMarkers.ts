/** Language-neutral marker embedded in our hover markdown. */
export const AI_TRANSLATE_HOVER_MARKER = '<!-- aiTranslate -->';

export function isAiTranslateHoverContent(text: string): boolean {
  return (
    text.includes(AI_TRANSLATE_HOVER_MARKER) ||
    text.includes('**LinguaLens**') ||
    text.includes('**AI \u7ffb\u8bd1**') ||
    text.includes('aiTranslate.hover.')
  );
}
