import { describe, expect, it } from 'vitest';
import { jsonAdapter } from '../../src/document/structured/jsonAdapter';
import { StructuredSegmenter } from '../../src/document/structured/StructuredSegmenter';
import { assembleStructuredTranslated } from '../../src/document/structured/applyReplacements';
import type { DocSession } from '../../src/document/DocTranslationService';
import type { Segment } from '../../src/types';
import { encodeStructuredReplacement } from '../../src/document/structured/escape';

function sessionWithSegments(
  source: string,
  segments: Segment[],
  results: Map<string, { status: 'done'; text: string }>,
): DocSession {
  return {
    sourceUri: { toString: () => 'file:///x.json' } as unknown as import('vscode').Uri,
    previewUri: { toString: () => 'lingualens:/x' } as unknown as import('vscode').Uri,
    target: 'zh-CN',
    sourceVersion: 1,
    sourceLabel: 'x.json',
    segments,
    plans: new Map(),
    results,
    cts: { cancel: () => {}, token: { isCancellationRequested: false } } as unknown as import('vscode').CancellationTokenSource,
    doneCount: 0,
    totalTranslatable: 1,
    sourceText: source,
    renderMode: 'structured',
  };
}

describe('structured JSON', () => {
  it('round-trips without translation (byte-identical)', () => {
    const src = '{\n  "title": "Hello",\n  "count": 3,\n  "url": "https://x.com"\n}\n';
    const segments = new StructuredSegmenter().segment(src, 'json', 'a.json');
    const out = assembleStructuredTranslated(src, sessionWithSegments(src, segments, new Map()));
    expect(out).toBe(src);
  });

  it('does not target object keys named msg', () => {
    const src = '{"msg":"value","title":"Hello"}';
    expect(jsonAdapter.extractSpans(src).map((s) => s.decoded)).toEqual(['value', 'Hello']);
  });
});

describe('escape helpers', () => {
  it('json-escapes quotes', () => {
    expect(encodeStructuredReplacement('json', 'a"b', 'x', '')).toBe('a\\"b');
  });
});
