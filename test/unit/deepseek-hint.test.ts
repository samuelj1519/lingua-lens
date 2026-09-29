import { describe, expect, it } from 'vitest';
import { shouldOfferDeepSeekThinkingHint } from '../../src/llm/thinkingMode';
import type { TranslateConfig } from '../../src/config/types';

describe('deepSeek hint', () => {
  it('offers hint only for DeepSeek without thinking key in extraBody', () => {
    const base = {
      llm: { baseUrl: 'https://api.deepseek.com/v1', extraBody: {} },
    } as TranslateConfig;
    expect(shouldOfferDeepSeekThinkingHint(base)).toBe(true);
    base.llm.extraBody = { thinking: { type: 'disabled' } };
    expect(shouldOfferDeepSeekThinkingHint(base)).toBe(false);
    base.llm.baseUrl = 'https://api.openai.com/v1';
    base.llm.extraBody = {};
    expect(shouldOfferDeepSeekThinkingHint(base)).toBe(false);
  });
});
