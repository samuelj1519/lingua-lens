import type { Segment } from '../../types';
import { sha256HexPrefix } from '../../util/hash';
import { protect } from '../../parsing/placeholders';
import { adapterForDocument } from './registry';

export class StructuredSegmenter {
  segment(source: string, languageId: string, filePath: string): Segment[] {
    const adapter = adapterForDocument(languageId, filePath);
    if (!adapter) return [];
    const spans = adapter.extractSpans(source);
    const segments: Segment[] = [];
    let id = 0;
    for (const span of spans) {
      const p = protect(span.decoded);
      segments.push({
        id: `st${id++}`,
        kind: 'structured',
        range: span.replaceRange,
        sourceText: p.text,
        placeholders: p.placeholders,
        hash: sha256HexPrefix(p.text, 16),
        linePrefix: '',
        structuredMeta: {
          valueStart: span.replaceRange.start,
          valueEnd: span.replaceRange.end,
          sourceLiteral: span.sourceLiteral,
          decoded: span.decoded,
          escape: span.escape,
          formatId: adapter.formatId,
          yamlBlock: span.yamlBlock,
          xmlAttrQuote: span.xmlAttrQuote,
        },
      });
    }
    return segments;
  }
}
