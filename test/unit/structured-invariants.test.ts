import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { jsonAdapter } from '../../src/document/structured/jsonAdapter';
import { yamlAdapter } from '../../src/document/structured/yamlAdapter';
import { tomlAdapter } from '../../src/document/structured/tomlAdapter';
import { xmlAdapter } from '../../src/document/structured/xmlAdapter';
import type { StructuredFormatAdapter, StructuredStringSpan } from '../../src/document/structured/types';
import { buildStructuredReplacement } from '../../src/document/structured/escape';
import { StructuredSegmenter } from '../../src/document/structured/StructuredSegmenter';
import { assembleStructuredTranslated } from '../../src/document/structured/applyReplacements';
import type { DocSession } from '../../src/document/DocTranslationService';
import type { Segment } from '../../src/types';

/** Fake translation: newlines, quotes, colon-space, hash (YAML/TOML sensitive). */
const FAKE = 'FAKE\u00a9: line1\nline2 \'q\' "w" # hash';

function expectedYamlClipBlock(style: string, tr: string): string {
  const folded = style.startsWith('>');
  const flat = tr.replace(/\s*\n\s*/g, ' ').trim();
  if (folded) {
    if (style.includes('-')) return flat;
    if (style.includes('+')) return `${flat}\n`;
    return `${flat}\n`;
  }
  if (style.includes('-')) return tr.replace(/\n+$/, '');
  if (style.includes('+')) {
    const base = tr.replace(/\n+$/, '');
    const extra = tr.match(/\n+$/)?.[0] ?? '';
    return extra.length > 0 ? base + extra : `${base}\n`;
  }
  return tr.endsWith('\n') ? tr : `${tr}\n`;
}

function translateYamlSource(src: string, tr: string): string {
  return assembleStructuredTranslated(
    src,
    sessionWithFakeTranslations(src, new StructuredSegmenter().segment(src, 'yaml', 'a.yaml'), [], tr),
  );
}

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

function identityRoundTrip(adapter: StructuredFormatAdapter, source: string): void {
  const spans = adapter.extractSpans(source);
  for (const span of spans) {
    const rep = buildStructuredReplacement(metaFromSpan(span), span.decoded);
    expect(source.slice(rep.start, rep.end)).toBe(rep.literal);
  }
  const seg = new StructuredSegmenter();
  const lang =
    adapter.formatId === 'json'
      ? 'json'
      : adapter.formatId === 'yaml'
        ? 'yaml'
        : adapter.formatId === 'toml'
          ? 'toml'
          : 'xml';
  const ext = `.${adapter.formatId === 'yaml' ? 'yaml' : adapter.formatId}`;
  const segments = seg.segment(source, lang, `f${ext}`);
  const empty = new Map<string, { status: 'done'; text: string }>();
  const session = sessionWithFakeTranslations(source, segments, spans, '');
  session.results = empty;
  expect(assembleStructuredTranslated(source, session)).toBe(source);
}

function sessionWithFakeTranslations(
  source: string,
  segments: Segment[],
  _spans: StructuredStringSpan[],
  fake: string,
): DocSession {
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

function translatedRoundTrip(
  adapter: StructuredFormatAdapter,
  source: string,
  parse: (s: string) => unknown,
  assertValue?: (before: unknown, after: unknown) => void,
): void {
  const spans = adapter.extractSpans(source);
  const seg = new StructuredSegmenter();
  const lang = adapter.formatId === 'yaml' ? 'yaml' : adapter.formatId;
  const ext = adapter.formatId === 'json' ? 'json' : adapter.formatId;
  const segments = seg.segment(source, lang, `a.${ext}`);
  const session = sessionWithFakeTranslations(source, segments, spans, FAKE);
  const out = assembleStructuredTranslated(source, session);
  const before = parse(source);
  const after = parse(out);
  expect(Object.keys(after as object)).toEqual(Object.keys(before as object));
  if (assertValue) assertValue(before, after);
}

describe('structured invariants JSON', () => {
  it('identity: unicode and slash escapes preserved', () => {
    identityRoundTrip(jsonAdapter, '{"k":"\\u00e9","p":"a\\/b","msg":"Hello"}');
  });

  it('does not extract property keys', () => {
    const src = '{"msg":"value","https":"x"}';
    const decoded = jsonAdapter.extractSpans(src).map((s) => s.decoded);
    expect(decoded).toEqual(['value']);
  });

  it('parse: keys unchanged after fake translation', () => {
    translatedRoundTrip(jsonAdapter, '{"title":"Hello","n":1}', (s) => JSON.parse(s), (b, a) => {
      expect((a as { title: string }).title).toBe(FAKE);
    });
  });
});

describe('structured invariants YAML', () => {
  it('identity: plain, quoted, block, sequence', () => {
    identityRoundTrip(
      yamlAdapter,
      '# c\nplain: ok\nquoted: "Hello"\nseq:\n  - item one\nblock: |\n  line a\n  line b\n',
    );
  });

  it('block literal beside next key (r2 repro)', () => {
    const src = 'block: |\n  First line of text\nnext: com.example.app\n';
    translatedRoundTrip(yamlAdapter, src, (s) => YAML.parse(s), (_b, a) => {
      const o = a as { block: string; next: string };
      expect(o.block).toBe(`${FAKE}\n`);
      expect(o.next).toBe('com.example.app');
    });
    const seg = new StructuredSegmenter();
    const segments = seg.segment(src, 'yaml', 'a.yaml');
    const session = sessionWithFakeTranslations(src, segments, yamlAdapter.extractSpans(src), '\u8baf\u6587');
    const out = assembleStructuredTranslated(src, session);
    expect(out).toContain('\nnext:');
    expect(YAML.parse(out).block).toBe('\u8baf\u6587\n');
  });

  it('chomped block styles keep sibling keys (r4)', () => {
    const cases: Array<{ src: string; tr: string; check: (o: Record<string, unknown>) => void }> = [
      {
        src: 'strip: >-\n  Strip trailing text\nnext: com.example.app\n',
        tr: '\u8baf\u6587',
        check: (o) => {
          expect(o.strip).toBe('\u8baf\u6587');
          expect(o.next).toBe('com.example.app');
        },
      },
      {
        src: 'a:\n  b: |-\n    Nested block\n  c: com.example.app\n',
        tr: '\u8baf\u6587',
        check: (o) => {
          const a = o.a as Record<string, unknown>;
          expect(a.b).toBe('\u8baf\u6587');
          expect(a.c).toBe('com.example.app');
        },
      },
    ];
    for (const { src, tr, check } of cases) {
      identityRoundTrip(yamlAdapter, src);
      const out = assembleStructuredTranslated(
        src,
        sessionWithFakeTranslations(src, new StructuredSegmenter().segment(src, 'yaml', 'a.yaml'), [], tr),
      );
      check(YAML.parse(out) as Record<string, unknown>);
    }
  });

  it('block matrix: styles, layout, translations', () => {
    const styles = ['|', '>', '|-', '|+', '>-', '>+', '|2'];
    const translations = ['TR: ok', 'a: one\nb # two', FAKE] as const;
    const layouts: Array<{ parse: (s: string) => unknown; sibling: (o: unknown) => unknown }> = [
      {
        parse: (s) => YAML.parse(s.endsWith('\n') ? s : `${s}\n`),
        sibling: (o) => (o as { next: string }).next,
      },
      {
        parse: (s) => YAML.parse(s.endsWith('\n') ? s : `${s}\n`),
        sibling: (o) => (o as { root: { tail: string } }).root.tail,
      },
      {
        parse: (s) => YAML.parse(s.endsWith('\n') ? s : `${s}\n`),
        sibling: () => undefined,
      },
    ];
    const wrap = [
      (style: string) => `k: ${style}\n  Hello\nnext: com.example.app\n`,
      (style: string) => `root:\n  inner: ${style}\n    Hello\n  tail: com.example.app\n`,
      (style: string) => `k: ${style}\n  Hello\n`,
    ];
    for (let li = 0; li < wrap.length; li++) {
      for (const style of styles) {
        for (const tr of translations) {
          const src = wrap[li](style);
          identityRoundTrip(yamlAdapter, src);
          const before = layouts[li].parse(src);
          const after = layouts[li].parse(translateYamlSource(src, tr));
          expect(Object.keys(after as object).sort()).toEqual(Object.keys(before as object).sort());
          if (li < 2) expect(layouts[li].sibling(after)).toBe('com.example.app');
          const value =
            li === 1
              ? (after as { root: { inner: string } }).root.inner
              : (after as { k: string }).k;
          expect(value).toBe(expectedYamlClipBlock(style, tr));
        }
      }
    }
    const seqSrc = 'items:\n  - |\n    Hello\n  - com.example.app\n';
    identityRoundTrip(yamlAdapter, seqSrc);
    const seqOut = translateYamlSource(seqSrc, FAKE);
    const seqParsed = YAML.parse(seqOut) as { items: string[] };
    expect(seqParsed.items[1]).toBe('com.example.app');
    expect(seqParsed.items[0]).toBe(expectedYamlClipBlock('|', FAKE));
  });

  it('block styles | > |- |+ >- and nested', () => {
    const sources = [
      'folded: >\n  line one\n  line two\n',
      'strip: |-\n  only\n',
      'keep: |+\n  tail\n\n',
      'nested:\n  inner: |\n    deep\n  outer: x\n',
    ];
    for (const src of sources) {
      identityRoundTrip(yamlAdapter, src);
      translatedRoundTrip(yamlAdapter, src, (s) => YAML.parse(s));
    }
  });

  it('single-quoted value with newlines in translation uses double quotes', () => {
    const src = "single: 'It''s fine'\n";
    identityRoundTrip(yamlAdapter, src);
    translatedRoundTrip(yamlAdapter, src, (s) => YAML.parse(s), (_b, a) => {
      expect((a as { single: string }).single).toBe(FAKE);
    });
    const out = assembleStructuredTranslated(
      src,
      sessionWithFakeTranslations(
        src,
        new StructuredSegmenter().segment(src, 'yaml', 'a.yaml'),
        [],
        FAKE,
      ),
    );
    expect(out).toMatch(/single: "/);
    expect(YAML.parse(out).single).toBe(FAKE);
  });

  it('fake translation remains parseable', () => {
    translatedRoundTrip(yamlAdapter, 'title: Hello\nlist:\n  - one\n', (s) => YAML.parse(s));
  });
});

describe('structured invariants TOML', () => {
  it('identity: basic escapes and keys not translated', () => {
    identityRoundTrip(tomlAdapter, 'title = "Say \\"hi\\""\n"a" = 1\npath = "a\\\\nb"\n');
  });

  it('multiline basic: leading newline stripped for decode; line continuations', () => {
    const src = 'body = """\nhello \\\nworld"""\n';
    const spans = tomlAdapter.extractSpans(src);
    expect(spans[0]?.decoded).toBe('hello world');
    identityRoundTrip(tomlAdapter, src);
    translatedRoundTrip(tomlAdapter, src, (s) => {
      const m = s.match(/body\s*=\s*"""(.*)"""/s);
      return { body: m?.[1] ?? '' };
    });
  });

  it('literal with newline in translation uses basic string', () => {
    const src = "msg = 'plain'\n";
    const out = assembleStructuredTranslated(
      src,
      sessionWithFakeTranslations(src, new StructuredSegmenter().segment(src, 'toml', 'a.toml'), [], FAKE),
    );
    expect(out).toMatch(/^msg = "/);
    expect(out).toContain('\\n');
  });

  it('basic string encodes control characters', () => {
    const src = 'bell = "Hello"\n';
    const out = assembleStructuredTranslated(
      src,
      sessionWithFakeTranslations(src, new StructuredSegmenter().segment(src, 'toml', 'a.toml'), [], '\u0007'),
    );
    expect(out).toContain('\\u0007');
  });

  it('fake translation parseable', () => {
    translatedRoundTrip(tomlAdapter, 'title = "Hello"\n', (s) => {
      const line = s.trim().split('\n')[0] ?? '';
      const eq = line.indexOf('=');
      const raw = line.slice(eq + 1).trim();
      if (!raw.startsWith('"')) return { title: '' };
      return { title: JSON.parse(raw) as string };
    }, (_b, a) => {
      expect((a as { title: string }).title).toBe(FAKE);
    });
  });
});

describe('structured invariants XML', () => {
  it('identity: entities and plist keys', () => {
    identityRoundTrip(
      xmlAdapter,
      '<?xml version="1.0" encoding="UTF-8"?>\n<plist><key>id</key><string>com.example.app</string><title alt="x">Hello &#169;</title></plist>',
    );
  });

  it('single-quoted attribute apostrophe escaped', () => {
    const src = "<p title='Click to open'>x</p>\n";
    const fake = "C'est ouvert";
    const out = assembleStructuredTranslated(
      src,
      sessionWithFakeTranslations(src, new StructuredSegmenter().segment(src, 'xml', 'a.xml'), [], fake),
    );
    expect(out).toContain("title='C&apos;est ouvert'");
    expect(out).toMatch(/<p title='C&apos;est ouvert'>/);
  });

  it('attribute encodes newline and tab as numeric entities', () => {
    const src = '<x title="Hello"/>';
    const tr = 'a\n\tb';
    const out = assembleStructuredTranslated(
      src,
      sessionWithFakeTranslations(src, new StructuredSegmenter().segment(src, 'xml', 'a.xml'), [], tr),
    );
    expect(out).toContain('&#10;');
    expect(out).toContain('&#9;');
  });

  it('fake translation on title attribute', () => {
    const src = '<root><item title="Hello">com.example.app</item></root>';
    const out = assembleStructuredTranslated(
      src,
      sessionWithFakeTranslations(src, new StructuredSegmenter().segment(src, 'xml', 'a.xml'), [], FAKE),
    );
    expect(out).toContain('&quot;');
    expect(out).toMatch(/title="[^"]*FAKE/);
    expect(out).toContain('>com.example.app<');
  });
});

describe('structured skip rules', () => {
  it('skips reverse-DNS bundle ids in XML plist strings', () => {
    const src = '<string>com.example.app</string>';
    expect(xmlAdapter.extractSpans(src)).toHaveLength(0);
  });
});
