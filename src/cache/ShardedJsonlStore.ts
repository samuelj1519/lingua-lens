import { appendFile, mkdir, readdir, readFile, rm, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import type { TargetLang } from '../types';

export interface CacheLine {
  k: string;
  v: string;
  t: number;
  m: string;
  l: TargetLang;
}

export class ShardedJsonlStore {
  private readonly shardCache = new Map<string, Map<string, CacheLine>>();
  private readonly shardLru: string[] = [];
  private readonly maxShards = 64;
  private writeQueue: CacheLine[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private diskBytes = 0;

  constructor(
    private readonly baseDir: string,
    private readonly maxDiskBytes: number,
  ) {}

  private shardPath(key: string): string {
    const prefix = key.slice(0, 2).toLowerCase();
    return join(this.baseDir, `${prefix}.jsonl`);
  }

  private shardKey(key: string): string {
    return key.slice(0, 2).toLowerCase();
  }

  async init(): Promise<void> {
    await mkdir(this.baseDir, { recursive: true });
    try {
      const files = await readdir(this.baseDir);
      for (const f of files) {
        if (f.endsWith('.jsonl')) {
          const s = await stat(join(this.baseDir, f));
          this.diskBytes += s.size;
        }
      }
    } catch {
      /* empty */
    }
  }

  private touchShard(shard: string): void {
    const idx = this.shardLru.indexOf(shard);
    if (idx >= 0) this.shardLru.splice(idx, 1);
    this.shardLru.push(shard);
    while (this.shardLru.length > this.maxShards) {
      const ev = this.shardLru.shift()!;
      this.shardCache.delete(ev);
    }
  }

  private async loadShard(shard: string): Promise<Map<string, CacheLine>> {
    const cached = this.shardCache.get(shard);
    if (cached) {
      this.touchShard(shard);
      return cached;
    }
    const map = new Map<string, CacheLine>();
    const path = join(this.baseDir, `${shard}.jsonl`);
    try {
      const content = await readFile(path, 'utf8');
      for (const line of content.split('\n')) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line) as CacheLine;
          if (entry.k) map.set(entry.k, entry);
        } catch {
          /* corrupt line */
        }
      }
    } catch {
      /* missing file */
    }
    this.shardCache.set(shard, map);
    this.touchShard(shard);
    return map;
  }

  async get(key: string): Promise<CacheLine | undefined> {
    const shard = this.shardKey(key);
    const map = await this.loadShard(shard);
    return map.get(key);
  }

  set(line: CacheLine): void {
    const shard = this.shardKey(line.k);
    const map = this.shardCache.get(shard) ?? new Map<string, CacheLine>();
    map.set(line.k, line);
    this.shardCache.set(shard, map);
    this.touchShard(shard);
    this.writeQueue.push(line);
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), 1000);
    }
    if (this.writeQueue.length >= 50) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    const batch = this.writeQueue.splice(0);
    for (const line of batch) {
      const path = this.shardPath(line.k);
      const data = JSON.stringify(line) + '\n';
      await appendFile(path, data, 'utf8');
      this.diskBytes += Buffer.byteLength(data, 'utf8');
    }
    if (this.diskBytes > this.maxDiskBytes) {
      void this.compact();
    }
  }

  async compact(): Promise<void> {
    const targetPerShard = Math.floor((this.maxDiskBytes * 0.8) / 256);
    let total = 0;
    try {
      const files = await readdir(this.baseDir);
      for (const f of files) {
        if (!f.endsWith('.jsonl')) continue;
        const path = join(this.baseDir, f);
        const content = await readFile(path, 'utf8');
        const map = new Map<string, CacheLine>();
        for (const line of content.split('\n')) {
          if (!line.trim()) continue;
          try {
            const entry = JSON.parse(line) as CacheLine;
            if (entry.k) map.set(entry.k, entry);
          } catch {
            /* skip */
          }
        }
        const entries = [...map.values()].sort((a, b) => b.t - a.t);
        const kept = entries.slice(0, Math.max(1, Math.floor(targetPerShard / 200)));
        const out = kept.map((e) => JSON.stringify(e)).join('\n') + (kept.length ? '\n' : '');
        await writeFile(path, out, 'utf8');
        total += Buffer.byteLength(out, 'utf8');
        this.shardCache.set(f.replace('.jsonl', ''), new Map(kept.map((e) => [e.k, e])));
      }
      this.diskBytes = total;
    } catch {
      /* ignore */
    }
  }

  async clear(): Promise<void> {
    this.shardCache.clear();
    this.shardLru.length = 0;
    this.writeQueue = [];
    this.diskBytes = 0;
    try {
      await rm(this.baseDir, { recursive: true, force: true });
      await mkdir(this.baseDir, { recursive: true });
    } catch {
      /* ignore */
    }
  }

  getDiskBytes(): number {
    return this.diskBytes;
  }
}
