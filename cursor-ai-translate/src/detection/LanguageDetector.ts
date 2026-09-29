import type { Decision, LangFamily, TargetLang } from '../types';
import { familyOf } from './families';
import { containsSecret } from './secrets';
import { scriptStats, stripNeutral, totalUnits, unitsOfFamily } from './scripts';
import { STOPWORDS } from './stopwords';
import { checkSkipRules } from './SkipRules';
import { detect as tinyldDetect } from 'tinyld';

export interface DetectOptions {
  target: TargetLang;
  minLength: number;
  targetRatio: number;
  reliableMinLength: number;
  strictChineseVariant: boolean;
  userSkipPatterns: RegExp[];
  blockSecrets: boolean;
}

export type DetectedLang = LangFamily | 'unknown';

export interface LangIdBackend {
  detect(text: string, candidates: readonly LangFamily[]): { lang: DetectedLang; confidence: number };
}

export const defaultLangBackend: LangIdBackend = {
  detect(text, candidates) {
    try {
      const code = tinyldDetect(text);
      const map: Record<string, LangFamily> = {
        zh: 'zh',
        en: 'en',
        ja: 'ja',
        ko: 'ko',
        fr: 'fr',
        de: 'de',
        es: 'es',
        ru: 'ru',
      };
      let lang: DetectedLang = 'unknown';
      if (map[code]) lang = map[code];
      if (lang !== 'unknown' && candidates.includes(lang)) {
        return { lang, confidence: 0.7 };
      }
      return { lang, confidence: lang === 'unknown' ? 0 : 0.5 };
    } catch {
      return { lang: 'unknown', confidence: 0 };
    }
  },
};

function codePointLength(s: string): number {
  return [...s].length;
}

function classifyByScript(s: ReturnType<typeof scriptStats>): LangFamily | 'latin' | 'cyrillic' | 'unknown' {
  const total = totalUnits(s);
  const cjk = s.han + s.kana + s.hangul;
  if (s.hangul > 0 && s.hangul >= 0.3 * Math.max(1, cjk)) return 'ko';
  if (s.kana > 0) return 'ja';
  if (s.han > 0 && s.han >= 0.5 * Math.max(1, total)) return 'zh';
  if (s.cyrillicWords >= s.latinWords && s.cyrillicWords > 0) return 'cyrillic';
  if (s.latinWords > 0) return 'latin';
  return 'unknown';
}

function shortTextHeuristic(core: string, script: 'latin' | 'cyrillic'): LangFamily | 'unknown' {
  if (script === 'cyrillic') return 'ru';
  const score: Record<string, number> = { en: 0, fr: 0, de: 0, es: 0 };
  if (/[äöüß]/i.test(core)) score.de += 3;
  if (/[ñ¿¡]/i.test(core)) score.es += 3;
  if (/[àâçéèêëîïôûùœ]/i.test(core)) score.fr += 2;
  const words = core.toLowerCase().split(/\s+/);
  for (const w of words) {
    for (const lang of Object.keys(score)) {
      if (STOPWORDS[lang]?.has(w)) score[lang]++;
    }
  }
  const sorted = Object.entries(score).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] >= 1 && sorted[0][1] > (sorted[1]?.[1] ?? 0)) {
    return sorted[0][0] as LangFamily;
  }
  return 'unknown';
}

function candidatesFor(script: 'latin' | 'cyrillic'): LangFamily[] {
  if (script === 'cyrillic') return ['ru'];
  return ['en', 'fr', 'de', 'es'];
}

export function decide(text: string, opts: DetectOptions, backend: LangIdBackend = defaultLangBackend): Decision {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (codePointLength(trimmed) < opts.minLength) {
    return { action: 'skip', reason: 'tooShort' };
  }
  const skip = checkSkipRules(trimmed, opts);
  if (skip) return { action: 'skip', reason: skip };
  if (opts.blockSecrets && containsSecret(trimmed)) {
    return { action: 'skip', reason: 'secret' };
  }

  const core = stripNeutral(trimmed);
  const s = scriptStats(core);
  const total = totalUnits(s);
  if (total === 0) return { action: 'skip', reason: 'noLetters' };

  const targetFamily = familyOf(opts.target);
  if (['zh', 'ja', 'ko'].includes(targetFamily)) {
    const targetUnits = unitsOfFamily(s, targetFamily);
    if (targetUnits / total >= opts.targetRatio) {
      return { action: 'skip', reason: 'targetRatio', detected: targetFamily };
    }
  }

  let detected: DetectedLang | 'latin' | 'cyrillic' = classifyByScript(s);
  if (detected === 'latin' || detected === 'cyrillic') {
    const letters = detected === 'latin' ? s.latinLetters : s.cyrillicLetters;
    if (letters >= opts.reliableMinLength) {
      const r = backend.detect(core, candidatesFor(detected));
      detected = r.confidence >= 0.5 ? r.lang : shortTextHeuristic(core, detected);
    } else {
      detected = shortTextHeuristic(core, detected);
    }
  }

  if (['en', 'fr', 'de', 'es', 'ru'].includes(targetFamily)) {
    if (detected === targetFamily) {
      return { action: 'skip', reason: 'sameFamily', detected };
    }
    if (detected === 'unknown') {
      return decideUnknownShort(s, targetFamily);
    }
  }

  if (targetFamily === 'ja' && detected === 'zh' && s.han < 4) {
    return { action: 'skip', reason: 'unreliableShort', detected: 'zh' };
  }

  if (detected !== 'unknown' && familyOf(detected) === targetFamily) {
    return { action: 'skip', reason: 'sameFamily', detected };
  }

  if (detected === 'unknown') {
    return decideUnknownShort(s, targetFamily);
  }

  return { action: 'translate', detected, confidence: 0.8 };
}

function decideUnknownShort(s: ReturnType<typeof scriptStats>, targetFamily: LangFamily): Decision {
  if (['zh', 'ja', 'ko'].includes(targetFamily)) {
    return { action: 'translate', detected: 'unknown', confidence: 0.6 };
  }
  if (['en', 'fr', 'de', 'es'].includes(targetFamily)) {
    if (s.latinWords > 0 && s.han + s.kana + s.hangul === 0) {
      return { action: 'skip', reason: 'unreliableShort' };
    }
    return { action: 'translate', detected: 'unknown', confidence: 0.6 };
  }
  if (targetFamily === 'ru') {
    if (s.cyrillicWords > 0 && s.latinWords === 0) {
      return { action: 'skip', reason: 'unreliableShort' };
    }
    return { action: 'translate', detected: 'unknown', confidence: 0.6 };
  }
  return { action: 'translate', detected: 'unknown', confidence: 0.6 };
}
