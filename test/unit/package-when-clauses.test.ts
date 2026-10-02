import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

function collectWhenClauses(pkg: {
  contributes?: { menus?: Record<string, { when?: string }[]>; keybindings?: { when?: string }[] };
}): string[] {
  const out: string[] = [];
  const menus = pkg.contributes?.menus ?? {};
  for (const items of Object.values(menus)) {
    for (const item of items ?? []) {
      if (item.when) out.push(item.when);
    }
  }
  for (const kb of pkg.contributes?.keybindings ?? []) {
    if (kb.when) out.push(kb.when);
  }
  return out;
}

describe('package.json menu when clauses', () => {
  it('does not use regex (=~) in when expressions', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      contributes?: { menus?: Record<string, { when?: string }[]>; keybindings?: { when?: string }[] };
    };
    const whens = collectWhenClauses(pkg);
    expect(whens.length).toBeGreaterThan(0);
    for (const w of whens) {
      expect(w).not.toMatch(/=~/);
    }
  });
});
