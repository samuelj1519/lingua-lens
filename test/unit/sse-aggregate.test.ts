import { describe, expect, it } from 'vitest';
import { applySseChunk } from '../../src/llm/sseAggregate';

describe('applySseChunk', () => {
  it('accumulates content and reasoning deltas and finish_reason', () => {
    let agg = { content: '', reasoningContent: '' };
    agg = applySseChunk(agg, {
      choices: [{ delta: { content: 'hi', reasoning_content: 'think' } }],
    });
    expect(agg.content).toBe('hi');
    expect(agg.reasoningContent).toBe('think');
    agg = applySseChunk(agg, {
      choices: [{ delta: {}, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 2 },
    });
    expect(agg.finishReason).toBe('stop');
    expect(agg.usage?.promptTokens).toBe(1);
  });
});
