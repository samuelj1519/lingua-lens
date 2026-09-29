export function containsSecret(text: string): boolean {
  const patterns = [
    /\bsk-[a-zA-Z0-9]{20,}\b/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bghp_[a-zA-Z0-9]{20,}\b/,
    /\bxox[baprs]-[a-zA-Z0-9-]+\b/,
    /-----BEGIN [A-Z ]+PRIVATE KEY-----/,
    /\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/,
  ];
  if (patterns.some((p) => p.test(text))) return true;
  if (text.length >= 32 && !/\s/.test(text) && shannonEntropy(text) > 4.0) return true;
  return false;
}

function shannonEntropy(s: string): number {
  const freq = new Map<string, number>();
  for (const c of s) freq.set(c, (freq.get(c) ?? 0) + 1);
  let h = 0;
  for (const n of freq.values()) {
    const p = n / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}
