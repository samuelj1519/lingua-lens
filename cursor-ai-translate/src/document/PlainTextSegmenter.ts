import type { Segment } from '../types';
import { sha256HexPrefix } from '../util/hash';
import { protect } from '../parsing/placeholders';

export class PlainTextSegmenter {
  segment(source: string): Segment[] {
    const parts = source.split(/\n\s*\n/);
    const segments: Segment[] = [];
    let offset = 0;
    let id = 0;
    for (const part of parts) {
      const idx = source.indexOf(part, offset);
      const start = idx >= 0 ? idx : offset;
      const end = start + part.length;
      offset = end;
      const collapsed = part.replace(/\s*\n\s*/g, ' ').trim();
      if (!collapsed) continue;
      const p = protect(collapsed);
      segments.push({
        id: `s${id++}`,
        kind: 'paragraph',
        range: { start, end },
        sourceText: p.text,
        placeholders: p.placeholders,
        hash: sha256HexPrefix(p.text, 16),
        linePrefix: '',
      });
    }
    return segments;
  }
}
