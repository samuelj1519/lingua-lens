/** Marker in our hover markdown so we can ignore it when reading other providers. */
export const AI_TRANSLATE_HOVER_MARKER = '**AI 翻译**';

export function isAiTranslateHoverContent(text: string): boolean {
  return text.includes(AI_TRANSLATE_HOVER_MARKER) || text.includes('aiTranslate.hover.');
}
