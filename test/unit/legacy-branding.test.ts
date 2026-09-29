import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const LEGACY_AITRANSLATE = new RegExp('ai' + 'translate', 'i');

const FORBIDDEN = [/cursor-ai-translate/i, /Cursor AI Translate/, /aiTranslate\./, LEGACY_AITRANSLATE];

const SCAN_ROOTS = [
  { dir: 'src', exts: ['.ts'] },
  { dir: 'test', exts: ['.ts'] },
  { dir: 'docs', exts: ['.md'] },
  { dir: 'scripts', exts: ['.mjs', '.ts'] },
  { dir: 'i18n', exts: ['.json'] },
  { dir: 'l10n', exts: ['.json'] },
];

const SCAN_FILES = [
  'package.json',
  'README.md',
  'README.zh-CN.md',
  'CONTRIBUTING.md',
  'CONTRIBUTING.zh-CN.md',
  'SECURITY.md',
  'SECURITY.zh-CN.md',
];

const SELF_TEST = path.normalize(fileURLToPath(new URL('./legacy-branding.test.ts', import.meta.url)));

function walk(dir: string, exts: string[], out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, exts, out);
    else if (exts.includes(path.extname(name))) out.push(p);
  }
  return out;
}

function collectPaths(): string[] {
  const root = process.cwd();
  const files: string[] = [];
  for (const rel of SCAN_FILES) {
    const p = path.join(root, rel);
    if (fs.existsSync(p)) files.push(p);
  }
  for (const name of fs.readdirSync(root)) {
    if ((name === 'package.nls.json' || name.startsWith('package.nls.')) && name.endsWith('.json')) {
      files.push(path.join(root, name));
    }
  }
  for (const { dir, exts } of SCAN_ROOTS) {
    files.push(...walk(path.join(root, dir), exts));
  }
  return [...new Set(files)].filter((f) => path.normalize(f) !== SELF_TEST);
}

describe('legacy branding', () => {
  it('does not reference legacy product names or aitranslate outside CHANGELOG', () => {
    const offenders: string[] = [];
    for (const file of collectPaths()) {
      if (path.basename(file) === 'CHANGELOG.md') continue;
      const text = fs.readFileSync(file, 'utf8');
      for (const re of FORBIDDEN) {
        if (re.test(text)) {
          offenders.push(`${path.relative(process.cwd(), file)} (${re})`);
          break;
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
