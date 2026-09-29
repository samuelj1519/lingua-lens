import type { SyntaxNode } from 'web-tree-sitter';
import type { DocumentSnapshot, TextUnit, UnitKind } from '../types';
import { getSpec } from './languages/specs';
import { normalize } from './TextNormalizer';
import type { ParserService } from './ParserService';

export class TreeSitterExtractor {
  constructor(private readonly parser: ParserService) {}

  async extractAt(doc: DocumentSnapshot, offset: number): Promise<TextUnit | null> {
    const parsed = await this.parser.getTree(doc);
    if (!parsed) return null;
    const spec = getSpec(doc.languageId);
    if (!spec) return null;

    const text = doc.getText();
    let node = parsed.tree.rootNode.descendantForIndex(offset);
    const found = findCommentOrString(node, spec, 5);
    if (!found) return null;

    let start = found.node.startIndex;
    let end = found.node.endIndex;
    let kind = found.kind;

    if (kind === 'lineComment' && spec.commentTypes.has(found.node.type)) {
      const merged = mergeLineComments(found.node, text, spec);
      start = merged.start;
      end = merged.end;
    }

    const rawText = text.slice(start, end);
    const norm = normalize(kind, rawText, doc.languageId);
    if (!norm.text.trim()) return null;

    return {
      kind,
      range: { start, end },
      rawText,
      text: norm.text,
      placeholders: norm.placeholders,
      languageId: doc.languageId,
      source: 'tree-sitter',
    };
  }
}

function findCommentOrString(
  node: SyntaxNode,
  spec: ReturnType<typeof getSpec>,
  depth: number,
): { node: SyntaxNode; kind: UnitKind } | null {
  if (!spec) return null;
  let cur: SyntaxNode | null = node;
  for (let i = 0; i < depth && cur; i++) {
    if (spec.commentTypes.has(cur.type)) {
      const cls = spec.classifyComment(cur.text);
      const kind: UnitKind = cls === 'doc' ? 'docComment' : cls === 'block' ? 'blockComment' : 'lineComment';
      return { node: cur, kind };
    }
    if (spec.templateTypes?.has(cur.type)) {
      return { node: cur, kind: 'templateString' };
    }
    if (spec.stringTypes.has(cur.type)) {
      const kind: UnitKind = isPythonDocstring(cur) ? 'docstring' : 'string';
      return { node: cur, kind };
    }
    cur = cur.parent;
  }
  return null;
}

function isPythonDocstring(node: SyntaxNode): boolean {
  if (node.type !== 'string') return false;
  const parent = node.parent;
  if (!parent || parent.type !== 'expression_statement') return false;
  const gp = parent.parent;
  if (!gp) return false;
  if (gp.type === 'module') return parent.parent?.children.indexOf(parent) === 0;
  if (gp.type === 'block') {
    const blockParent = gp.parent;
    if (blockParent && ['function_definition', 'class_definition'].includes(blockParent.type)) {
      return gp.children.indexOf(parent) === 0;
    }
  }
  return false;
}

function mergeLineComments(
  node: SyntaxNode,
  fullText: string,
  spec: NonNullable<ReturnType<typeof getSpec>>,
): { start: number; end: number } {
  const lines = fullText.split('\n');
  const startLine = node.startPosition.row;
  const prefix = lineCommentPrefix(node.text);
  let first = node;
  let last = node;

  const isPureLineComment = (_line: string, row: number): SyntaxNode | null => {
    const lineStart = fullText.split('\n').slice(0, row).join('\n').length + (row > 0 ? 1 : 0);
    const lineText = lines[row] ?? '';
    if (!lineText.trim().startsWith(prefix)) return null;
    const before = lineText.split(prefix)[0];
    if (before.trim()) return null;
    const n = node.tree.rootNode.descendantForIndex(lineStart + before.length + prefix.length);
    let cur: SyntaxNode | null = n;
    while (cur) {
      if (spec.commentTypes.has(cur.type) && spec.classifyComment(cur.text) === 'line') {
        if (lineCommentPrefix(cur.text) === prefix) return cur;
      }
      cur = cur.parent;
    }
    return null;
  };

  for (let row = startLine - 1; row >= 0 && startLine - row <= 100; row--) {
    if (lines[row]?.trim() === '') break;
    const n = isPureLineComment(lines[row] ?? '', row);
    if (!n) break;
    first = n;
  }
  for (let row = startLine + 1; row < lines.length && row - startLine <= 100; row++) {
    if (lines[row]?.trim() === '') break;
    const n = isPureLineComment(lines[row] ?? '', row);
    if (!n) break;
    last = n;
  }

  return { start: first.startIndex, end: last.endIndex };
}

function lineCommentPrefix(text: string): string {
  const t = text.trimStart();
  if (t.startsWith('///')) return '///';
  if (t.startsWith('//!')) return '//!';
  if (t.startsWith('//')) return '//';
  if (t.startsWith('#')) return '#';
  return '//';
}
