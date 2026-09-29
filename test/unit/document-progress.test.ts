import { describe, expect, it } from 'vitest';
import {
  countCompletedTranslatableSegments,
  DOCUMENT_PROGRESS_TEMPLATE_EN,
  formatDocumentProgressMessage,
  segmentProgressIncrement,
} from '../../src/document/documentProgress';
import type { DocSession } from '../../src/document/DocTranslationService';

function miniSession(
  total: number,
  results: Record<string, 'pending' | 'done' | 'skipped' | 'failed'>,
): DocSession {
  const segments = Object.keys(results).map((id, i) => ({
    id,
    kind: 'paragraph' as const,
    range: { start: i * 10, end: i * 10 + 5 },
    sourceText: 'text',
    placeholders: [],
    hash: 'h',
    linePrefix: '',
  }));
  const plans = new Map(Object.keys(results).map((id) => [id, { mode: 'batch' as const }]));
  const resultMap = new Map(
    Object.entries(results).map(([id, status]) => [id, { status }]),
  );
  return {
    sourceUri: { toString: () => 'file:///a.md' } as never,
    previewUri: { toString: () => 'aitranslate:/a' } as never,
    target: 'zh-CN',
    sourceVersion: 1,
    sourceLabel: 'README.md',
    segments,
    plans,
    results: resultMap,
    cts: { cancel: () => {}, token: { isCancellationRequested: false } } as never,
    doneCount: 0,
    totalTranslatable: total,
    sourceText: 'x',
  };
}

describe('document progress', () => {
  it('formats progress messages with file name only', () => {
    expect(formatDocumentProgressMessage('README.md', 12, 18, DOCUMENT_PROGRESS_TEMPLATE_EN)).toBe(
      'Translating README.md: 12/18 segments',
    );
    // Intentional zh-CN template (mirrors l10n bundle) for placeholder substitution.
    const zhTemplate = '\u6b63\u5728\u7ffb\u8bd1 {0}\uff1a{1}/{2} \u6bb5';
    expect(formatDocumentProgressMessage('README.md', 12, 18, zhTemplate)).toBe(
      '\u6b63\u5728\u7ffb\u8bd1 README.md\uff1a12/18 \u6bb5',
    );
  });

  it('counts completed translatable segments excluding pending', () => {
    const session = miniSession(3, { s0: 'done', s1: 'pending', s2: 'skipped' });
    expect(countCompletedTranslatableSegments(session)).toBe(2);
  });

  it('computes incremental progress bar steps by segment ratio', () => {
    let prev = 0;
    let sum = 0;
    for (let c = 1; c <= 4; c++) {
      const inc = segmentProgressIncrement(c, 4, prev);
      sum += inc;
      prev += inc;
    }
    expect(Math.round(sum)).toBe(100);
  });
});
