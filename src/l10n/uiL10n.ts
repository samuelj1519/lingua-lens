import * as fs from 'node:fs';
import * as path from 'node:path';
import { bundleLocaleForPanelUi, type BundleLocale } from './bundleStrings';

let extensionPath: string | undefined;
let getRawTargetLanguage: (() => string) | undefined;
const bundleCache = new Map<BundleLocale, Record<string, string>>();

export function initUiL10n(extPath: string, readRawTarget: () => string): void {
  extensionPath = extPath;
  getRawTargetLanguage = readRawTarget;
  bundleCache.clear();
}

export function resetUiL10nCache(): void {
  bundleCache.clear();
}

function loadBundleFile(locale: BundleLocale): Record<string, string> {
  if (!extensionPath) return {};
  const cached = bundleCache.get(locale);
  if (cached) return cached;
  const file = locale === 'en' ? 'bundle.l10n.json' : `bundle.l10n.${locale}.json`;
  const p = path.join(extensionPath, 'l10n', file);
  if (!fs.existsSync(p)) {
    bundleCache.set(locale, {});
    return {};
  }
  const data = JSON.parse(fs.readFileSync(p, 'utf8')) as Record<string, string>;
  bundleCache.set(locale, data);
  return data;
}

function mergedStringsForRawTarget(raw: string): Record<string, string> {
  const locale = bundleLocaleForPanelUi(raw);
  const en = loadBundleFile('en');
  if (locale === 'en') return { ...en };
  return { ...en, ...loadBundleFile(locale) };
}

/** Format `{0}` placeholders like `vscode.l10n.t`. */
export function formatMessage(template: string, args: Array<string | number>): string {
  return template.replace(/\{(\d+)\}/g, (_, index: string) => {
    const i = Number(index);
    return i < args.length ? String(args[i]) : `{${index}}`;
  });
}

/**
 * Runtime UI string by `linguaLens.targetLanguage` (custom / unknown → English bundle).
 */
export function t(key: string, ...args: Array<string | number>): string {
  const raw = getRawTargetLanguage?.() ?? 'en';
  const strings = mergedStringsForRawTarget(raw);
  const en = loadBundleFile('en');
  const template = strings[key] ?? en[key] ?? key;
  return args.length ? formatMessage(template, args) : template;
}

/** Full merged map for settings panel / tests. */
export function getUiStringsForRawTarget(raw: string): Record<string, string> {
  return mergedStringsForRawTarget(raw);
}
