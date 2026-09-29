/** ALLOW_CJK_FIXTURE: intentional Chinese samples for detection, documents, or l10n assertions. */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, beforeAll } from 'vitest';
import { bundlePlaceholderMismatches } from '../../src/l10n/bundleStrings';
import { getUiStringsForRawTarget, initUiL10n, resetUiL10nCache, t } from '../../src/l10n/uiL10n';

const root = join(import.meta.dirname, '../..');
const l10nDir = join(root, 'l10n');

describe('uiL10n t()', () => {
  beforeAll(() => {
    initUiL10n(root, () => 'zh-CN');
    resetUiL10nCache();
  });

  it('returns localized string for built-in target language', () => {
    initUiL10n(root, () => 'zh-CN');
    expect(t('doc.alreadyTarget')).toContain('无需翻译');
    initUiL10n(root, () => 'en');
    expect(t('doc.alreadyTarget')).toMatch(/nothing to translate/i);
  });

  it('falls back to English for custom target values', () => {
    initUiL10n(root, () => 'Nederlands');
    const custom = getUiStringsForRawTarget('Nederlands');
    const en = getUiStringsForRawTarget('en');
    expect(custom['doc.alreadyTarget']).toBe(en['doc.alreadyTarget']);
  });

  it('substitutes numeric placeholders', () => {
    initUiL10n(root, () => 'en');
    expect(t('document.progress.message', 'README.md', 2, 5)).toBe('Translating README.md: 2/5 segments');
  });
});

describe('bundle.l10n key parity (runtime UI)', () => {
  const en = JSON.parse(readFileSync(join(l10nDir, 'bundle.l10n.json'), 'utf8')) as Record<string, string>;
  const enKeys = Object.keys(en).sort();
  const files = readdirSync(l10nDir).filter((f) => f.startsWith('bundle.l10n'));

  for (const file of files) {
    if (file === 'bundle.l10n.json') continue;
    it(`${file} has same keys as English`, () => {
      const loc = JSON.parse(readFileSync(join(l10nDir, file), 'utf8')) as Record<string, string>;
      expect(Object.keys(loc).sort()).toEqual(enKeys);
      expect(bundlePlaceholderMismatches(en, loc)).toEqual([]);
    });
  }
});
