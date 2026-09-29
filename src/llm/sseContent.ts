export function appendStreamDelta(content: string, delta: Record<string, unknown> | undefined): string {
  if (!delta) return content;
  if (typeof delta.content === 'string' && delta.content.length > 0) {
    return content + delta.content;
  }
  if (typeof delta.text === 'string' && delta.text.length > 0) {
    return content + delta.text;
  }
  return content;
}

export function parseSseDataLine(line: string): Record<string, unknown> | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) return null;
  const data = trimmed.slice(5).trim();
  if (data === '[DONE]') return null;
  try {
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return null;
  }
}
