import * as vscode from 'vscode';

const ORIGINS_KEY = 'linguaLens.apiKeyOrigins';

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
    return `linguaLens.apiKey:${origin}`;
  }

  private async rememberOrigin(origin: string): Promise<void> {
    const list = this.context.globalState.get<string[]>(ORIGINS_KEY, []);
    if (!list.includes(origin)) {
      await this.context.globalState.update(ORIGINS_KEY, [...list, origin]);
    }
  }

  async get(baseUrl: string): Promise<string | undefined> {
    const origin = originOf(baseUrl);
    return this.context.secrets.get(this.storageKey(origin));
  }

  async set(baseUrl: string, key: string): Promise<void> {
    const origin = originOf(baseUrl);
    const trimmed = key.trim();
    if (!trimmed) return;
    await this.context.secrets.store(this.storageKey(origin), trimmed);
    await this.rememberOrigin(origin);
    this.emitter.fire(origin);
  }

  async clear(baseUrl: string): Promise<void> {
    const origin = originOf(baseUrl);
    await this.context.secrets.delete(this.storageKey(origin));
    this.emitter.fire(origin);
  }

  async clearAll(): Promise<void> {
    const list = this.context.globalState.get<string[]>(ORIGINS_KEY, []);
    for (const origin of list) {
      await this.context.secrets.delete(this.storageKey(origin));
      this.emitter.fire(origin);
    }
    await this.context.globalState.update(ORIGINS_KEY, []);
  }

  /** Stored API key values — only for log/UI redaction (fetched from SecretStorage when needed). */
  async getAllStoredValues(): Promise<string[]> {
    const list = this.context.globalState.get<string[]>(ORIGINS_KEY, []);
    const out: string[] = [];
    for (const origin of list) {
      const value = await this.context.secrets.get(this.storageKey(origin));
      if (value?.trim()) out.push(value.trim());
    }
    return out;
  }
}
