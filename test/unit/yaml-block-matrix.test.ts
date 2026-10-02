import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { yamlAdapter } from '../../src/document/structured/yamlAdapter';
import { buildStructuredReplacement } from '../../src/document/structured/escape';
import { expectedYamlBlockParsedValue } from '../../src/document/structured/yamlBlockEncode';
import type { StructuredStringSpan } from '../../src/document/structured/types';
import { StructuredSegmenter } from '../../src/document/structured/StructuredSegmenter';
import { assembleStructuredTranslated } from '../../src/document/structured/applyReplacements';
import type { DocSession } from '../../src/document/DocTranslationService';
import type { Segment } from '../../src/types';

const ANCHOR = 'com.example.anchor';
const BODY = 'Body line one';

const STYLES = ['|', '|-', '|+', '>', '>-', '>+', '|2', '>2', '|+2', '|2-'] as const;

type LayoutId =
  | 'top'
  | 'nested'
  | 'listItem'
  | 'nestedListDash'
  | 'nestedListBare'
  | 'nestedListTriple'
  | 'nestedListWrap'
  | 'listItemNamed'
  | 'eofNoNl';

const TRANSLATIONS: Array<{ id: string; tr: string }> = [
  { id: 'single', tr: 'TR' },
  { id: 'multi', tr: 'a\nb' },
  { id: 'lead-single', tr: '  TR' },
  { id: 'lead-multi', tr: '  a\n  b' },
  { id: 'first-blank', tr: '\nbody' },
  { id: 'tab', tr: '\ta' },
  { id: 'yaml-like', tr: '\u952e: \u503c\n- \u4e0d\u662f\u5217\u8868' },
  { id: 'trail-nl', tr: 'TR\n' },
  { id: 'empty', tr: '' },
];

function metaFromSpan(span: StructuredStringSpan) {
  return {
    valueStart: span.replaceRange.start,
    valueEnd: span.replaceRange.end,
    sourceLiteral: span.sourceLiteral,
    decoded: span.decoded,
    escape: span.escape,
    yamlBlock: span.yamlBlock,
    xmlAttrQuote: span.xmlAttrQuote,
  };
}

function blockSpan(src: string): StructuredStringSpan {
  const span = yamlAdapter.extractSpans(src).find((s) => s.yamlBlock);
  if (!span?.yamlBlock) throw new Error(`no block span in ${JSON.stringify(src)}`);
  return span;
}

function expectedValue(src: string, tr: string): string {
  const span = blockSpan(src);
  return expectedYamlBlockParsedValue(span.yamlBlock!, span.decoded, tr);
}

function translateBlockOnly(src: string, tr: string): string {
  const span = blockSpan(src);
  const rep = buildStructuredReplacement(metaFromSpan(span), tr);
  return src.slice(0, rep.start) + rep.literal + src.slice(rep.end);
}

function sessionWithTranslations(source: string, segments: Segment[], fake: string): DocSession {
  const results = new Map<string, { status: 'done'; text: string }>();
  segments.forEach((s) => {
    results.set(s.id, { status: 'done', text: fake });
  });
  return {
    sourceUri: { toString: () => 'file:///x' } as unknown as import('vscode').Uri,
    previewUri: { toString: () => 'lingualens:/x' } as unknown as import('vscode').Uri,
    target: 'zh-CN',
    sourceVersion: 1,
    sourceLabel: 'x',
    segments,
    plans: new Map(),
    results,
    cts: { cancel: () => {}, token: { isCancellationRequested: false } } as unknown as import('vscode').CancellationTokenSource,
    doneCount: segments.length,
    totalTranslatable: segments.length,
    sourceText: source,
    renderMode: 'structured',
  };
}

function translateViaSegmenter(src: string, tr: string): string {
  const seg = new StructuredSegmenter();
  const segments = seg.segment(src, 'yaml', 'a.yaml');
  return assembleStructuredTranslated(src, sessionWithTranslations(src, segments, tr));
}

function blockBodyLines(style: string, indent: string, trailingBlankInBlock: boolean): string {
  const extra = trailingBlankInBlock ? `\n${indent}` : '';
  if (style.includes('2')) {
    return `${indent}  ${BODY}${extra}\n`;
  }
  return `${indent}${BODY}${extra}\n`;
}

function blankBeforeSibling(afterBlock: boolean): string {
  return afterBlock ? '\n' : '';
}

function buildSource(
  layout: LayoutId,
  style: string,
  trailingBlankInBlock: boolean,
  blankAfterBlock: boolean,
  eofNoNl: boolean,
): string {
  const gap = blankBeforeSibling(blankAfterBlock);
  let src: string;
  switch (layout) {
    case 'top':
      src = `k: ${style}\n${blockBodyLines(style, '  ', trailingBlankInBlock)}${gap}sib: ${ANCHOR}\n`;
      break;
    case 'nested':
      src = `root:\n  k: ${style}\n${blockBodyLines(style, '    ', trailingBlankInBlock)}${gap}  sib: ${ANCHOR}\n`;
      break;
    case 'listItem':
      src = `- k: ${style}\n${blockBodyLines(style, '    ', trailingBlankInBlock)}${gap}  sib: ${ANCHOR}\n- tail: z\n`;
      break;
    case 'nestedListDash':
      src = `- - k: ${style}\n${blockBodyLines(style, '      ', trailingBlankInBlock)}${gap}    sib: ${ANCHOR}\n  - tail: z\n`;
      break;
    case 'nestedListBare':
      src = `- - ${style}\n${blockBodyLines(style, '    ', trailingBlankInBlock)}${gap}  - ${ANCHOR}\n- z\n`;
      break;
    case 'nestedListTriple':
      src = `- - - ${style}\n${blockBodyLines(style, '      ', trailingBlankInBlock)}${gap}    - ${ANCHOR}\n  - z\n`;
      break;
    case 'listItemNamed':
      src = `items:\n  - name: x\n    k: ${style}\n${blockBodyLines(style, '      ', trailingBlankInBlock)}${gap}    sib: ${ANCHOR}\n`;
      break;
    case 'nestedListWrap':
      src = `-\n  k: ${style}\n${blockBodyLines(style, '    ', trailingBlankInBlock)}${gap}  sib: ${ANCHOR}\n- tail: z\n`;
      break;
    case 'eofNoNl':
      src = `k: ${style}\n${blockBodyLines(style, '  ', trailingBlankInBlock)}${gap}sib: ${ANCHOR}`;
      break;
    default:
      throw new Error(layout);
  }
  if (layout !== 'eofNoNl' && eofNoNl) {
    src = src.endsWith('\n') ? src.slice(0, -1) : src;
  }
  return src;
}

function parseYaml(src: string): unknown {
  const text = src.endsWith('\n') || layoutNeedsNl(src) ? src : `${src}\n`;
  return YAML.parse(text, { strict: false });
}

function layoutNeedsNl(_src: string): boolean {
  return true;
}

function readTargetValue(parsed: unknown, layout: LayoutId): string {
  switch (layout) {
    case 'top':
    case 'eofNoNl':
      return (parsed as { k: string }).k;
    case 'nested':
      return (parsed as { root: { k: string } }).root.k;
    case 'listItem':
      return (parsed as Array<{ k: string }>)[0].k;
    case 'nestedListDash':
      return (parsed as Array<Array<{ k: string }>>)[0][0].k;
    case 'nestedListBare':
      return (parsed as string[][])[0][0];
    case 'nestedListTriple':
      return (parsed as string[][][])[0][0][0];
    case 'listItemNamed':
      return (parsed as { items: Array<{ k: string }> }).items[0].k;
    case 'nestedListWrap':
      return (parsed as Array<{ k: string }>)[0].k;
    default:
      throw new Error(String(layout));
  }
}

function readAnchor(parsed: unknown, layout: LayoutId): unknown {
  switch (layout) {
    case 'top':
    case 'eofNoNl':
      return (parsed as { sib: string }).sib;
    case 'nested':
      return (parsed as { root: { sib: string } }).root.sib;
    case 'listItem':
      return (parsed as Array<{ sib: string; tail: string }>)[0].sib;
    case 'nestedListDash':
      return (parsed as Array<Array<{ sib: string }>>)[0][0].sib;
    case 'nestedListBare':
      return (parsed as string[][])[0][1];
    case 'nestedListTriple':
      return (parsed as string[][][])[0][0][1];
    case 'listItemNamed':
      return (parsed as { items: Array<{ sib: string }> }).items[0].sib;
    case 'nestedListWrap':
      return (parsed as Array<{ sib: string }>)[0].sib;
    default:
      throw new Error(String(layout));
  }
}

function readTail(parsed: unknown, layout: LayoutId): unknown {
  switch (layout) {
    case 'listItem':
      return (parsed as Array<{ tail: string }>)[1].tail;
    case 'nestedListDash':
      return (parsed as Array<Array<{ tail: string }>>)[0][1].tail;
    case 'nestedListBare':
      return (parsed as string[])[1];
    case 'nestedListTriple':
      return (parsed as string[][])[0][1];
    case 'nestedListWrap':
      return (parsed as Array<{ tail: string }>)[1].tail;
    default:
      return undefined;
  }
}

function identityBytes(src: string): void {
  const span = blockSpan(src);
  const rep = buildStructuredReplacement(metaFromSpan(span), span.decoded);
  expect(src.slice(rep.start, rep.end)).toBe(rep.literal);
  const seg = new StructuredSegmenter();
  const segments = seg.segment(src, 'yaml', 'a.yaml');
  const session = sessionWithTranslations(src, segments, span.decoded);
  expect(assembleStructuredTranslated(src, session)).toBe(src);
}

describe('yaml block matrix', () => {
  const layouts: LayoutId[] = [
    'top',
    'nested',
    'listItem',
    'nestedListDash',
    'nestedListBare',
    'nestedListTriple',
    'nestedListWrap',
    'listItemNamed',
    'eofNoNl',
  ];

  it('full matrix: styles × layout × blanks × translations', () => {
    const failures: string[] = [];
    for (const style of STYLES) {
      for (const layout of layouts) {
        for (const trailingBlankInBlock of [false, true]) {
          for (const blankAfterBlock of [false, true]) {
            const src = buildSource(layout, style, trailingBlankInBlock, blankAfterBlock, layout === 'eofNoNl');
            const label = `${style}/${layout}/tb${trailingBlankInBlock}/ab${blankAfterBlock}`;
            try {
              identityBytes(src);
            } catch (e) {
              failures.push(`${label} identity: ${e}`);
              continue;
            }
            for (const { id, tr } of TRANSLATIONS) {
              const caseId = `${label}/${id}`;
              try {
                const out = translateBlockOnly(src, tr);
                const parsed = parseYaml(out);
                expect(readAnchor(parsed, layout)).toBe(ANCHOR);
                const tail = readTail(parsed, layout);
                if (tail !== undefined) expect(tail).toBe('z');
                expect(readTargetValue(parsed, layout)).toBe(expectedValue(src, tr));
                const viaSeg = translateViaSegmenter(src, tr);
                const parsed2 = parseYaml(viaSeg);
                expect(readTargetValue(parsed2, layout)).toBe(expectedValue(src, tr));
              } catch (e) {
                failures.push(`${caseId}: ${e}`);
              }
            }
          }
        }
      }
    }
    if (failures.length > 0) {
      throw new Error(`${failures.length} failures:\n${failures.slice(0, 40).join('\n')}`);
    }
  });

  it('user repro: keep trailing newlines', () => {
    const src = 'k: |+\n  Body\n\n\nsib: s\n';
    const tr = '\u8baf\u6587';
    const out = translateBlockOnly(src, tr);
    expect(YAML.parse(out).k).toBe(`${tr}\n\n\n`);
    expect(YAML.parse(out).sib).toBe('s');
  });

  it('user repro: list item indent |2', () => {
    const src = '- k: |2\n    Body line one\n  sib: x\n- y\n';
    const out = translateBlockOnly(src, 'TR');
    expect(() => YAML.parse(out)).not.toThrow();
    expect(YAML.parse(out)[0].k).toBe('TR\n');
  });

  it('user repro: list item leading whitespace uses |2 not |4', () => {
    const src = '- k: |\n    Body\n  sib: x\n';
    const out = translateBlockOnly(src, '  a\nb');
    expect(out).toContain('|2');
    expect(out).not.toMatch(/\|4/);
    expect(YAML.parse(out)[0].k).toBe('  a\nb\n');
  });

  it('user repro: bare nested list block |2', () => {
    const src = '- - |2\n    Body line one\n  - Sibling value text\n- Other value text\n';
    const tr = '\u8baf\u6587\u5355\u884c';
    const out = translateBlockOnly(src, tr);
    expect(() => YAML.parse(out)).not.toThrow();
    expect(YAML.parse(out)[0][0]).toBe(`${tr}\n`);
    expect(out).toMatch(/- - \|2\n    /);
  });

  it('user repro: bare nested list leading whitespace uses |2 not |4', () => {
    const src = '- - |\n    Body line one\n  - Sibling value text\n- Other value text\n';
    const out = translateBlockOnly(src, '  a\nb');
    expect(out).toContain('|2');
    expect(out).not.toMatch(/\|4/);
    expect(YAML.parse(out)[0][0]).toBe('  a\nb\n');
  });
});
