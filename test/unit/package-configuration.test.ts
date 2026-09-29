import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CONFIG_KEYS_USED_IN_CODE } from '../../src/config/keysUsedInCode';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

const PACKAGE_NLS_LOCALES = [
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

function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(root, rel), 'utf8')) as T;
}

type ConfigSection = { title: string; order: number; properties: Record<string, unknown> };

function collectDeclaredKeys(sections: ConfigSection[]): string[] {
  const keys: string[] = [];
  for (const section of sections) {
    for (const fullKey of Object.keys(section.properties)) {
      expect(fullKey.startsWith('aiTranslate.')).toBe(true);
      keys.push(fullKey.slice('aiTranslate.'.length));
    }
  }
  return keys.sort();
}

function nlsKeyForProperty(fullKey: string): string {
  const rel = fullKey.slice('aiTranslate.'.length);
  return `config.${rel}.markdownDescription`;
}

function resolveNlsRef(value: string, nls: Record<string, string>): string {
  const m = value.match(/^%(.+)%$/);
  if (!m) return value;
  const resolved = nls[m[1]];
  expect(resolved, `missing nls key ${m[1]}`).toBeTruthy();
  return resolved!;
}

describe('package configuration contributes', () => {
  const sections = loadJson<ConfigSection[]>('contributes/configuration.json');
  const pkg = loadJson<{ contributes: { configuration: ConfigSection[] }; version: string }>('package.json');
  const nlsByLocale = Object.fromEntries(
    PACKAGE_NLS_LOCALES.map((f) => [f, loadJson<Record<string, string>>(f)]),
  );
  const nlsEn = nlsByLocale['package.nls.json'];

  it('package.json configuration matches contributes/configuration.json', () => {
    expect(pkg.contributes.configuration).toEqual(sections);
  });

  it('every code-used key is declared in configuration', () => {
    const declared = new Set(collectDeclaredKeys(sections));
    for (const key of CONFIG_KEYS_USED_IN_CODE) {
      expect(declared.has(key), `undeclared key used in code: ${key}`).toBe(true);
    }
  });

  it('every declared property has markdownDescription in all package.nls locales', () => {
    for (const section of sections) {
      expect(section.title).toMatch(/^%config\.section\./);
      const titleKey = section.title.slice(1, -1);
      for (const file of PACKAGE_NLS_LOCALES) {
        expect(nlsByLocale[file][titleKey], `${file} ${titleKey}`).toBeTruthy();
      }

      for (const [fullKey, schema] of Object.entries(section.properties)) {
        const prop = schema as { markdownDescription?: string; enumDescriptions?: string[] };
        expect(prop.markdownDescription, fullKey).toBeTruthy();
        const descKey = nlsKeyForProperty(fullKey);
        resolveNlsRef(prop.markdownDescription!, nlsEn);
        for (const file of PACKAGE_NLS_LOCALES) {
          expect(nlsByLocale[file][descKey], `${file} ${descKey}`).toBeTruthy();
        }

        if (prop.enumDescriptions) {
          for (const ed of prop.enumDescriptions) {
            resolveNlsRef(ed, nlsEn);
            const enumKey = ed.slice(1, -1);
            for (const file of PACKAGE_NLS_LOCALES) {
              expect(nlsByLocale[file][enumKey], `${file} enum ${enumKey}`).toBeTruthy();
            }
          }
        }
      }
    }
  });

  it('all package.nls locales share the same keys as English', () => {
    const enKeys = Object.keys(nlsEn).sort();
    for (const file of PACKAGE_NLS_LOCALES.slice(1)) {
      expect(Object.keys(nlsByLocale[file]).sort()).toEqual(enKeys);
    }
  });

  it('no duplicate configuration keys across sections', () => {
    const all = collectDeclaredKeys(sections);
    expect(new Set(all).size).toBe(all.length);
  });
});
