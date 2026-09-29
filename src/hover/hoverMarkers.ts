/** Language-neutral marker embedded in our hover markdown. */
export const LINGUA_LENS_HOVER_MARKER = '<!-- linguaLens -->';

export function isAiTranslateHoverContent(text: string): boolean {
  return (
    text.includes(LINGUA_LENS_HOVER_MARKER) ||
    text.includes('**LinguaLens**') ||
    text.includes('**AI \u7ffb\u8bd1**') ||
    text.includes('linguaLens.hover.')
  );
}
