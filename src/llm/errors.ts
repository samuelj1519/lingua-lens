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
      | 'cancelled',
    message: string,
    public readonly status?: number,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}
