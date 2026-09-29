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

function mockContext(secrets: {
  keys: () => Promise<string[]>;
  get: (k: string) => Promise<string | undefined>;
  store: (k: string, v: string) => Promise<void>;
  delete: (k: string) => Promise<void>;
}) {
  const globalState = new Map<string, unknown>();
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
  const baseUrl = 'https://api.example.com/v1';
  const origin = 'https://api.example.com';
  const storageKey = `linguaLens.apiKey:${origin}`;
  const secret = 'my-super-secret-api-key-123456';

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
    expect(store.isConfigured(baseUrl)).toBe(false);
    expect(getSpy).not.toHaveBeenCalled();
  });

  it('set updates configured flag without requiring get()', async () => {
    await store.set(baseUrl, secret);
    expect(store.isConfigured(baseUrl)).toBe(true);
    expect(getSpy).not.toHaveBeenCalled();
  });

  it('clear and clearAll update configured flags', async () => {
    await store.set(baseUrl, secret);
    await store.clear(baseUrl);
    expect(store.isConfigured(baseUrl)).toBe(false);

    await store.set(baseUrl, secret);
    await store.set('https://other.example/v1', 'other-key-value-here');
    await store.clearAll();
    expect(store.isConfigured(baseUrl)).toBe(false);
    expect(store.isConfigured('https://other.example/v1')).toBe(false);
  });

  it('syncConfiguredFlagsFromStorage uses keys() not get()', async () => {
    keysSpy.mockResolvedValue([storageKey]);
    await store.syncConfiguredFlagsFromStorage();
    expect(store.isConfigured(baseUrl)).toBe(true);
    expect(getSpy).not.toHaveBeenCalled();
  });

  it('get() is only used when fetching key value for requests', async () => {
    getSpy.mockResolvedValue(secret);
    const v = await store.get(baseUrl);
    expect(v).toBe(secret);
    expect(getSpy).toHaveBeenCalledOnce();
  });
});
