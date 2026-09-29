/** Split config identifiers into words for translation (max_retry_count, maxRetryCount, max-retry-count). */
export function splitConfigIdentifier(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const parts: string[] = [];
  let buf = '';
  const flush = () => {
    if (buf) {
      parts.push(buf);
      buf = '';
    }
  };
  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (c === '_' || c === '-' || c === '.') {
      flush();
      continue;
    }
    const next = trimmed[i + 1];
    const prev = trimmed[i - 1];
    if (
      c >= 'A' &&
      c <= 'Z' &&
      prev &&
      prev >= 'a' &&
      prev <= 'z' &&
      (!next || (next >= 'a' && next <= 'z'))
    ) {
      flush();
    }
    buf += c;
  }
  flush();
  return parts.map((p) => p.toLowerCase()).join(' ').trim();
}

export function stripConfigKeyQuotes(raw: string): string {
  const t = raw.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}
