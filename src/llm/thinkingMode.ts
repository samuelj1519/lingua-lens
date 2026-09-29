/** Whether `extraBody` explicitly disables provider "thinking" / reasoning output. */
export function isThinkingExplicitlyDisabled(extraBody: Record<string, unknown> | undefined): boolean {
  if (!extraBody) return false;
  const thinking = extraBody.thinking;
  if (thinking && typeof thinking === 'object' && !Array.isArray(thinking)) {
    const type = (thinking as { type?: unknown }).type;
    if (type === 'disabled') return true;
  }
  if (extraBody.enable_thinking === false) return true;
  return false;
}

/** `extraBody` includes a `thinking` key (any value). Used for DeepSeek hint gating. */
export function hasThinkingExtraBodyKey(extraBody: Record<string, unknown> | undefined): boolean {
  return !!extraBody && Object.prototype.hasOwnProperty.call(extraBody, 'thinking');
}

export function llmApiHostname(baseUrl: string): string | undefined {
  try {
    return new URL(baseUrl).hostname;
  } catch {
    return undefined;
  }
}

export function isDeepSeekApiHost(baseUrl: string): boolean {
  return llmApiHostname(baseUrl) === 'api.deepseek.com';
}

export function shouldOfferDeepSeekThinkingHint(cfg: {
  llm: { baseUrl: string; extraBody?: Record<string, unknown> };
}): boolean {
  if (!isDeepSeekApiHost(cfg.llm.baseUrl)) return false;
  return !hasThinkingExtraBodyKey(cfg.llm.extraBody);
}
