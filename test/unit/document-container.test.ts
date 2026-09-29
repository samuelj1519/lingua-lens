/** ALLOW_CJK_FIXTURE: intentional Chinese samples for detection, documents, or l10n assertions. */
import { describe, expect, it } from 'vitest';
import { MarkdownSegmenter } from '../../src/document/MarkdownSegmenter';
import { assembleDocument, assembleTranslatedOnly } from '../../src/document/DocumentAssembler';
import { validateContainerTranslation } from '../../src/document/containerStructure';
import { reassembleListFromLineTranslations } from '../../src/document/listFallback';
import type { DocSession } from '../../src/document/DocTranslationService';

function mockSession(source: string, translations: Record<string, string>): DocSession {
  const segments = new MarkdownSegmenter().segment(source);
  const results = new Map<string, { status: 'done' | 'pending' | 'failed'; text?: string; error?: string }>();
  for (const s of segments) {
    if (s.kind === 'preserved') continue;
    results.set(s.id, { status: 'done', text: translations[s.id] ?? s.sourceText });
  }
  const plans = new Map(
    segments.filter((s) => s.kind !== 'preserved').map((s) => [s.id, { mode: 'batch' as const }]),
  );
  return {
    sourceUri: { toString: () => 'file:///t.md' } as never,
    previewUri: { toString: () => 'lingualens:/t' } as never,
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

function stripPreviewHeader(out: string): string {
  const nl = out.indexOf('\n\n');
  return nl >= 0 ? out.slice(nl + 2) : out;
}

describe('container block segmentation', () => {
  it('segments tight list as one unit', () => {
    const src = '## T\n\n- a\n- b\n- c\n- d\n';
    const segs = new MarkdownSegmenter().segment(src);
    const lists = segs.filter((s) => s.kind === 'list');
    expect(lists).toHaveLength(1);
    expect(lists[0].listFallbackItems).toHaveLength(4);
  });

  it('segments nested list as one unit', () => {
    const src = '- outer\n  - inner\n  - inner2\n';
    const lists = new MarkdownSegmenter().segment(src).filter((s) => s.kind === 'list');
    expect(lists).toHaveLength(1);
    expect(lists[0].listFallbackItems?.length).toBe(3);
  });
});

describe('interleaved whitespace fidelity', () => {
  const linkList = `## Docs

- [**Codex Documentation**](https://example.com/codex)
- [**Contributing**](https://example.com/c)
- [**Installing**](https://example.com/i)
- [**Open source**](https://example.com/o)

This repository is licensed.
`;

  it('interleaves link list as one block without per-item gaps', () => {
    const segs = new MarkdownSegmenter().segment(linkList);
    const listSeg = segs.find((s) => s.kind === 'list')!;
    const trList = `- [**Codex 文档**](https://example.com/codex)
- [**贡献指南**](https://example.com/c)
- [**安装构建**](https://example.com/i)
- [**开源基金**](https://example.com/o)`;
    const translations: Record<string, string> = { [listSeg.id]: trList };
    for (const s of segs) {
      if (s.kind === 'heading') translations[s.id] = '文档';
      if (s.kind === 'paragraph' && s.id !== listSeg.id) translations[s.id] = '本仓库已许可。';
    }
    const out = stripPreviewHeader(assembleDocument(linkList, mockSession(linkList, translations), 'interleaved'));
    const expected = `## Docs

## 文档

- [**Codex Documentation**](https://example.com/codex)
- [**Contributing**](https://example.com/c)
- [**Installing**](https://example.com/i)
- [**Open source**](https://example.com/o)

- [**Codex 文档**](https://example.com/codex)
- [**贡献指南**](https://example.com/c)
- [**安装构建**](https://example.com/i)
- [**开源基金**](https://example.com/o)

This repository is licensed.

本仓库已许可。
`;
    expect(out).toBe(expected);
  });

  it('interleaves tight bullet list without extra blank lines between items', () => {
    const src = `## Testing strategy

- first item
- second item
- third
- fourth
`;
    const segs = new MarkdownSegmenter().segment(src);
    const list = segs.find((s) => s.kind === 'list')!;
    const tr = `- 第一项
- 第二项
- 第三项
- 第四项`;
    const translations: Record<string, string> = {
      [list.id]: tr,
      [segs.find((s) => s.kind === 'heading')!.id]: '测试策略',
    };
    const out = stripPreviewHeader(assembleDocument(src, mockSession(src, translations), 'interleaved'));
    expect(out).toBe(`## Testing strategy

## 测试策略

- first item
- second item
- third
- fourth

- 第一项
- 第二项
- 第三项
- 第四项
`);
  });
});

describe('structure validation and list fallback', () => {
  it('rejects list translation with wrong item count', () => {
    const src = '- a\n- b\n- c\n';
    expect(validateContainerTranslation(src, '- x\n- y\n', 'list')).toBe(false);
  });

  it('reassembles per-line fallback preserving markers', () => {
    const original = '- **module**: one\n- **iface**: two\n';
    const items = [
      { id: 's0.li0', lineIndex: 0, prefix: '- ', text: '**module**: one', placeholders: [] },
      { id: 's0.li1', lineIndex: 1, prefix: '- ', text: '**iface**: two', placeholders: [] },
    ];
    const map = new Map([
      ['s0.li0', '**模块**：一'],
      ['s0.li1', '**接口**：二'],
    ]);
    const merged = reassembleListFromLineTranslations(original, items, map);
    expect(merged).toBe('- **模块**：一\n- **接口**：二\n');
    expect(validateContainerTranslation(original, merged, 'list')).toBe(true);
  });
});

describe('blockquote and table containers', () => {
  it('interleaves blockquote as one block', () => {
    const src = '> Quote line one\n> line two\n\nPara.\n';
    const segs = new MarkdownSegmenter().segment(src);
    const bq = segs.find((s) => s.kind === 'blockquote')!;
    const translations: Record<string, string> = {
      [bq.id]: '> 引用一\n> 引用二',
      [segs.find((s) => s.kind === 'paragraph')!.id]: '段落。',
    };
    const out = stripPreviewHeader(assembleDocument(src, mockSession(src, translations), 'interleaved'));
    expect(out).toBe(`> Quote line one
> line two

> 引用一
> 引用二

Para.

段落。
`);
  });

  it('translated-only replaces whole table block', () => {
    const src = '| H | V |\n| --- | --- |\n| a | b |\n';
    const segs = new MarkdownSegmenter().segment(src);
    const t = segs.find((s) => s.kind === 'table')!;
    const tr = '| 头 | 值 |\n| --- | --- |\n| 甲 | 乙 |\n';
    const out = assembleTranslatedOnly(src, mockSession(src, { [t.id]: tr }));
    expect(out).toBe(tr);
  });
});
