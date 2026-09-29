import { PLACEHOLDER_RE } from '../parsing/placeholders';

export interface ScriptStats {
  han: number;
  kana: number;
  hangul: number;
  latinWords: number;
  cyrillicWords: number;
  otherWords: number;
  latinLetters: number;
  cyrillicLetters: number;
}

const URL_RE = /https?:\/\/\S+|mailto:\S+/gi;
const PATH_RE = /(?:^|[\s(])([~./\\]?[\w@.-]+(?:[/\\][\w@.-]+)+)/g;

export function stripNeutral(text: string): string {
  let t = text.replace(PLACEHOLDER_RE, ' ');
  t = t.replace(URL_RE, ' ');
  t = t.replace(PATH_RE, ' ');
  t = t.replace(/`[^`]+`/g, ' ');
  t = t.replace(/[\d_,.%+-]+/g, ' ');
  return t;
}

function isIdentifierWord(w: string): boolean {
  if (/[_\d]/.test(w) && /[a-z]/.test(w)) return true;
  if (/^[A-Z0-9_]+$/.test(w) && w.length <= 6) return true;
  if (/^[a-z]+[A-Z]/.test(w)) return true;
  return false;
}

export function scriptStats(text: string): ScriptStats {
  const s: ScriptStats = {
    han: 0,
    kana: 0,
    hangul: 0,
    latinWords: 0,
    cyrillicWords: 0,
    otherWords: 0,
    latinLetters: 0,
    cyrillicLetters: 0,
  };
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp >= 0x3040 && cp <= 0x30ff) s.kana++;
    else if (cp >= 0xac00 && cp <= 0xd7af) s.hangul++;
    else if (cp >= 0x4e00 && cp <= 0x9fff) s.han++;
  }
  const words = text.split(/[^\p{L}\p{N}_]+/u).filter(Boolean);
  for (const w of words) {
    if (isIdentifierWord(w)) continue;
    if (/^[a-zA-Z]+$/.test(w)) {
      s.latinWords++;
      s.latinLetters += w.length;
    } else if (/^[\u0400-\u04FF]+$/.test(w)) {
      s.cyrillicWords++;
      s.cyrillicLetters += w.length;
    } else if (/\p{Script=Han}/u.test(w)) {
      /* counted in han */
    } else if (w.length > 0) {
      s.otherWords++;
    }
  }
  return s;
}

export function totalUnits(s: ScriptStats): number {
  return s.han + s.kana + s.hangul + s.latinWords + s.cyrillicWords + s.otherWords;
}

export function unitsOfFamily(s: ScriptStats, family: string): number {
  if (family === 'zh') return s.kana > 0 ? 0 : s.han;
  if (family === 'ja') return s.kana > 0 ? s.kana + s.han : 0;
  if (family === 'ko') return s.hangul;
  if (family === 'ru') return s.cyrillicWords;
  if (['en', 'fr', 'de', 'es'].includes(family)) return s.latinWords;
  return 0;
}
