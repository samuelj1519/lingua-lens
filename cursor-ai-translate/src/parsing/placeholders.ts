import type { Placeholder } from '../types';

export const PLACEHOLDER_RE = /⟦P\d+⟧|⟦U\d+⟧/g;

let counter = 0;

export function resetPlaceholderCounter(): void {
  counter = 0;
}

export function protect(text: string): { text: string; placeholders: Placeholder[] } {
  const placeholders: Placeholder[] = [];
  let result = text;

  const patterns: RegExp[] = [
    /\$\{[^}]+\}/g,
    /%\([^)]+\)[sdifxXeEgGcp%]/g,
    /%[-+ #0]*\d*(\.\d+)?[sdifxXeEgGcp%]/g,
    /\{\{\s*[\w.]+\s*\}\}/g,
    /\{[a-zA-Z_][\w.]*\}/g,
    /\{\d+\}/g,
    /https?:\/\/\S+/gi,
  ];

  for (const re of patterns) {
    result = result.replace(re, (match) => {
      const token = `⟦P${counter++}⟧`;
      placeholders.push({ token, original: match });
      return token;
    });
  }

  return { text: result, placeholders };
}

export function restore(translated: string, placeholders: Placeholder[]): { text: string; ok: boolean } {
  let text = translated;
  let ok = true;
  for (const ph of placeholders) {
    if (!text.includes(ph.token)) {
      ok = false;
      continue;
    }
    text = text.replace(ph.token, ph.original);
  }
  for (const ph of placeholders) {
    if (text.includes(ph.token)) ok = false;
  }
  return { text, ok };
}
