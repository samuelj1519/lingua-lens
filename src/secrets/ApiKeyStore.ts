import * as vscode from 'vscode';

const ORIGINS_KEY = 'linguaLens.apiKeyOrigins';
const CONFIGURED_ORIGINS_KEY = 'linguaLens.apiKeyConfiguredOrigins';
/** Origins probed on legacy VS Code without `keys()` where SecretStorage had no key (avoids repeat `get()`). */
const ABSENT_PROBE_ORIGINS_KEY = 'linguaLens.apiKeyAbsentProbeOrigins';
const KEY_PREFIX = 'linguaLens.apiKey:';

/** VS Code 1.97+; optional on older runtimes (see `engines.vscode`). */
type SecretStorageWithOptionalKeys = vscode.SecretStorage & {
  keys?: () => Thenable<string[]>;
};

function originOf(baseUrl: string): string {
  try {
    const u = new URL(baseUrl);
    return u.origin;
  } catch {
    return baseUrl;
  }
}

export class ApiKeyStore {
  private readonly emitter = new vscode.EventEmitter<string>();
  readonly onDidChange = this.emitter.event;

  constructor(private readonly context: vscode.ExtensionContext) {}

  private storageKey(origin: string): string {
    return `${KEY_PREFIX}${origin}`;
  }

  private configuredOrigins(): string[] {
    return this.context.globalState.get<string[]>(CONFIGURED_ORIGINS_KEY, []);
  }

  private absentProbeOrigins(): string[] {
    return this.context.globalState.get<string[]>(ABSENT_PROBE_ORIGINS_KEY, []);
  }

  /** Whether an API key is configured for this base URL (reads globalState only). */
  isConfigured(baseUrl: string): boolean {
    const origin = originOf(baseUrl);
    return this.configuredOrigins().includes(origin);
  }

  /**
   * Reconcile configured-origin flags at activation or when `llm.baseUrl` changes.
   * Uses `SecretStorage.keys()` when available (VS Code 1.97+); otherwise probes the current origin once.
   */
  async syncConfiguredFlagsFromStorage(currentBaseUrl?: string): Promise<void> {
    try {
      const secrets = this.context.secrets as SecretStorageWithOptionalKeys;
      if (typeof secrets.keys === 'function') {
        const allKeys = await secrets.keys();
        const origins: string[] = [];
        for (const k of allKeys) {
          if (k.startsWith(KEY_PREFIX)) origins.push(k.slice(KEY_PREFIX.length));
        }
        await this.context.globalState.update(CONFIGURED_ORIGINS_KEY, origins);
        await this.context.globalState.update(ORIGINS_KEY, origins);
        await this.context.globalState.update(ABSENT_PROBE_ORIGINS_KEY, []);
        return;
      }

      if (!currentBaseUrl) return;
      const origin = originOf(currentBaseUrl);
      if (this.configuredOrigins().includes(origin)) return;
      if (this.absentProbeOrigins().includes(origin)) return;

      const value = await this.context.secrets.get(this.storageKey(origin));
      const hasKey = Boolean(value?.trim());
      await this.setConfigured(origin, hasKey);
      if (!hasKey) await this.addAbsentProbe(origin);
      else await this.removeAbsentProbe(origin);
    } catch {
      /* Do not block extension activation on migration failures. */
    }
  }

  private async addAbsentProbe(origin: string): Promise<void> {
    const list = this.absentProbeOrigins();
    if (list.includes(origin)) return;
    await this.context.globalState.update(ABSENT_PROBE_ORIGINS_KEY, [...list, origin]);
  }

  private async removeAbsentProbe(origin: string): Promise<void> {
    const list = this.absentProbeOrigins();
    if (!list.includes(origin)) return;
    await this.context.globalState.update(
      ABSENT_PROBE_ORIGINS_KEY,
      list.filter((o) => o !== origin),
    );
  }

  private async rememberOrigin(origin: string): Promise<void> {
    const list = this.context.globalState.get<string[]>(ORIGINS_KEY, []);
    if (!list.includes(origin)) {
      await this.context.globalState.update(ORIGINS_KEY, [...list, origin]);
    }
  }

  private async setConfigured(origin: string, configured: boolean): Promise<void> {
    const next = new Set(this.configuredOrigins());
    if (configured) next.add(origin);
    else next.delete(origin);
    await this.context.globalState.update(CONFIGURED_ORIGINS_KEY, [...next]);

    const origins = this.context.globalState.get<string[]>(ORIGINS_KEY, []);
    if (configured) {
      if (!origins.includes(origin)) {
        await this.context.globalState.update(ORIGINS_KEY, [...origins, origin]);
      }
    } else {
      await this.context.globalState.update(
        ORIGINS_KEY,
        origins.filter((o) => o !== origin),
      );
    }
  }

  /** Read API key for an LLM request only. */
  async get(baseUrl: string): Promise<string | undefined> {
    const origin = originOf(baseUrl);
    return this.context.secrets.get(this.storageKey(origin));
  }

  async set(baseUrl: string, key: string): Promise<void> {
    const origin = originOf(baseUrl);
    const trimmed = key.trim();
    if (!trimmed) return;
    await this.context.secrets.store(this.storageKey(origin), trimmed);
    await this.removeAbsentProbe(origin);
    await this.setConfigured(origin, true);
    await this.rememberOrigin(origin);
    this.emitter.fire(origin);
  }

  async clear(baseUrl: string): Promise<void> {
    const origin = originOf(baseUrl);
    await this.context.secrets.delete(this.storageKey(origin));
    await this.setConfigured(origin, false);
    await this.addAbsentProbe(origin);
    this.emitter.fire(origin);
  }

  async clearAll(): Promise<void> {
    const list = this.context.globalState.get<string[]>(ORIGINS_KEY, []);
    for (const origin of list) {
      await this.context.secrets.delete(this.storageKey(origin));
      this.emitter.fire(origin);
    }
    await this.context.globalState.update(ORIGINS_KEY, []);
    await this.context.globalState.update(CONFIGURED_ORIGINS_KEY, []);
    await this.context.globalState.update(ABSENT_PROBE_ORIGINS_KEY, []);
  }
}
