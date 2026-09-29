import { describe, expect, it } from 'vitest';
import { LruCache } from '../../src/cache/LruCache';
import { sha256Hex } from '../../src/util/hash';

describe('cache key', () => {
  it('hashes consistently', () => {
    const a = sha256Hex('hello\u0000zh-CN\u0000gpt-4\u0000hover.v1');
    const b = sha256Hex('hello\u0000zh-CN\u0000gpt-4\u0000hover.v1');
    expect(a).toBe(b);
    expect(a.length).toBe(64);
  });
});

describe('LruCache', () => {
  it('evicts oldest', () => {
    const lru = new LruCache<string>(2);
    lru.set('a', '1');
    lru.set('b', '2');
    lru.get('a');
    lru.set('c', '3');
    expect(lru.get('b')).toBeUndefined();
    expect(lru.get('a')).toBe('1');
  });
});
