import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import type { Root, Content, PhrasingContent } from 'mdast';
import type { Segment } from '../types';
import { sha256HexPrefix } from '../util/hash';
import { protect } from '../parsing/placeholders';

export class MarkdownSegmenter {
  private readonly processor = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter, ['yaml', 'toml']);

  segment(source: string): Segment[] {
    const tree = this.processor.parse(source) as Root;
    const segments: Segment[] = [];
    let id = 0;
    const visit = (node: Content, linePrefix = ''): void => {
      if (!node.position) return;
      const start = node.position.start.offset ?? 0;
      const end = node.position.end.offset ?? source.length;
      if (node.type === 'code' || node.type === 'html' || node.type === 'yaml') {
        segments.push(preserved(`s${id++}`, start, end, source.slice(start, end)));
        return;
      }
      if (node.type === 'heading') {
        const raw = source.slice(start, end);
        const hashes = raw.match(/^#+\s/)?.[0] ?? '';
        const inner = raw.slice(hashes.length);
        const p = protect(inner.trim());
        segments.push({
          id: `s${id++}`,
          kind: 'heading',
          range: { start, end },
          sourceText: p.text,
          placeholders: p.placeholders,
          hash: sha256HexPrefix(p.text, 16),
          linePrefix,
          headingDepth: node.depth,
        });
        return;
      }
      if (node.type === 'paragraph') {
        const p = protect(inlineToText(node.children, source));
        segments.push({
          id: `s${id++}`,
          kind: 'paragraph',
          range: { start, end },
          sourceText: p.text,
          placeholders: p.placeholders,
          hash: sha256HexPrefix(p.text, 16),
          linePrefix,
        });
        return;
      }
      if (node.type === 'table') {
        segments.push(tableSegment(node, source, id));
        id++;
        return;
      }
      if ('children' in node && Array.isArray(node.children)) {
        for (const child of node.children as Content[]) {
          visit(child, linePrefix);
        }
      }
    };

    for (const child of tree.children) {
      visit(child as Content);
    }
    return segments;
  }
}

function preserved(id: string, start: number, end: number, text: string): Segment {
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

function inlineToText(children: PhrasingContent[], _source: string): string {
  return children
    .map((c) => {
      if (c.type === 'text') return c.value;
      if (c.type === 'inlineCode') return '`' + c.value + '`';
      if (c.type === 'link') return `[${inlineToText(c.children, _source)}](${c.url})`;
      return '';
    })
    .join('');
}

function tableSegment(node: import('mdast').Table, source: string, id: number): Segment {
  const start = node.position?.start.offset ?? 0;
  const end = node.position?.end.offset ?? source.length;
  const cells: {
    id: string;
    text: string;
    placeholders: import('../types').Placeholder[];
    range: import('../types').OffsetRange;
  }[][] = [];
  let r = 0;
  for (const row of node.children) {
    const rowCells: {
      id: string;
      text: string;
      placeholders: import('../types').Placeholder[];
      range: import('../types').OffsetRange;
    }[] = [];
    let c = 0;
    for (const cell of row.children) {
      const text = inlineToText(cell.children, source);
      const p = protect(text);
      const cs = cell.position?.start.offset ?? start;
      const ce = cell.position?.end.offset ?? end;
      rowCells.push({
        id: `s${id}.r${r}.c${c}`,
        text: p.text,
        placeholders: p.placeholders,
        range: { start: cs, end: ce },
      });
      c++;
    }
    cells.push(rowCells);
    r++;
  }
  return {
    id: `s${id}`,
    kind: 'table',
    range: { start, end },
    sourceText: source.slice(start, end),
    placeholders: [],
    hash: sha256HexPrefix(source.slice(start, end), 16),
    linePrefix: '',
    table: { align: (node.align ?? []).join(','), cells },
  };
}
