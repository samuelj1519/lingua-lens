import { describe, expect, it } from 'vitest';
import { splitConfigIdentifier } from '../../src/parsing/configKey';

describe('splitConfigIdentifier', () => {
  it('splits snake_case', () => {
    expect(splitConfigIdentifier('max_retry_count')).toBe('max retry count');
  });

  it('splits camelCase', () => {
    expect(splitConfigIdentifier('maxRetryCount')).toBe('max retry count');
  });

  it('splits kebab-case', () => {
    expect(splitConfigIdentifier('max-retry-count')).toBe('max retry count');
  });
});
