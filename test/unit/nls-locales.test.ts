import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bundlePlaceholderMismatches } from '../../src/l10n/bundleStrings';

const root = join(import.meta.dirname, '../..');

function loadJson(rel: string): Record<string, string> {
  return JSON.parse(readFileSync(join(root, rel), 'utf8')) as Record<string, string>;
}

const PACKAGE_LOCALES = [
  'package.nls.json',
  'package.nls.zh-cn.json',
  'package.nls.zh-tw.json',
  'package.nls.ja.json',
  'package.nls.ko.json',
  'package.nls.fr.json',
  'package.nls.de.json',
  'package.nls.es.json',
  'package.nls.ru.json',
  'package.nls.pt-br.json',
];

describe('package.nls locales', () => {
  const en = loadJson('package.nls.json');
  const enKeys = Object.keys(en).sort();

  for (const file of PACKAGE_LOCALES) {
    it(`${file} has same keys as English`, () => {
      const loc = loadJson(file);
      expect(Object.keys(loc).sort()).toEqual(enKeys);
    });
  }

  it('placeholder parity for document.progress.message across package locales', () => {
    const sample = en['document.progress.message'];
    expect(sample).toContain('{0}');
    for (const file of PACKAGE_LOCALES.slice(1)) {
      const loc = loadJson(file);
      expect(loc['document.progress.message']).toContain('{0}');
      expect(loc['document.progress.message']).toContain('{1}');
      expect(loc['document.progress.message']).toContain('{2}');
    }
  });
});

const L10N_DIR = 'l10n';

describe('bundle.l10n locales', () => {
  const en = loadJson(`${L10N_DIR}/bundle.l10n.json`);
  const files = readdirSync(join(root, L10N_DIR)).filter(
    (f) => f === 'bundle.l10n.json' || f.startsWith('bundle.l10n.'),
  );

  for (const file of files) {
    if (file === 'bundle.l10n.json') continue;
    it(`${file} matches bundle keys and placeholders`, () => {
      const loc = loadJson(`${L10N_DIR}/${file}`);
      expect(Object.keys(loc).sort()).toEqual(Object.keys(en).sort());
      const mismatches = bundlePlaceholderMismatches(en, loc);
      expect(mismatches).toEqual([]);
    });
  }
});
