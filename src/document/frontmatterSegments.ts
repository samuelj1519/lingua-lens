import type { Segment } from '../types';
import type { TranslateConfig } from '../config/types';
import { sha256HexPrefix } from '../util/hash';
import { protect } from '../parsing/placeholders';
import {
  DEFAULT_FRONTMATTER_FIELDS,
  detectFrontmatterBlock,
  parseFrontmatterFields,
  shouldTranslateFrontmatterField,
} from './frontmatterParse';

export function buildFrontmatterSegments(
  source: string,
  cfg: Pick<TranslateConfig, 'targetLanguage' | 'detection' | 'privacy' | 'markdown'>,
  idStart: number,
): { segments: Segment[]; nextId: number; block: ReturnType<typeof detectFrontmatterBlock> } {
  const block = detectFrontmatterBlock(source);
  if (!block) return { segments: [], nextId: idStart, block: null };

  const whitelist = cfg.markdown.frontmatterFields ?? DEFAULT_FRONTMATTER_FIELDS;
  const fields = parseFrontmatterFields(source, block);
  const segments: Segment[] = [];
  let id = idStart;

  let cursor = block.start;
  const translatable = fields.filter((f) => shouldTranslateFrontmatterField(f, whitelist, cfg));

  const sortedFields = [...translatable].sort((a, b) => a.valueRange.start - b.valueRange.start);

  for (const field of sortedFields) {
    if (cursor < field.valueRange.start) {
      segments.push(preservedSegment(`s${id++}`, cursor, field.valueRange.start, source));
    }
    const p = protect(field.valueText);
    segments.push({
      id: `s${id++}`,
      kind: 'frontmatter',
      range: field.valueRange,
      sourceText: p.text,
      placeholders: p.placeholders,
      hash: sha256HexPrefix(p.text, 16),
      linePrefix: '',
      frontmatterMeta: {
        fieldKey: field.key,
        insertAfter: field.insertAfter,
        blockEnd: block.end,
      },
    });
    cursor = field.valueRange.end;
  }

  if (cursor < block.end) {
    segments.push(preservedSegment(`s${id++}`, cursor, block.end, source));
  }

  return { segments, nextId: id, block };
}

function preservedSegment(id: string, start: number, end: number, source: string): Segment {
  const text = source.slice(start, end);
  return {
    id,
    kind: 'preserved',
    range: { start, end },
    sourceText: text,
    placeholders: [],
    hash: sha256HexPrefix(text, 16),
    linePrefix: '',
  };
}
