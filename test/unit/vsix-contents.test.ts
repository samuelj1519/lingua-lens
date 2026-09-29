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

const SHIPPED_README_DOCS = ['README.md', 'CHANGELOG.md', 'LICENSE'];

const EXCLUDED_REPO_DOCS = [
  'README.zh-CN.md',
  'CONTRIBUTING.md',
  'CONTRIBUTING.zh-CN.md',
  'SECURITY.md',
  'SECURITY.zh-CN.md',
];

const REQUIRED_RUNTIME = [
  'package.json',
  'dist/extension.js',
  'dist/settings-panel-webview.js',
  'dist/wasm/tree-sitter.wasm',
  'schemas/translate-glossary.schema.json',
  'resources/icons/translate-document.svg',
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

describe('VSIX packaging', () => {
  it('includes nls/l10n/runtime assets; excludes dev sources, maps, contributes, out', () => {
    const paths = listPackagePaths();

    for (const rel of PACKAGE_NLS_ROOT) {
      expect(paths).toContain(rel);
    }
    for (const rel of BUNDLE_L10N) {
      expect(paths).toContain(rel);
    }
    for (const rel of REQUIRED_RUNTIME) {
      expect(paths).toContain(rel);
    }
    for (const rel of SHIPPED_README_DOCS) {
      expect(paths).toContain(rel);
    }
    for (const rel of EXCLUDED_REPO_DOCS) {
      expect(paths).not.toContain(rel);
    }

    for (const p of paths) {
      expect(p.startsWith('i18n/')).toBe(false);
      expect(p.startsWith('scripts/')).toBe(false);
      expect(p.startsWith('src/')).toBe(false);
      expect(p.startsWith('test/')).toBe(false);
      expect(p.startsWith('docs/')).toBe(false);
      expect(p.startsWith('contributes/')).toBe(false);
      expect(p.startsWith('out/')).toBe(false);
      expect(p.startsWith('package.nls.commands.')).toBe(false);
      expect(p.startsWith('package.nls.config.')).toBe(false);
      expect(p.endsWith('.map')).toBe(false);
    }
  });
});
