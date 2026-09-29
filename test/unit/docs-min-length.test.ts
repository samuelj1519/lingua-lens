import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const MIN_CHARS = 800;

function isIndexPage(rel: string): boolean {
  if (rel === 'README.md') return true;
  return rel.endsWith('/index.md');
}

function listLocaleMd(locale: string): string[] {
  const root = path.join(process.cwd(), 'docs', locale);
  const out: string[] = [];
  for (const dir of ['tutorials', 'how-to', 'reference', 'explanation']) {
    const base = path.join(root, dir);
    if (!fs.existsSync(base)) continue;
    for (const name of fs.readdirSync(base)) {
      if (!name.endsWith('.md')) continue;
      out.push(`${dir}/${name}`);
    }
  }
  return out;
}

describe('documentation substance', () => {
  for (const locale of ['en', 'zh-CN'] as const) {
    it(`${locale} non-index doc pages are at least ${MIN_CHARS} characters`, () => {
      const short: string[] = [];
      for (const rel of listLocaleMd(locale)) {
        if (isIndexPage(rel)) continue;
        const file = path.join(process.cwd(), 'docs', locale, rel);
        const len = fs.readFileSync(file, 'utf8').length;
        if (len < MIN_CHARS) short.push(`${locale}/${rel} (${len})`);
      }
      expect(short).toEqual([]);
    });
  }
});
