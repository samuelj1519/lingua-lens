import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const files = [
  'docs/en/reference/settings.md',
  'docs/zh-CN/reference/settings.md',
];

describe('settings reference generation', () => {
  it('generated settings reference is up to date', () => {
    const before = new Map(files.map((f) => [f, fs.readFileSync(f, 'utf8')]));
    execSync('node scripts/generate-settings-reference.mjs', { cwd: process.cwd(), stdio: 'pipe' });
    for (const f of files) {
      expect(fs.readFileSync(f, 'utf8')).toBe(before.get(f));
    }
  });
});
