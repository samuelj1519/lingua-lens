const MIN_KNOWN_SECRET_LEN = 8;

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

const AUTH_RE =
  /\b(Authorization|Bearer|Basic)\s+([A-Za-z0-9+/=_~.-]+)/gi;

const CREDENTIAL_KEY_RE =
  /\b(api[_-]?key|access[_-]?token|auth[_-]?token|secret(?:[_-]?key)?|password|passwd|pwd|credentials?|token)\b\s*[:=]\s*(['"]?)([A-Za-z0-9+/=_~.-]{4,})\2/gi;

/** Redact secrets from text shown to users or logs. */
export function redactSecrets(text: string, knownSecrets: readonly string[]): string {
  let out = text;
  out = redactKnownValues(out, knownSecrets);
  out = out.replace(AUTH_RE, (_m, label) => `${label} ***`);
  out = out.replace(CREDENTIAL_KEY_RE, (_m, key) => `${key}=***`);
  out = out.replace(EMAIL_RE, '***@***');
  return out;
}

function redactKnownValues(text: string, knownSecrets: readonly string[]): string {
  let out = text;
  const seen = new Set<string>();
  for (const raw of knownSecrets) {
    const secret = raw.trim();
    if (secret.length < MIN_KNOWN_SECRET_LEN || seen.has(secret)) continue;
    seen.add(secret);
    for (const variant of variantsForKnownSecret(secret)) {
      if (variant.length < MIN_KNOWN_SECRET_LEN) continue;
      out = out.split(variant).join('***');
    }
  }
  return out;
}

function variantsForKnownSecret(secret: string): string[] {
  const variants = new Set<string>([secret]);
  try {
    variants.add(encodeURIComponent(secret));
  } catch {
    /* ignore */
  }
  try {
    variants.add(decodeURIComponent(secret));
  } catch {
    /* ignore */
  }
  return [...variants].filter((v) => v.length >= MIN_KNOWN_SECRET_LEN);
}
