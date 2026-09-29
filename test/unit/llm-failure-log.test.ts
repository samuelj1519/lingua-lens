import { describe, expect, it } from 'vitest';
import { formatLlmFailureLogLine } from '../../src/llm/requestFailureLog';
import { LlmError } from '../../src/llm/errors';

describe('formatLlmFailureLogLine', () => {
  it('includes feature, host, status, finish_reason, tokens, and error kind without secrets', () => {
    const line = formatLlmFailureLogLine({
      feature: 'hover',
      model: 'deepseek-chat',
      baseUrl: 'https://api.deepseek.com/v1',
      httpStatus: 200,
      finishReason: 'length',
      usage: { promptTokens: 12, completionTokens: 0, reasoningTokens: 40 },
      error: new LlmError('reasoningBudget', 'x', 200, undefined, {
        finishReason: 'length',
        usage: { promptTokens: 12, completionTokens: 0, reasoningTokens: 40 },
      }),
    });
    expect(line).toContain('feature=hover');
    expect(line).toContain('host=api.deepseek.com');
    expect(line).toContain('finish_reason=length');
    expect(line).toContain('reasoning_tokens=40');
    expect(line).not.toMatch(/Bearer|sk-/i);
  });
});
