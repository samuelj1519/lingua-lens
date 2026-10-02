import { parseTree, type Node } from 'jsonc-parser';
import type { StructuredFormatAdapter, StructuredStringSpan } from './types';
import { shouldSkipStructuredStringValue } from './skipValue';

function decodeJsonStringLiteral(literal: string): string {
  return JSON.parse(literal) as string;
}

function isPropertyKeyString(node: Node, parent: Node | undefined): boolean {
  return parent?.type === 'property' && parent.children?.[0] === node;
}

function visit(node: Node, parent: Node | undefined, source: string, out: StructuredStringSpan[]): void {
  if (node.type === 'string') {
    if (isPropertyKeyString(node, parent)) return;
    const start = node.offset;
    const end = node.offset + node.length;
    const literal = source.slice(start, end);
    const innerStart = start + 1;
    const innerEnd = end - 1;
    const innerLiteral = source.slice(innerStart, innerEnd);
    const decoded = decodeJsonStringLiteral(literal);
    if (shouldSkipStructuredStringValue(decoded)) return;
    out.push({
      replaceRange: { start: innerStart, end: innerEnd },
      sourceLiteral: innerLiteral,
      decoded,
      escape: 'json',
    });
    return;
  }
  if (node.children) {
    for (const child of node.children) visit(child, node, source, out);
  }
}

export const jsonAdapter: StructuredFormatAdapter = {
  formatId: 'json',
  extractSpans(source: string): StructuredStringSpan[] {
    const tree = parseTree(source);
    if (!tree) return [];
    const spans: StructuredStringSpan[] = [];
    visit(tree, undefined, source, spans);
    return spans;
  },
};
