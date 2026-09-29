import { describe, expect, it } from 'vitest';
import { protect, restore } from '../../src/parsing/placeholders';

describe('placeholders', () => {
  it('protects and restores template expressions', () => {
    const { text, placeholders } = protect('Hello ${name}');
    expect(text).toMatch(/⟦P\d+⟧/);
    const { text: out, ok } = restore(`Hi ${placeholders[0].token}`, placeholders);
    expect(ok).toBe(true);
    expect(out).toBe('Hi ${name}');
  });
});
