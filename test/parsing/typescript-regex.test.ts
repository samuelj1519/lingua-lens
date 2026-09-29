import { describe, expect, it } from 'vitest';
import { RegexExtractor } from '../../src/parsing/RegexExtractor';

describe('RegexExtractor TypeScript fallback', () => {
  const ex = new RegexExtractor();

  it('extracts // comment when languageId is typescript', () => {
    const doc = {
      uri: 'file:///a.ts',
      version: 1,
      languageId: 'typescript',
      getText: () => '// Hello from TypeScript\nexport const a = 1;\n',
    };
    const unit = ex.extractAt(doc, 5);
    expect(unit?.source).toBe('regex');
    expect(unit?.text).toContain('Hello from TypeScript');
  });
});
