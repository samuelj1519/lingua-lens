import type { LlmUsageSnapshot } from './requestFailureLog';

export class LlmError extends Error {
  constructor(
    public readonly kind:
      | 'noKey'
      | 'noModel'
      | 'auth'
      | 'notFound'
      | 'badRequest'
      | 'contextLength'
      | 'rateLimit'
      | 'server'
      | 'timeout'
      | 'network'
      | 'invalidResponse'
      | 'reasoningBudget'
      | 'cancelled',
    message: string,
    public readonly status?: number,
    public readonly retryAfterMs?: number,
    public readonly meta?: { finishReason?: string; usage?: LlmUsageSnapshot },
  ) {
    super(message);
    this.name = 'LlmError';
  }

  get finishReason(): string | undefined {
    return this.meta?.finishReason;
  }

  get usage(): LlmUsageSnapshot | undefined {
    return this.meta?.usage;
  }
}
