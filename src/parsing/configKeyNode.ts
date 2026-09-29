import type { SyntaxNode } from 'web-tree-sitter';
import type { LanguageSpec } from './languages/specs';
import { splitConfigIdentifier, stripConfigKeyQuotes } from './configKey';

export function resolveConfigKeyNode(
  node: SyntaxNode,
  offset: number,
  spec: LanguageSpec,
): { node: SyntaxNode; text: string } | null {
  if (spec.propertyKeyTypes?.has(node.type)) {
    const ident = stripConfigKeyQuotes(node.text);
    const words = splitConfigIdentifier(ident);
    return { node, text: words || ident };
  }

  let cur: SyntaxNode | null = node;
  for (let i = 0; i < 8 && cur; i++) {
    if (spec.pairTypes?.has(cur.type)) {
      const key = cur.childForFieldName('key') ?? cur.namedChildren[0];
      if (key && offset >= key.startIndex && offset < key.endIndex) {
        const ident = keyText(key);
        const words = splitConfigIdentifier(ident);
        return { node: key, text: words || ident };
      }
      return null;
    }
    cur = cur.parent;
  }
  return null;
}

function keyText(node: SyntaxNode): string {
  const raw = node.text;
  if (node.type === 'string') {
    return stripConfigKeyQuotes(raw.slice(1, -1));
  }
  return stripConfigKeyQuotes(raw);
}
