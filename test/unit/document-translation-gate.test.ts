/** ALLOW_CJK_FIXTURE: intentional Chinese samples for detection, documents, or l10n assertions. */
import { describe, expect, it } from 'vitest';
import { MarkdownSegmenter } from '../../src/document/MarkdownSegmenter';
import { buildDocumentTranslationPlan } from '../../src/document/documentTranslationPlan';
import { isDocumentAlreadyInTargetLanguage } from '../../src/document/documentTranslationGate';
import { defaultMarkdownSegmentConfig } from '../../src/document/markdownSegmentConfig';
import type { TranslateConfig } from '../../src/config/types';

function baseCfg(overrides?: Partial<TranslateConfig['document']>): TranslateConfig {
  const d = defaultMarkdownSegmentConfig();
  return {
    ...d,
    enabled: true,
    targetLanguage: 'zh-CN',
    detection: {
      minLength: 3,
      targetRatio: 0.6,
      reliableMinLength: 20,
      strictChineseVariant: false,
      skipPatterns: [],
    },
    privacy: { exclude: [], allowedSchemes: ['file'] },
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
  } as TranslateConfig;
}

const zhReadme = `# LinguaLens (lingua-lens)

在 Cursor / VS Code 中使用 OpenAI 兼容 LLM 翻译项目中的注释、字符串和文档。

## 功能

- **悬停翻译**：代码、配置与文档；\`linguaLens.log.level\` 可设为 debug
`;

describe('isDocumentAlreadyInTargetLanguage', () => {
  it('is true when no translatable segments and forceTranslate is false', () => {
    expect(isDocumentAlreadyInTargetLanguage(0, false)).toBe(true);
  });

  it('is false when forceTranslate is true even with zero count', () => {
    expect(isDocumentAlreadyInTargetLanguage(0, true)).toBe(false);
  });

  it('is false when there is work to do', () => {
    expect(isDocumentAlreadyInTargetLanguage(2, false)).toBe(false);
  });
});

describe('whole-document gate with real Chinese README sample', () => {
  const cfg = baseCfg();
  const segmentCfg = defaultMarkdownSegmentConfig();

  it('treats typical zh-CN README body as already target (except optional English title)', () => {
    const bodyOnly = zhReadme.split('\n').slice(2).join('\n');
    const segs = new MarkdownSegmenter().segment(bodyOnly, segmentCfg);
    const { translatableCount } = buildDocumentTranslationPlan(segs, bodyOnly, cfg);
    expect(translatableCount).toBe(0);
    expect(isDocumentAlreadyInTargetLanguage(translatableCount, cfg.document.forceTranslate)).toBe(true);
  });
});
