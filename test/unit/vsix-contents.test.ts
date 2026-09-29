import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '../..');

const PACKAGE_NLS_ROOT = [
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

const BUNDLE_L10N = [
  'l10n/bundle.l10n.json',
  'l10n/bundle.l10n.zh-cn.json',
  'l10n/bundle.l10n.zh-tw.json',
  'l10n/bundle.l10n.ja.json',
  'l10n/bundle.l10n.ko.json',
  'l10n/bundle.l10n.fr.json',
  'l10n/bundle.l10n.de.json',
  'l10n/bundle.l10n.es.json',
  'l10n/bundle.l10n.ru.json',
  'l10n/bundle.l10n.pt-br.json',
];

function listPackagePaths(): string[] {
  const out = execSync('npx @vscode/vsce ls', {
    cwd: root,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

describe('VSIX packaging (i18n layout)', () => {
  it('includes root package.nls and l10n bundles; excludes i18n/scripts/src/test and split nls', () => {
    const paths = listPackagePaths();

    for (const rel of PACKAGE_NLS_ROOT) {
      expect(paths).toContain(rel);
    }
    for (const rel of BUNDLE_L10N) {
      expect(paths).toContain(rel);
    }

    for (const p of paths) {
      expect(p.startsWith('i18n/')).toBe(false);
      expect(p.startsWith('scripts/')).toBe(false);
      expect(p.startsWith('src/')).toBe(false);
      expect(p.startsWith('test/')).toBe(false);
      expect(p.startsWith('package.nls.commands.')).toBe(false);
      expect(p.startsWith('package.nls.config.')).toBe(false);
    }
  });
});
