import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => {
  class EventEmitter<T> {
    private listeners: ((e: T) => void)[] = [];
    event = (listener: (e: T) => void) => {
      this.listeners.push(listener);
      return { dispose: () => {} };
    };
    fire(e: T): void {
      for (const l of this.listeners) l(e);
    }
  }
  return { EventEmitter };
});

import { ApiKeyStore } from '../../src/secrets/ApiKeyStore';

const CONFIGURED_ORIGINS_KEY = 'linguaLens.apiKeyConfiguredOrigins';
const ABSENT_PROBE_ORIGINS_KEY = 'linguaLens.apiKeyAbsentProbeOrigins';

const baseUrlA = 'https://api-a.example.com/v1';
const originA = 'https://api-a.example.com';
const storageKeyA = `linguaLens.apiKey:${originA}`;
const baseUrlB = 'https://api-b.example.com/v1';
const originB = 'https://api-b.example.com';
const storageKeyB = `linguaLens.apiKey:${originB}`;
const secret = 'my-super-secret-api-key-123456';

function mockContext(
  secrets: {
    keys?: () => Promise<string[]>;
    get: (k: string) => Promise<string | undefined>;
    store: (k: string, v: string) => Promise<void>;
    delete: (k: string) => Promise<void>;
  },
  initialGlobal: Record<string, unknown> = {},
) {
  const globalState = new Map<string, unknown>(Object.entries(initialGlobal));
  return {
    secrets,
    globalState: {
      get: <T>(key: string, defaultValue: T) => (globalState.has(key) ? globalState.get(key) as T : defaultValue),
      update: async (key: string, value: unknown) => {
        globalState.set(key, value);
      },
    },
  } as import('vscode').ExtensionContext;
}

describe('ApiKeyStore', () => {
  let getSpy: ReturnType<typeof vi.fn>;
  let keysSpy: ReturnType<typeof vi.fn>;
  let store: ApiKeyStore;

  beforeEach(() => {
    getSpy = vi.fn().mockResolvedValue(undefined);
    keysSpy = vi.fn().mockResolvedValue([]);
    const ctx = mockContext({
      keys: keysSpy,
      get: getSpy,
      store: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    });
    store = new ApiKeyStore(ctx);
  });

  it('isConfigured reads globalState only (no SecretStorage get)', () => {
    expect(store.isConfigured(baseUrlA)).toBe(false);
    expect(getSpy).not.toHaveBeenCalled();
  });

  it('set updates configured flag without requiring get()', async () => {
    await store.set(baseUrlA, secret);
    expect(store.isConfigured(baseUrlA)).toBe(true);
    expect(getSpy).not.toHaveBeenCalled();
  });

  it('syncConfiguredFlagsFromStorage uses keys() not get() when available', async () => {
    keysSpy.mockResolvedValue([storageKeyA]);
    await store.syncConfiguredFlagsFromStorage(baseUrlA);
    expect(store.isConfigured(baseUrlA)).toBe(true);
    expect(getSpy).not.toHaveBeenCalled();
  });

  it('without keys(), probes only the current origin with a single get()', async () => {
    const ctx = mockContext({
      get: getSpy,
      store: vi.fn(),
      delete: vi.fn(),
    });
    store = new ApiKeyStore(ctx);
    getSpy.mockResolvedValue(secret);
    await store.syncConfiguredFlagsFromStorage(baseUrlA);
    expect(getSpy).toHaveBeenCalledOnce();
    expect(getSpy).toHaveBeenCalledWith(storageKeyA);
    expect(store.isConfigured(baseUrlA)).toBe(true);
  });

  it('without keys(), switching origin probes B even when A is already configured', async () => {
    const ctx = mockContext(
      { get: getSpy, store: vi.fn(), delete: vi.fn() },
      { [CONFIGURED_ORIGINS_KEY]: [originA] },
    );
    store = new ApiKeyStore(ctx);
    getSpy.mockResolvedValue(secret);
    await store.syncConfiguredFlagsFromStorage(baseUrlB);
    expect(getSpy).toHaveBeenCalledOnce();
    expect(getSpy).toHaveBeenCalledWith(storageKeyB);
    expect(store.isConfigured(baseUrlB)).toBe(true);
    expect(store.isConfigured(baseUrlA)).toBe(true);
  });

  it('without keys(), skips get() for origins already marked absent', async () => {
    const ctx = mockContext(
      { get: getSpy, store: vi.fn(), delete: vi.fn() },
      { [ABSENT_PROBE_ORIGINS_KEY]: [originB] },
    );
    store = new ApiKeyStore(ctx);
    await store.syncConfiguredFlagsFromStorage(baseUrlB);
    expect(getSpy).not.toHaveBeenCalled();
    expect(store.isConfigured(baseUrlB)).toBe(false);
  });

  it('set() invalidates absent-probe record for that origin', async () => {
    const ctx = mockContext(
      { get: getSpy, store: vi.fn().mockResolvedValue(undefined), delete: vi.fn() },
      { [ABSENT_PROBE_ORIGINS_KEY]: [originA] },
    );
    store = new ApiKeyStore(ctx);
    await store.set(baseUrlA, secret);
    expect(store.isConfigured(baseUrlA)).toBe(true);
    getSpy.mockClear();
    await store.syncConfiguredFlagsFromStorage(baseUrlA);
    expect(getSpy).not.toHaveBeenCalled();
  });

  it('does not throw when keys() rejects', async () => {
    keysSpy.mockRejectedValue(new Error('keys unsupported'));
    await expect(store.syncConfiguredFlagsFromStorage(baseUrlA)).resolves.toBeUndefined();
  });
});
