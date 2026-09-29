import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const docsRoot = path.join(process.cwd(), 'docs');
const enRoot = path.join(docsRoot, 'en');
const zhRoot = path.join(docsRoot, 'zh-CN');

function listMdFiles(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) out.push(...listMdFiles(p, base));
    else if (name.endsWith('.md')) out.push(path.relative(base, p).replace(/\\/g, '/'));
  }
  return out.sort();
}

function resolveLink(fromFile: string, href: string): string | null {
  if (href.startsWith('http') || href.startsWith('#')) return null;
  const dir = path.dirname(fromFile);
  const target = path.normalize(path.join(dir, href.split('#')[0]));
  return target;
}

describe('documentation parity', () => {
  it('docs/en and docs/zh-CN have mirrored markdown files', () => {
    const en = listMdFiles(enRoot);
    const zh = listMdFiles(zhRoot);
    expect(zh).toEqual(en);
  });

  it('relative markdown links resolve within each locale tree', () => {
    for (const locale of ['en', 'zh-CN'] as const) {
      const root = path.join(docsRoot, locale);
      for (const rel of listMdFiles(root)) {
        const file = path.join(root, rel);
        const text = fs.readFileSync(file, 'utf8');
        const links = [...text.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
        for (const href of links) {
          if (
            href.startsWith('http') ||
            href.startsWith('#') ||
            href.startsWith('settings://') ||
            href.startsWith('command:')
          ) {
            continue;
          }
          const resolved = resolveLink(file, href);
          if (!resolved) continue;
          expect(fs.existsSync(resolved), `${locale}/${rel} -> ${href}`).toBe(true);
        }
      }
    }
  });
});
