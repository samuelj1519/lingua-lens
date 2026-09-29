import { appendStreamDelta } from './sseContent';
import type { LlmUsageSnapshot } from './requestFailureLog';
import { parseUsageFromApi } from './requestFailureLog';

export interface SseCompletionAggregate {
  content: string;
  reasoningContent: string;
  finishReason?: string;
  usage?: LlmUsageSnapshot;
}

export function appendReasoningDelta(reasoning: string, delta: Record<string, unknown> | undefined): string {
  if (!delta) return reasoning;
  const chunk = delta.reasoning_content;
  if (typeof chunk === 'string' && chunk.length > 0) return reasoning + chunk;
  return reasoning;
}

export function applySseChunk(agg: SseCompletionAggregate, json: Record<string, unknown>): SseCompletionAggregate {
  const choices = json.choices as
    | { delta?: Record<string, unknown>; finish_reason?: string | null }[]
    | undefined;
  const choice = choices?.[0];
  const delta = choice?.delta;
  const next: SseCompletionAggregate = {
    content: appendStreamDelta(agg.content, delta),
    reasoningContent: appendReasoningDelta(agg.reasoningContent, delta),
    finishReason: agg.finishReason,
    usage: agg.usage,
  };
  if (choice?.finish_reason) next.finishReason = choice.finish_reason;
  const usage = parseUsageFromApi(json.usage);
  if (usage) next.usage = usage;
  return next;
}
