import type { TargetLang } from '../types';
import type { ConfigurationInspect } from '../config/targetLanguageInspect';

export const BUILTIN_TARGET_LANGUAGES: readonly TargetLang[] = [
  'zh-CN',
  'zh-TW',
  'en',
  'ja',
  'ko',
  'fr',
  'de',
  'es',
  'ru',
];

/** Native names for the settings panel language control (not translated). */
export const TARGET_LANGUAGE_NATIVE_LABELS: Record<TargetLang, string> = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  ru: 'Русский',
};

export function isBuiltinTargetLanguage(value: string): value is TargetLang {
  return (BUILTIN_TARGET_LANGUAGES as readonly string[]).includes(value);
}

/** True when the user has never written targetLanguage at any configuration layer. */
export function isTargetLanguageUnset(inspect: ConfigurationInspect<string> | undefined): boolean {
  if (!inspect) return true;
  return (
    inspect.globalValue === undefined &&
    inspect.workspaceValue === undefined &&
    inspect.workspaceFolderValue === undefined
  );
}

/**
 * Map Cursor/VS Code UI locale to the closest built-in target language.
 * Unmatched UI locales fall back to English (not zh-CN) so English UI users get English targets by default.
 */
export function mapVscodeUiLanguageToTarget(uiLanguage: string): TargetLang {
  const tag = uiLanguage.toLowerCase().replace('_', '-');
  if (tag.startsWith('zh-cn') || tag === 'zh-hans' || tag === 'zh') return 'zh-CN';
  if (tag.startsWith('zh-tw') || tag.startsWith('zh-hk') || tag === 'zh-hant') return 'zh-TW';
  if (tag.startsWith('ja')) return 'ja';
  if (tag.startsWith('ko')) return 'ko';
  if (tag.startsWith('fr')) return 'fr';
  if (tag.startsWith('de')) return 'de';
  if (tag.startsWith('es')) return 'es';
  if (tag.startsWith('ru')) return 'ru';
  if (tag === 'en' || tag.startsWith('en-')) return 'en';
  return 'en';
}

export const CURSOR_UI_BOOTSTRAP_STATE_KEY = 'targetLanguage.cursorUiBootstrapDone';
export const CURSOR_UI_BOOTSTRAP_HINT_KEY = 'targetLanguage.cursorUiBootstrapHint';
