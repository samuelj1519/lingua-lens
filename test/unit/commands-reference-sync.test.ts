import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const files = ['docs/en/reference/commands.md', 'docs/zh-CN/reference/commands.md'];

describe('commands reference generation', () => {
  it('generated commands reference is up to date', () => {
    const before = new Map(files.map((f) => [f, fs.readFileSync(f, 'utf8')]));
    execSync('node scripts/generate-commands-reference.mjs', { cwd: process.cwd(), stdio: 'pipe' });
    for (const f of files) {
      expect(fs.readFileSync(f, 'utf8')).toBe(before.get(f));
    }
  });
});
