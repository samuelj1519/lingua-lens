import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const CJK = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;

/** Paths under src/ that may contain native language display names. */
const ALLOWLIST = new Set([
  path.normalize('src/l10n/targetLanguage.ts'),
]);

function walkTs(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkTs(p, out);
    else if (name.endsWith('.ts')) out.push(p);
  }
  return out;
}

describe('no unintended CJK in src/', () => {
  it('only allowlisted files contain CJK characters', () => {
    const srcRoot = path.join(process.cwd(), 'src');
    const offenders: string[] = [];
    for (const file of walkTs(srcRoot)) {
      const rel = path.normalize(path.relative(process.cwd(), file));
      if (ALLOWLIST.has(rel)) continue;
      const text = fs.readFileSync(file, 'utf8');
      if (CJK.test(text)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });
});
