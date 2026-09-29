import type { TranslateConfig } from '../config/types';
import { DEFAULT_FRONTMATTER_FIELDS } from './frontmatterParse';

/** Defaults when segmenting without workspace config (tests, hover). */
export function defaultMarkdownSegmentConfig(): Pick<
  TranslateConfig,
  'targetLanguage' | 'detection' | 'privacy' | 'markdown'
> {
  return {
    targetLanguage: 'zh-CN',
    detection: {
      minLength: 4,
      targetRatio: 0.55,
      reliableMinLength: 20,
      strictChineseVariant: true,
      skipPatterns: [],
    },
    privacy: {
      exclude: [],
      allowedSchemes: ['file'],
    },
    markdown: {
      frontmatterFields: [...DEFAULT_FRONTMATTER_FIELDS],
    },
  };
}
