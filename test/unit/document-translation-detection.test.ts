/** ALLOW_CJK_FIXTURE: intentional Chinese samples for detection, documents, or l10n assertions. */
import { describe, expect, it } from 'vitest';
import { assembleDocument } from '../../src/document/DocumentAssembler';
import { MarkdownSegmenter } from '../../src/document/MarkdownSegmenter';
import type { DocSession } from '../../src/document/DocTranslationService';
import {
  buildDocumentTranslationPlan,
  DOCUMENT_ALREADY_TARGET_MESSAGE_KEY,
} from '../../src/document/documentTranslationPlan';
import { shouldTranslateDocumentText } from '../../src/document/documentSegmentDetection';
import { defaultMarkdownSegmentConfig } from '../../src/document/markdownSegmentConfig';
import type { TranslateConfig } from '../../src/config/types';

function baseCfg(overrides?: Partial<TranslateConfig['document']>): TranslateConfig {
  const d = defaultMarkdownSegmentConfig();
  return {
    ...d,
    enabled: true,
    hover: {} as TranslateConfig['hover'],
    llm: {} as TranslateConfig['llm'],
    document: {
      batchSize: 8,
      maxBatchChars: 4000,
      sideFileNamePattern: 'x',
      sideFileContent: 'translated',
      autoRefresh: false,
      previewStyle: 'interleaved',
      codeLens: true,
      forceTranslate: false,
      ...overrides,
    },
    cache: {} as TranslateConfig['cache'],
    glossary: {} as TranslateConfig['glossary'],
    selection: {} as TranslateConfig['selection'],
    parser: {} as TranslateConfig['parser'],
    statusBar: {} as TranslateConfig['statusBar'],
    log: {} as TranslateConfig['log'],
  } as TranslateConfig;
}

const zhReadme = `# LinguaLens (lingua-lens)

在 Cursor / VS Code 中使用 OpenAI 兼容 LLM 翻译项目中的注释、字符串和文档。

## 功能

- **悬停翻译**：代码、配置与文档；\`aiTranslate.log.level\` 可设为 debug
- **选区翻译**：快捷键翻译选中内容
`;

const mixedList = `- **悬停翻译**：代码与 \`tree-sitter\` 注释
- **English item**: only this line needs translation
`;

describe('document translation detection', () => {
  const cfg = baseCfg();
  const segmentCfg = defaultMarkdownSegmentConfig();

  it('skips pure Simplified Chinese paragraphs', () => {
    const text = '在 Cursor / VS Code 中使用 OpenAI 兼容 LLM 翻译项目中的注释。';
    expect(shouldTranslateDocumentText(text, cfg, 'paragraph')).toBe(false);
  });

  it('skips Chinese mixed with inline code and config keys', () => {
    const text = '**悬停翻译**：代码、配置与文档；`aiTranslate.log.level` 可设为 debug';
    expect(shouldTranslateDocumentText(text, cfg, 'paragraph')).toBe(false);
  });

  it('still translates English paragraphs', () => {
    expect(shouldTranslateDocumentText('Plain English paragraph for testing.', cfg, 'paragraph')).toBe(
      true,
    );
  });

  it('plans zero translatable segments for all-Chinese body', () => {
    const zhOnly = `## 功能\n\n在 Cursor / VS Code 中使用 LLM 翻译注释与文档。\n`;
    const segs = new MarkdownSegmenter().segment(zhOnly, segmentCfg);
    const { translatableCount } = buildDocumentTranslationPlan(segs, zhOnly, cfg);
    expect(translatableCount).toBe(0);
  });

  it('treats Traditional Chinese as target-family skip for zh-CN', () => {
    const trad = '這是繁體中文說明文字，用於測試語言檢測。';
    expect(shouldTranslateDocumentText(trad, cfg, 'paragraph')).toBe(false);
  });

  it('exposes user message when document already target language', () => {
    expect(DOCUMENT_ALREADY_TARGET_MESSAGE_KEY).toBe('doc.alreadyTarget');
  });

  it('interleaved preview does not duplicate skipped Chinese body', () => {
    const segs = new MarkdownSegmenter().segment(zhReadme, segmentCfg);
    const { plans } = buildDocumentTranslationPlan(segs, zhReadme, cfg);
    const results = new Map<string, { status: 'skipped' | 'done'; text?: string }>();
    for (const s of segs) {
      if (s.kind === 'preserved') continue;
      results.set(s.id, { status: plans.get(s.id)?.mode === 'skip' ? 'skipped' : 'done' });
    }
    const session: DocSession = {
      sourceUri: { toString: () => 'file:///README.md' } as never,
      previewUri: { toString: () => 'aitranslate:/r' } as never,
      target: 'zh-CN',
      sourceVersion: 1,
      sourceLabel: 'README.md',
      segments: segs,
      plans,
      results,
      cts: { cancel: () => {}, token: { isCancellationRequested: false } } as never,
      doneCount: 0,
      totalTranslatable: 0,
      sourceText: zhReadme,
    };
    const out = assembleDocument(zhReadme, session, 'interleaved');
    const body = out.split('\n\n').slice(1).join('\n\n');
    expect(body).not.toMatch(/在 Cursor[\s\S]*在 Cursor/);
  });

  it('plans partial list when only one line is English', () => {
    const segs = new MarkdownSegmenter().segment(mixedList, segmentCfg);
    const list = segs.find((s) => s.kind === 'list');
    expect(list).toBeTruthy();
    const { plans, translatableCount } = buildDocumentTranslationPlan(segs, mixedList, cfg);
    expect(translatableCount).toBe(1);
    const plan = plans.get(list!.id);
    expect(plan?.mode === 'list-lines' || plan?.mode === 'batch').toBe(true);
  });

  it('forceTranslate plans all segments', () => {
    const forceCfg = baseCfg({ forceTranslate: true });
    const segs = new MarkdownSegmenter().segment(zhReadme, segmentCfg);
    const { translatableCount } = buildDocumentTranslationPlan(segs, zhReadme, forceCfg);
    expect(translatableCount).toBeGreaterThan(0);
  });
});
