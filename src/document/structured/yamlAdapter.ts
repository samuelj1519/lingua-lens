import {
  isScalar,
  isSeq,
  parseDocument,
  visit,
  Scalar,
  type Scalar as ScalarNode,
  type Pair as YamlPair,
} from 'yaml';
import type { StructuredFormatAdapter, StructuredStringSpan, YamlBlockChomp } from './types';
import { shouldSkipStructuredStringValue } from './skipValue';

function blockContentIndent(bodyLiteral: string): string {
  for (const line of bodyLiteral.split('\n')) {
    if (line.trim().length === 0) continue;
    return line.match(/^(\s*)/)?.[1] ?? '';
  }
  return '';
}

function parseBlockHeader(headerFragment: string): {
  chomp: YamlBlockChomp;
  indentIndicator: number | null;
} {
  const h = headerFragment.trim();
  const m = h.match(/^([|>])(?:(\d+)([-+])|([-+])(\d+)|(\d+)|([-+]))?$/);
  let chomp: YamlBlockChomp = 'clip';
  let indentIndicator: number | null = null;
  if (m?.[2] && m[3]) {
    indentIndicator = Number.parseInt(m[2], 10);
    chomp = m[3] === '-' ? 'strip' : 'keep';
  } else if (m?.[4] && m[5]) {
    chomp = m[4] === '-' ? 'strip' : 'keep';
    indentIndicator = Number.parseInt(m[5], 10);
  } else if (m?.[6]) {
    indentIndicator = Number.parseInt(m[6], 10);
  } else if (m?.[7]) {
    chomp = m[7] === '-' ? 'strip' : 'keep';
  }
  return { chomp, indentIndicator };
}

/** Block body replace range excludes the structural newline before a sibling key (all chomp styles). */
function blockBodyReplaceEnd(source: string, bodyStart: number, scalarEnd: number): number {
  let end = scalarEnd;
  if (end > bodyStart && source[end - 1] === '\n') end -= 1;
  return end;
}

/** Column of the map key or of the `-` seq-item indicator that owns this block scalar. */
function blockHeaderParentColumn(source: string, pair: YamlPair | undefined, scalar: ScalarNode): number {
  const keyNode = pair?.key;
  const range =
    keyNode && typeof keyNode === 'object' && 'range' in keyNode
      ? (keyNode as { range?: [number, number, number] }).range
      : undefined;
  if (range) {
    const keyStart = range[0];
    const lineStart = source.lastIndexOf('\n', keyStart - 1) + 1;
    return keyStart - lineStart;
  }
  const token = scalar.srcToken;
  if (token && typeof token === 'object' && 'indent' in token && typeof token.indent === 'number') {
    return token.indent;
  }
  return 0;
}

function spanFromScalar(
  source: string,
  node: ScalarNode,
  pair?: YamlPair,
): StructuredStringSpan | null {
  if (!isScalar(node) || typeof node.value !== 'string') return null;
  const decoded = node.value;
  if (shouldSkipStructuredStringValue(decoded)) return null;
  const range = node.range;
  if (!range) return null;
  const scalarStart = range[0];
  const valueEnd = range[1] ?? range[0];
  const scalarEnd = range[2] ?? range[1];
  const raw = source.slice(scalarStart, scalarEnd);

  if (node.type === Scalar.BLOCK_LITERAL || node.type === Scalar.BLOCK_FOLDED) {
    const headerKeyIndent = blockHeaderParentColumn(source, pair, node);
    const headerEnd = source.indexOf('\n', scalarStart);
    const bodyStart = headerEnd < 0 ? scalarStart : headerEnd + 1;
    const headerFragment = source.slice(scalarStart, bodyStart);
    const { chomp, indentIndicator } = parseBlockHeader(headerFragment);
    const bodyEnd = blockBodyReplaceEnd(source, bodyStart, scalarEnd);
    const bodyLiteral = source.slice(bodyStart, bodyEnd);
    const trailingNewlinesOutsideBody = (source.slice(bodyEnd, scalarEnd).match(/\n/g) ?? []).length;
    return {
      replaceRange: { start: bodyStart, end: bodyEnd },
      sourceLiteral: bodyLiteral,
      decoded,
      escape: 'yaml-block',
      yamlBlock: {
        bodyStart,
        bodyEnd,
        scalarStart,
        scalarEnd,
        contentIndent: blockContentIndent(bodyLiteral),
        headerKeyIndent,
        indentIndicator,
        chomp,
        folded: node.type === Scalar.BLOCK_FOLDED,
        scalarEndsWithNewline: scalarEnd > scalarStart && source[scalarEnd - 1] === '\n',
        trailingNewlinesOutsideBody,
      },
    };
  }

  const quote =
    raw.trimStart().startsWith("'") ? "'" : raw.trimStart().startsWith('"') ? '"' : undefined;
  let escape: StructuredStringSpan['escape'] = 'yaml-plain';
  if (quote === "'") escape = 'yaml-single';
  else if (quote === '"') escape = 'yaml-double';

  const replaceEnd = scalarEnd > valueEnd ? valueEnd : scalarEnd;
  const sourceLiteral = source.slice(scalarStart, replaceEnd);
  return {
    replaceRange: { start: scalarStart, end: replaceEnd },
    sourceLiteral,
    decoded,
    escape,
  };
}

export const yamlAdapter: StructuredFormatAdapter = {
  formatId: 'yaml',
  extractSpans(source: string): StructuredStringSpan[] {
    const doc = parseDocument(source, { keepSourceTokens: true, strict: false });
    const spans: StructuredStringSpan[] = [];
    visit(doc, {
      Pair(_key, pair) {
        if (!isScalar(pair.value)) return;
        const span = spanFromScalar(source, pair.value, pair);
        if (span) spans.push(span);
      },
      Seq(_key, seq) {
        if (!isSeq(seq)) return;
        for (const item of seq.items) {
          if (!isScalar(item)) continue;
          const span = spanFromScalar(source, item, undefined);
          if (span) spans.push(span);
        }
      },
    });
    return spans;
  },
};
