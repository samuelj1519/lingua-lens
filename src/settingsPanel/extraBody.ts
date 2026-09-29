export const EXTRA_BODY_TEMPLATE_DEEPSEEK = { thinking: { type: 'disabled' } };
export const EXTRA_BODY_TEMPLATE_QWEN = { enable_thinking: false };

export function parseExtraBodyJson(text: string): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  const t = text.trim();
  if (!t) return { ok: true, value: {} };
  try {
    const v = JSON.parse(t) as unknown;
    if (v === null || typeof v !== 'object' || Array.isArray(v)) {
      return { ok: false, error: 'JSON must be an object' };
    }
    return { ok: true, value: v as Record<string, unknown> };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid JSON' };
  }
}
