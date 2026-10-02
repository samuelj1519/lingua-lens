/** Values that should not be sent for translation (syntax / identifiers / literals). */
export function shouldSkipStructuredStringValue(value: string): boolean {
  const t = value.trim();
  if (!t) return true;
  if (/^https?:\/\//i.test(t) || /^ftp:\/\//i.test(t)) return true;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return true;
  if (/^mailto:/i.test(t)) return true;
  if (/^[A-Za-z]:\\/.test(t) || t.startsWith('\\\\')) return true;
  if (/^\/[\w./-]+$/.test(t) && t.includes('/')) return true;
  if (/^\.{0,2}\/[\w./-]+$/.test(t)) return true;
  if (/^#[0-9a-f]{3,8}$/i.test(t)) return true;
  if (/^0x[0-9a-f]+$/i.test(t)) return true;
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(t)) return true;
  if (/^\d+\.\d+\.\d+([-.+][\w.-]+)?$/.test(t)) return true;
  if (/^[a-z][a-z0-9]*(\.[a-z0-9][a-z0-9-]*){2,}$/i.test(t)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t)) return true;
  if (/^(true|false|null)$/i.test(t)) return true;
  if (/^[A-Za-z0-9._-]+$/.test(t) && t.length <= 64 && !/\s/.test(t) && !/[\u00c0-\u024f\u4e00-\u9fff]/.test(t)) {
    if (!/[aeiouy]/i.test(t) || /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/i.test(t)) return true;
  }
  return false;
}
