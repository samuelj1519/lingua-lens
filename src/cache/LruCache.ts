export class LruCache<V> {
  private readonly map = new Map<string, V>();
  private charCount = 0;

  constructor(
    private readonly maxEntries: number,
    private readonly maxChars = 4_000_000,
    private readonly valueChars: (v: V) => number = (v) => (typeof v === 'string' ? v.length : 0),
  ) {}

  get(key: string): V | undefined {
    const v = this.map.get(key);
    if (v === undefined) return undefined;
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }

  set(key: string, value: V): void {
    if (this.map.has(key)) {
      const old = this.map.get(key)!;
      this.charCount -= this.valueChars(old);
      this.map.delete(key);
    }
    while (this.map.size >= this.maxEntries && this.map.size > 0) {
      const first = this.map.keys().next().value as string;
      const ev = this.map.get(first)!;
      this.charCount -= this.valueChars(ev);
      this.map.delete(first);
    }
    this.map.set(key, value);
    this.charCount += this.valueChars(value);
    while (this.charCount > this.maxChars && this.map.size > 0) {
      const first = this.map.keys().next().value as string;
      const ev = this.map.get(first)!;
      this.charCount -= this.valueChars(ev);
      this.map.delete(first);
    }
  }

  delete(key: string): void {
    const v = this.map.get(key);
    if (v !== undefined) {
      this.charCount -= this.valueChars(v);
      this.map.delete(key);
    }
  }

  clear(): void {
    this.map.clear();
    this.charCount = 0;
  }

  size(): number {
    return this.map.size;
  }
}
