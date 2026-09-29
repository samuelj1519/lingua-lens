/** ALLOW_CJK_FIXTURE: intentional Chinese samples for detection, documents, or l10n assertions. */
import { describe, expect, it } from 'vitest';
import { assembleDocument, assembleTranslatedOnly } from '../../src/document/DocumentAssembler';
import { MarkdownSegmenter } from '../../src/document/MarkdownSegmenter';
import type { DocSession } from '../../src/document/DocTranslationService';

const FIXTURE = `# Deepening

## Dependency categories

- **module**: a unit of code
- **interface**: a contract

> *"Define a port at the boundary."*

\`\`\`ts
const x = 1;
\`\`\`

Plain paragraph with **bold** and *italic*.
`;

function mockSession(source: string, translations: Record<string, string>): DocSession {
  const seg = new MarkdownSegmenter();
  const segments = seg.segment(source);
  const results = new Map<string, { status: 'done' | 'pending' | 'failed'; text?: string }>();
  for (const s of segments) {
    if (s.kind === 'preserved') continue;
    results.set(s.id, { status: 'done', text: translations[s.id] ?? s.sourceText });
  }
  const plans = new Map(
    segments.filter((s) => s.kind !== 'preserved').map((s) => [s.id, { mode: 'batch' as const }]),
  );
  return {
    sourceUri: { toString: () => 'file:///t.md' } as never,
    previewUri: { toString: () => 'aitranslate:/t' } as never,
    target: 'zh-CN',
    sourceVersion: 1,
    sourceLabel: 't.md',
    segments,
    plans,
    results,
    cts: { cancel: () => {}, token: { isCancellationRequested: false } } as never,
    doneCount: results.size,
    totalTranslatable: results.size,
    sourceText: source,
  };
}

describe('document assembler fidelity', () => {
  it('interleaves blocks without splicing English tails', () => {
    const segments = new MarkdownSegmenter().segment(FIXTURE);
    const translations: Record<string, string> = {};
    for (const s of segments) {
      if (s.kind !== 'preserved') translations[s.id] = `[译]${s.sourceText.slice(0, 12)}`;
    }
    const session = mockSession(FIXTURE, translations);
    const out = assembleDocument(FIXTURE, session, 'interleaved');
    expect(out).toContain('```ts\nconst x = 1;\n```');
    expect(out).not.toMatch(/##\s*[\u4e00-\u9fff]+[a-zA-Z]{3,}/);
    expect(out).toContain('**module**');
    expect(out).toContain('[译]');
  });

  it('preserves heading markers in translated-only output', () => {
    const source = '## Install\n\nRun npm.';
    const segments = new MarkdownSegmenter().segment(source);
    const translations: Record<string, string> = {};
    const heading = segments.find((s) => s.kind === 'heading');
    const para = segments.find((s) => s.kind === 'paragraph');
    if (heading) translations[heading.id] = '安装';
    if (para) translations[para.id] = '运行 npm。';
    const session = mockSession(source, translations);
    const out = assembleTranslatedOnly(source, session);
    expect(out).toMatch(/^## 安装/m);
    expect(out).toContain('运行 npm。');
    expect(out).not.toContain('Install');
  });

  it('keeps bold in segment source for paragraphs', () => {
    const segments = new MarkdownSegmenter().segment('Text with **module** here.');
    const para = segments.find((s) => s.kind === 'paragraph');
    expect(para?.sourceText).toContain('**module**');
  });
});
