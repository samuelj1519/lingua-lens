import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const FORBIDDEN = [/cursor-ai-translate/i, /Cursor AI Translate/];

const SCAN_ROOTS = [
  { dir: 'src', exts: ['.ts'] },
  { dir: 'docs', exts: ['.md'] },
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
  for (const glob of ['package.nls.json', 'package.nls.*.json']) {
    const dir = root;
    if (glob.includes('*')) {
      for (const name of fs.readdirSync(dir)) {
        if (name.startsWith('package.nls.') && name.endsWith('.json')) {
          files.push(path.join(dir, name));
        }
      }
    } else {
      files.push(path.join(dir, glob));
    }
  }
  for (const name of fs.readdirSync(path.join(root, 'l10n'))) {
    if (name.startsWith('bundle.l10n') && name.endsWith('.json')) {
      files.push(path.join(root, 'l10n', name));
    }
  }
  for (const { dir, exts } of SCAN_ROOTS) {
    files.push(...walk(path.join(root, dir), exts));
  }
  return [...new Set(files)];
}

function stripMigrationSections(text: string): string {
  return text
    .replace(/## Upgrading from AI Translate[\s\S]*?(?=\n## )/m, '')
    .replace(
      /## \u4ece AI Translate[\s\S]*?(?=\n## )/m,
      '',
    );
}

describe('legacy branding', () => {
  it('does not reference cursor-ai-translate or Cursor AI Translate outside CHANGELOG history', () => {
    const offenders: string[] = [];
    for (const file of collectPaths()) {
      if (path.basename(file) === 'CHANGELOG.md') continue;
      let text = fs.readFileSync(file, 'utf8');
      if (/README(\.zh-CN)?\.md$/.test(file)) {
        text = stripMigrationSections(text);
      }
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
