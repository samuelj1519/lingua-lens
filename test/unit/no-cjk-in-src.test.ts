import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const CJK = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;

const ALLOWLIST_REL = new Set([
  path.normalize('src/l10n/targetLanguage.ts'),
  path.normalize('scripts/append-ui-l10n-keys.mjs'),
  path.normalize('scripts/generate-locale-nls.mjs'),
  path.normalize('scripts/patch-0.5.0-nls.mjs'),
]);

const MARKER_FIXTURE = 'ALLOW_CJK_FIXTURE';
const MARKER_LOCALE_DATA = 'ALLOW_CJK_LOCALE_DATA';

function walkFiles(dir: string, exts: Set<string>, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'fixtures') continue;
      walkFiles(p, exts, out);
    } else if (exts.has(path.extname(name))) out.push(p);
  }
  return out;
}

function isAllowed(rel: string, text: string): boolean {
  if (ALLOWLIST_REL.has(rel)) return true;
  if (rel.startsWith('test/fixtures' + path.sep)) return true;
  if (text.includes(MARKER_FIXTURE) || text.includes(MARKER_LOCALE_DATA)) return true;
  return false;
}

function scanRoot(subdir: string, exts: Set<string>): string[] {
  const root = path.join(process.cwd(), subdir);
  const offenders: string[] = [];
  for (const file of walkFiles(root, exts)) {
    const rel = path.normalize(path.relative(process.cwd(), file));
    const text = fs.readFileSync(file, 'utf8');
    if (isAllowed(rel, text)) continue;
    if (CJK.test(text)) offenders.push(rel);
  }
  return offenders;
}

describe('no unintended CJK in source, scripts, and tests', () => {
  it('src/ has no CJK outside allowlist', () => {
    expect(scanRoot('src', new Set(['.ts']))).toEqual([]);
  });

  it('scripts/ has no CJK outside locale-data allowlist', () => {
    expect(scanRoot('scripts', new Set(['.mjs', '.js', '.ts']))).toEqual([]);
  });

  it('test/ has no CJK outside fixture markers', () => {
    expect(scanRoot('test', new Set(['.ts']))).toEqual([]);
  });
});
