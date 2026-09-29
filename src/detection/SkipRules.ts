import type { SkipReason } from '../types';
import type { DetectOptions } from './LanguageDetector';

const RULES: Array<{ reason: SkipReason; re: RegExp }> = [
  { reason: 'i18nKey', re: /^[a-z][\w-]*(\.[\w-]+){1,}$/ },
  { reason: 'i18nKey', re: /^[a-z][\w-]*(:[\w.-]+)+$/ },
  { reason: 'identifier', re: /^[A-Za-z_$][A-Za-z0-9_$]*$/ },
  { reason: 'identifier', re: /^[a-z0-9]+(-[a-z0-9]+)+$/ },
  { reason: 'identifier', re: /^[A-Z0-9_]+$/ },
  {
    reason: 'identifier',
    re: /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)+(\(\))?$/,
  },
  { reason: 'url', re: /^[a-z][a-z0-9+.-]*:\/\/\S+$/i },
  { reason: 'url', re: /^mailto:\S+$/i },
  { reason: 'url', re: /^[\w.+-]+@[\w-]+\.[\w.-]+$/ },
  {
    reason: 'path',
    re: /^(~|\.\.?)?[/\\]?([\w.@-]+[/\\])+[\w.@-]*$/,
  },
  { reason: 'path', re: /^[A-Za-z]:\\./ },
  {
    reason: 'path',
    re: /^[\w.-]+\.(ts|js|json|md|py|rs|go|java|c|h|cpp|png|svg|css|html|yml|yaml|toml|lock)$/i,
  },
  {
    reason: 'number',
    re: /^[+-]?(\d[\d_,]*)(\.\d+)?([eE][+-]?\d+)?%?$/,
  },
  { reason: 'number', re: /^0[xob][0-9a-f_]+$/i },
  { reason: 'number', re: /^v?\d+(\.\d+){1,3}([-+][\w.]+)?$/i },
  { reason: 'hexOrUuid', re: /^#?[0-9a-f]{3,8}$/i },
  {
    reason: 'hexOrUuid',
    re: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  },
  { reason: 'hexOrUuid', re: /^[0-9a-f]{16,}$/i },
];

export function checkSkipRules(text: string, opts: DetectOptions): SkipReason | null {
  const trimmed = text.trim();
  for (const pat of opts.userSkipPatterns) {
    if (pat.test(trimmed)) return 'userPattern';
  }
  for (const { reason, re } of RULES) {
    if (re.test(trimmed)) return reason;
  }
  if (isPlaceholderOnly(trimmed)) return 'placeholderOnly';
  if (isRegexLike(trimmed)) return 'regexLike';
  return null;
}

function isPlaceholderOnly(text: string): boolean {
  let t = text;
  t = t.replace(/%[-+ #0]*\d*(\.\d+)?[sdifxXeEgGcp%]/g, '');
  t = t.replace(/%\(\w+\)[sd]/g, '');
  t = t.replace(/\{\d*\}/g, '');
  t = t.replace(/\{\w+\}/g, '');
  t = t.replace(/\{\{\s*[\w.]+\s*\}\}/g, '');
  t = t.replace(/\$\{[^}]*\}/g, '');
  t = t.replace(/[\s\p{P}\p{S}]/gu, '');
  return t.length === 0;
}

function isRegexLike(text: string): boolean {
  if (text.startsWith('^') || text.endsWith('$')) return true;
  const special = (text.match(/\\[dwsDSWnrtfv0-9]|\\[|\\]|\(\?:|\{[^{}]*\}|[+*?](?![+*?])/g) ?? []).length;
  return text.length > 0 && special / text.length > 0.25;
}
