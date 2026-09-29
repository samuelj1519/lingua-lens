/** True when a translation is safe to store and show to the user. */
export function isCacheableTranslation(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/^[\s\p{P}\p{S}]+$/u.test(t)) return false;
  return true;
}
