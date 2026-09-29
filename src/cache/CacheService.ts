import * as vscode from 'vscode';
import type { TargetLang } from '../types';
import { sha256Hex } from '../util/hash';
import { LruCache } from './LruCache';
import { ShardedJsonlStore } from './ShardedJsonlStore';

export class CacheService {
  private memory: LruCache<string>;
  private disk: ShardedJsonlStore;
  private enabled = true;

  constructor(
    private readonly context: vscode.ExtensionContext,
    memoryEntries: number,
    maxDiskMB: number,
  ) {
    this.memory = new LruCache<string>(memoryEntries);
    const dir = vscode.Uri.joinPath(context.globalStorageUri, 'cache', 'v1').fsPath;
    this.disk = new ShardedJsonlStore(dir, maxDiskMB * 1024 * 1024);
  }

  async initialize(): Promise<void> {
    await this.disk.init();
    setTimeout(() => void this.disk.compact(), 30_000);
  }

  configure(enabled: boolean, memoryEntries: number, maxDiskMB: number): void {
    this.enabled = enabled;
    this.memory = new LruCache<string>(memoryEntries);
    const dir = vscode.Uri.joinPath(this.context.globalStorageUri, 'cache', 'v1').fsPath;
    this.disk = new ShardedJsonlStore(dir, maxDiskMB * 1024 * 1024);
    void this.disk.init();
  }

  key(parts: { text: string; targetLang: TargetLang; model: string; promptVersion: string }): string {
    const raw = [parts.text, parts.targetLang, parts.model, parts.promptVersion].join('\u0000');
    return sha256Hex(raw);
  }

  getMemory(key: string): string | undefined {
    if (!this.enabled) return undefined;
    return this.memory.get(key);
  }

  async get(key: string): Promise<{ value: string; tier: 'memory' | 'disk' } | undefined> {
    if (!this.enabled) return undefined;
    const mem = this.memory.get(key);
    if (mem !== undefined) return { value: mem, tier: 'memory' };
    const line = await this.disk.get(key);
    if (!line) return undefined;
    this.memory.set(key, line.v);
    return { value: line.v, tier: 'disk' };
  }

  set(key: string, value: string, meta: { model: string; targetLang: TargetLang }): void {
    if (!this.enabled) return;
    this.memory.set(key, value);
    this.disk.set({
      k: key,
      v: value,
      t: Date.now(),
      m: meta.model,
      l: meta.targetLang,
    });
  }

  async clear(): Promise<void> {
    this.memory.clear();
    await this.disk.clear();
  }

  async flush(): Promise<void> {
    await this.disk.flush();
  }

  stats(): { memoryEntries: number; diskBytes: number } {
    return { memoryEntries: this.memory.size(), diskBytes: this.disk.getDiskBytes() };
  }
}
