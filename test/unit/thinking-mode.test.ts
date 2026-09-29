import { describe, expect, it } from 'vitest';
import { hasThinkingExtraBodyKey, isDeepSeekApiHost, isThinkingExplicitlyDisabled } from '../../src/llm/thinkingMode';

describe('thinkingMode', () => {
  it('detects explicit thinking disable presets', () => {
    expect(isThinkingExplicitlyDisabled({ thinking: { type: 'disabled' } })).toBe(true);
    expect(isThinkingExplicitlyDisabled({ enable_thinking: false })).toBe(true);
    expect(isThinkingExplicitlyDisabled({})).toBe(false);
  });

  it('detects DeepSeek host and thinking key presence', () => {
    expect(isDeepSeekApiHost('https://api.deepseek.com/v1')).toBe(true);
    expect(hasThinkingExtraBodyKey({ thinking: { type: 'enabled' } })).toBe(true);
    expect(hasThinkingExtraBodyKey({})).toBe(false);
  });

});
