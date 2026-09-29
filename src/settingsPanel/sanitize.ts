/** Redact secrets from connection error messages shown in the webview. */
export function sanitizeConnectionError(message: string): string {
  let m = message;
  m = m.replace(/sk-[a-zA-Z0-9_-]{8,}/gi, 'sk-***');
  m = m.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer ***');
  m = m.replace(/api[_-]?key[=:]\s*['"]?[A-Za-z0-9._-]{8,}/gi, 'api_key=***');
  m = m.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '***@***');
  return m;
}
