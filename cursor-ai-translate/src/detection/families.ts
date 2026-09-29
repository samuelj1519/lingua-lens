import type { LangFamily, TargetLang } from '../types';

const TARGET_TO_FAMILY: Record<TargetLang, LangFamily> = {
  'zh-CN': 'zh',
  'zh-TW': 'zh',
  en: 'en',
  ja: 'ja',
  ko: 'ko',
  fr: 'fr',
  de: 'de',
  es: 'es',
  ru: 'ru',
};

export function familyOf(lang: TargetLang | LangFamily | string): LangFamily {
  if (lang in TARGET_TO_FAMILY) return TARGET_TO_FAMILY[lang as TargetLang];
  if (lang === 'zh' || lang === 'latin' || lang === 'cyrillic') {
    if (lang === 'latin') return 'en';
    if (lang === 'cyrillic') return 'ru';
    return lang as LangFamily;
  }
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
  return map[lang] ?? 'other';
}

export const TARGET_LANG_NAMES: Record<TargetLang, string> = {
  'zh-CN': 'Simplified Chinese (zh-CN)',
  'zh-TW': 'Traditional Chinese (zh-TW)',
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  ru: 'Russian',
};
