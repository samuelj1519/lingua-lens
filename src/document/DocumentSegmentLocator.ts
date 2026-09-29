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
  if (languageId === 'markdown' || filePath?.match(/\.(md|markdown)$/i)) {
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

    if (seg.kind === 'table' && seg.table) {
      const cell = findTableCellAtOffset(source, seg, offset);
      if (cell) return cell;
      continue;
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

/** Table hover: translate the single cell under the cursor (same text as document batch items). */
function findTableCellAtOffset(
  _source: string,
  seg: Segment,
  offset: number,
): LocatedDocumentSegment | null {
  if (!seg.table) return null;
  for (const row of seg.table.cells) {
    for (const cell of row) {
      if (!cell.range) continue;
      if (offset >= cell.range.start && offset < cell.range.end) {
        return {
          segment: seg,
          range: cell.range,
          text: cell.text,
          placeholders: cell.placeholders,
        };
      }
    }
  }
  return null;
}
