import type { OffsetRange, Placeholder, Segment } from '../types';
import { MarkdownSegmenter } from './MarkdownSegmenter';
import { PlainTextSegmenter } from './PlainTextSegmenter';
import { isDocumentHoverLanguage } from './documentLanguages';

export interface LocatedDocumentSegment {
  segment: Segment;
  /** Range to highlight in the editor (may be a table cell). */
  range: OffsetRange;
  text: string;
  placeholders: Placeholder[];
}

const md = new MarkdownSegmenter();
const plain = new PlainTextSegmenter();

export function segmentDocument(source: string, languageId: string, filePath?: string): Segment[] {
  if (languageId === 'markdown' || filePath?.match(/\.(md|markdown|mdc)$/i)) {
    return md.segment(source);
  }
  return plain.segment(source);
}

export function locateSegmentAtOffset(
  source: string,
  languageId: string,
  offset: number,
  filePath?: string,
): LocatedDocumentSegment | null {
  if (!isDocumentHoverLanguage(languageId, filePath)) return null;
  const segments = segmentDocument(source, languageId, filePath);
  for (const seg of segments) {
    if (offset < seg.range.start || offset >= seg.range.end) continue;
    if (seg.kind === 'preserved') return null;

    if (seg.kind === 'table' || seg.kind === 'list' || seg.kind === 'blockquote') {
      return {
        segment: seg,
        range: seg.range,
        text: seg.sourceText,
        placeholders: seg.placeholders,
      };
    }

    return {
      segment: seg,
      range: seg.range,
      text: seg.sourceText,
      placeholders: seg.placeholders,
    };
  }
  return null;
}

