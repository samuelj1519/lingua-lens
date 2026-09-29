import { isCacheableTranslation } from '../translation/cacheable';
import { LlmError } from './errors';
import type { LlmUsageSnapshot } from './requestFailureLog';

export interface CompletionOutcome {
  content: string;
  reasoningContent?: string;
  finishReason?: string;
  usage?: LlmUsageSnapshot;
}

export function assertNonEmptyTranslation(outcome: CompletionOutcome): void {
  if (isCacheableTranslation(outcome.content)) return;

  const reasoning = (outcome.reasoningContent ?? '').trim();
  const hitLength = outcome.finishReason === 'length';
  if (reasoning.length > 0 || hitLength) {
    throw new LlmError('reasoningBudget', 'Completion budget exhausted (reasoning or length)', undefined, undefined, {
      finishReason: outcome.finishReason,
      usage: outcome.usage,
    });
  }
  throw new LlmError('invalidResponse', 'Model returned an empty translation', undefined, undefined, {
    finishReason: outcome.finishReason,
    usage: outcome.usage,
  });
}
