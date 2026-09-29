export function backoffDelay(attempt: number): number {
  const base = Math.min(30_000, 500 * 2 ** attempt);
  const jitter = 0.8 + Math.random() * 0.4;
  return Math.floor(base * jitter);
}

export function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const sec = Number(header);
  if (!Number.isNaN(sec)) return Math.min(60_000, sec * 1000);
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.min(60_000, Math.max(0, date - Date.now()));
  return undefined;
}
