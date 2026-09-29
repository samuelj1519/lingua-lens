import { describe, expect, it } from 'vitest';
import { RegexExtractor } from '../../src/parsing/RegexExtractor';

describe('RegexExtractor', () => {
  const ex = new RegexExtractor();

  it('extracts line comment in Ruby', () => {
    const doc = {
      uri: 'file:///x.rb',
      version: 1,
      languageId: 'ruby',
      getText: () => '# This is a note\nx = 1\n',
    };
    const unit = ex.extractAt(doc, 5);
    expect(unit?.text).toContain('This is a note');
  });
});
