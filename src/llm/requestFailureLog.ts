import type { AppLogger } from '../util/logger';
import type { LlmError } from './errors';
import { llmApiHostname } from './thinkingMode';

export interface LlmUsageSnapshot {
  promptTokens?: number;
  completionTokens?: number;
  reasoningTokens?: number;
}

export interface LlmFailureContext {
  feature: string;
  model: string;
  baseUrl: string;
  httpStatus?: number;
  finishReason?: string;
  usage?: LlmUsageSnapshot;
  error: LlmError;
}

export function parseUsageFromApi(raw: unknown): LlmUsageSnapshot | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const u = raw as Record<string, unknown>;
  const snap: LlmUsageSnapshot = {
    promptTokens: typeof u.prompt_tokens === 'number' ? u.prompt_tokens : undefined,
    completionTokens: typeof u.completion_tokens === 'number' ? u.completion_tokens : undefined,
  };
  const details = u.completion_tokens_details;
  if (details && typeof details === 'object') {
    const rt = (details as { reasoning_tokens?: unknown }).reasoning_tokens;
    if (typeof rt === 'number') snap.reasoningTokens = rt;
  }
  const hasAny =
    snap.promptTokens !== undefined ||
    snap.completionTokens !== undefined ||
    snap.reasoningTokens !== undefined;
  return hasAny ? snap : undefined;
}

export function formatLlmFailureLogLine(ctx: LlmFailureContext): string {
  const host = llmApiHostname(ctx.baseUrl) ?? '(invalid-url)';
  const status = ctx.httpStatus ?? ctx.error.status ?? '-';
  const finish = ctx.finishReason ?? ctx.error.finishReason ?? '-';
  const usage = ctx.usage ?? ctx.error.usage;
  const parts: string[] = [
    `feature=${ctx.feature}`,
    `model=${ctx.model}`,
    `host=${host}`,
    `http=${status}`,
    `finish_reason=${finish}`,
    `error=${ctx.error.kind}`,
  ];
  if (usage?.promptTokens !== undefined) parts.push(`prompt_tokens=${usage.promptTokens}`);
  if (usage?.completionTokens !== undefined) parts.push(`completion_tokens=${usage.completionTokens}`);
  if (usage?.reasoningTokens !== undefined) parts.push(`reasoning_tokens=${usage.reasoningTokens}`);
  return `LLM request failed: ${parts.join(' ')}`;
}

export function logLlmFailure(logger: AppLogger | undefined, ctx: LlmFailureContext): void {
  if (!logger) return;
  logger.error(formatLlmFailureLogLine(ctx));
}
