import { describe, expect, it } from 'vitest';
import { extractTemplateUiTextAt } from '../../src/parsing/TemplateTextExtractor';

describe('template UI text hover', () => {
  const doc = (lang: string, text: string) => ({
    uri: 'file:///index.html',
    version: 1,
    languageId: lang,
    getText: () => text,
  });

  it('extracts placeholder attribute value', () => {
    const src = '<input placeholder="Enter your name" />';
    const unit = extractTemplateUiTextAt(doc('html', src), src.indexOf('Enter') + 2);
    expect(unit?.kind).toBe('string');
    expect(unit?.text).toContain('Enter');
  });

  it('extracts text between tags', () => {
    const src = '<p>Hello user</p>';
    const unit = extractTemplateUiTextAt(doc('html', src), src.indexOf('Hello') + 1);
    expect(unit?.text).toContain('Hello');
  });
});
