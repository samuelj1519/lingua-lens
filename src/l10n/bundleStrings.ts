import type { TargetLang } from '../types';
import { isBuiltinTargetLanguage } from './targetLanguage';

export type BundleLocale =
  | 'en'
  | 'zh-cn'
  | 'zh-tw'
  | 'ja'
  | 'ko'
  | 'fr'
  | 'de'
  | 'es'
  | 'ru'
  | 'pt-br';

const TARGET_TO_BUNDLE: Record<TargetLang, BundleLocale> = {
  'zh-CN': 'zh-cn',
  'zh-TW': 'zh-tw',
  en: 'en',
  ja: 'ja',
  ko: 'ko',
  fr: 'fr',
  de: 'de',
  es: 'es',
  ru: 'ru',
};

export function targetLanguageToBundleLocale(target: TargetLang): BundleLocale {
  return TARGET_TO_BUNDLE[target] ?? 'en';
}

export function bundleLocaleForPanelUi(rawTarget: string): BundleLocale {
  if (isBuiltinTargetLanguage(rawTarget)) {
    return targetLanguageToBundleLocale(rawTarget);
  }
  return 'en';
}

export function loadBundleStrings(
  readJson: (locale: BundleLocale) => Record<string, string> | undefined,
  target: TargetLang,
): Record<string, string> {
  const primary = targetLanguageToBundleLocale(target);
  const en = readJson('en') ?? {};
  const localized = readJson(primary) ?? {};
  return { ...en, ...localized };
}

/** Panel UI strings: built-in targets use that locale; custom values use English only. */
export function loadBundleStringsForPanel(
  readJson: (locale: BundleLocale) => Record<string, string> | undefined,
  rawTarget: string,
): Record<string, string> {
  const primary = bundleLocaleForPanelUi(rawTarget);
  const en = readJson('en') ?? {};
  if (primary === 'en') return { ...en };
  const localized = readJson(primary) ?? {};
  return { ...en, ...localized };
}

/** Placeholder parity: `{0}` in English must appear in translation. */
export function bundlePlaceholderMismatches(
  en: Record<string, string>,
  other: Record<string, string>,
): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(en)) {
    const a = en[key];
    const b = other[key];
    if (!b) {
      errors.push(`missing key ${key}`);
      continue;
    }
    const ph = [...a.matchAll(/\{(\d+)\}/g)].map((m) => m[0]);
    for (const p of ph) {
      if (!b.includes(p)) errors.push(`${key}: missing placeholder ${p}`);
    }
  }
  return errors;
}
