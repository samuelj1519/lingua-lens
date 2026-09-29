import { describe, expect, it } from 'vitest';
import { assertNonEmptyTranslation } from '../../src/llm/outputBudget';
import { LlmError } from '../../src/llm/errors';

describe('assertNonEmptyTranslation', () => {
  it('passes for non-empty content', () => {
    expect(() => assertNonEmptyTranslation({ content: 'ok' })).not.toThrow();
  });

  it('throws reasoningBudget for reasoning-only output', () => {
    expect(() =>
      assertNonEmptyTranslation({ content: '', reasoningContent: 'thoughts', finishReason: 'stop' }),
    ).toThrow(LlmError);
    try {
      assertNonEmptyTranslation({ content: '', reasoningContent: 'thoughts' });
    } catch (e) {
      expect((e as LlmError).kind).toBe('reasoningBudget');
    }
  });

  it('throws reasoningBudget when finish_reason is length', () => {
    try {
      assertNonEmptyTranslation({ content: '', finishReason: 'length' });
    } catch (e) {
      expect((e as LlmError).kind).toBe('reasoningBudget');
    }
  });
});
