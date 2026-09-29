import { restore } from '../parsing/placeholders';
import type { Placeholder } from '../types';

export function normalizeForComparison(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function isSameTranslationAsSource(
  source: string,
  translated: string,
  placeholders: Placeholder[] = [],
): boolean {
  const src = normalizeForComparison(source);
  const r = restore(translated, placeholders);
  const out = normalizeForComparison(r.ok ? r.text : translated);
  return src.length > 0 && src === out;
}
