import type { TextUnit, OffsetRange } from '../types';
import { randomBytes } from 'crypto';

export interface HoverAction {
  translation: string;
  uri: string;
  range: OffsetRange;
  languageId: string;
  unit: TextUnit;
}

export class HoverActionRegistry {
  private readonly map = new Map<string, { action: HoverAction; expires: number }>();
  private readonly max = 200;

  put(action: HoverAction): string {
    const id = randomBytes(3).toString('hex');
    this.map.set(id, { action, expires: Date.now() + 10 * 60 * 1000 });
    while (this.map.size > this.max) {
      const first = this.map.keys().next().value as string;
      this.map.delete(first);
    }
    return id;
  }

  get(id: string): HoverAction | undefined {
    const entry = this.map.get(id);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.map.delete(id);
      return undefined;
    }
    return entry.action;
  }
}
