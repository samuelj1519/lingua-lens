import { isScalar, isSeq, parseDocument, visit, Scalar, type Scalar as ScalarNode } from 'yaml';
import type { StructuredFormatAdapter, StructuredStringSpan, YamlBlockChomp } from './types';
import { shouldSkipStructuredStringValue } from './skipValue';

function blockContentIndent(bodyLiteral: string): string {
  for (const line of bodyLiteral.split('\n')) {
    if (line.trim().length === 0) continue;
    return line.match(/^(\s*)/)?.[1] ?? '';
  }
  return '';
}

function parseBlockChomp(headerFragment: string): YamlBlockChomp {
  const h = headerFragment.trim();
  if (/[|>]-/.test(h)) return 'strip';
  if (/[|>]\+/.test(h)) return 'keep';
  return 'clip';
}

/** Block body replace range excludes the structural newline before a sibling key (all chomp styles). */
function blockBodyReplaceEnd(source: string, bodyStart: number, scalarEnd: number): number {
  let end = scalarEnd;
  if (end > bodyStart && source[end - 1] === '\n') end -= 1;
  return end;
}

function spanFromScalar(source: string, node: ScalarNode): StructuredStringSpan | null {
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
    const headerEnd = source.indexOf('\n', scalarStart);
    const bodyStart = headerEnd < 0 ? scalarStart : headerEnd + 1;
    const headerFragment = source.slice(scalarStart, bodyStart);
    const chomp = parseBlockChomp(headerFragment);
    const bodyEnd = blockBodyReplaceEnd(source, bodyStart, scalarEnd);
    const bodyLiteral = source.slice(bodyStart, bodyEnd);
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
        chomp,
        folded: node.type === Scalar.BLOCK_FOLDED,
        scalarEndsWithNewline: scalarEnd > scalarStart && source[scalarEnd - 1] === '\n',
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
        const span = spanFromScalar(source, pair.value);
        if (span) spans.push(span);
      },
      Seq(_key, seq) {
        if (!isSeq(seq)) return;
        for (const item of seq.items) {
          if (!isScalar(item)) continue;
          const span = spanFromScalar(source, item);
          if (span) spans.push(span);
        }
      },
    });
    return spans;
  },
};
