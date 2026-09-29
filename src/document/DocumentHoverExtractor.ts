import type { DocumentSnapshot, TextUnit, UnitKind } from '../types';
import type { AppLogger } from '../util/logger';
import { locateSegmentAtOffset } from './DocumentSegmentLocator';
import { isDocumentHoverLanguage } from './documentLanguages';

export class DocumentHoverExtractor {
  constructor(private readonly log: AppLogger) {}

  extractAt(doc: DocumentSnapshot, offset: number): TextUnit | null {
    const path = doc.uri.replace(/^file:\/\//, '');
    if (!isDocumentHoverLanguage(doc.languageId, path)) return null;

    const located = locateSegmentAtOffset(doc.getText(), doc.languageId, offset, path);
    if (!located) return null;

    const kind: UnitKind =
      located.segment.kind === 'frontmatter'
        ? 'frontmatter'
        : located.segment.kind === 'heading'
          ? 'documentHeading'
          : located.segment.kind === 'table'
            ? 'documentTableCell'
            : 'documentParagraph';

    const rawText = doc.getText().slice(located.range.start, located.range.end);
    this.log.debug(
      `extract: document ${kind} (${doc.languageId}) offsets ${located.range.start}-${located.range.end}`,
    );

    return {
      kind,
      range: located.range,
      rawText,
      text: located.text,
      placeholders: located.placeholders,
      languageId: doc.languageId,
      source: 'document',
    };
  }
}
