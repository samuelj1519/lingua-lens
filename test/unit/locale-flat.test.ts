import { describe, expect, it } from 'vitest';

function flattenJson(obj: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof obj !== 'object' || obj === null) return out;
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else Object.assign(out, flattenJson(v, key));
  }
  return out;
}

describe('locale flatten', () => {
  it('flattens nested json keys', () => {
    expect(flattenJson({ app: { title: 'Hello' } })).toEqual({ 'app.title': 'Hello' });
  });
});
