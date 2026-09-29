import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import type { Root, Content, PhrasingContent } from 'mdast';
import type { Segment } from '../types';
import { sha256HexPrefix } from '../util/hash';
import { protect } from '../parsing/placeholders';
import { splitListIntoLineItems } from './listFallback';

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
      if (node.type === 'list') {
        pushContainer(segments, `s${id++}`, 'list', start, end, source);
        return;
      }
      if (node.type === 'blockquote') {
        pushContainer(segments, `s${id++}`, 'blockquote', start, end, source);
        return;
      }
      if (node.type === 'table') {
        pushContainer(segments, `s${id++}`, 'table', start, end, source);
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

function pushContainer(
  segments: Segment[],
  segId: string,
  containerKind: 'list' | 'table' | 'blockquote',
  start: number,
  end: number,
  source: string,
): void {
  const raw = source.slice(start, end);
  const p = protect(raw);
  const seg: Segment = {
    id: segId,
    kind: containerKind === 'list' ? 'list' : containerKind === 'table' ? 'table' : 'blockquote',
    range: { start, end },
    sourceText: p.text,
    placeholders: p.placeholders,
    hash: sha256HexPrefix(raw, 16),
    linePrefix: '',
    containerKind,
  };
  if (containerKind === 'list') {
    seg.listFallbackItems = splitListIntoLineItems(segId, raw);
  }
  segments.push(seg);
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
      if (c.type === 'strong') return `**${inlineToText(c.children, _source)}**`;
      if (c.type === 'emphasis') return `*${inlineToText(c.children, _source)}*`;
      if (c.type === 'delete') return `~~${inlineToText(c.children, _source)}~~`;
      if (c.type === 'break') return '\n';
      if ('children' in c && Array.isArray(c.children)) {
        return inlineToText(c.children as PhrasingContent[], _source);
      }
      return '';
    })
    .join('');
}
