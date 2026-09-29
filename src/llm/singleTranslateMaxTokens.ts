import type { TranslateConfig } from '../config/types';
import { isThinkingExplicitlyDisabled } from './thinkingMode';

/** Minimum completion budget for single-string interactive translate when thinking may still be on. */
export const SINGLE_TRANSLATE_MIN_COMPLETION_TOKENS = 1024;

export function estimateSourceTokens(text: string): number {
  let n = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    n += cp > 0x2e80 ? 1 : 0.25;
  }
  return Math.ceil(n);
}

/**
 * Caps completion tokens for one hover/selection translate.
 * Uses min(maxTokens, estimate*2.5+64) but never below 1024 when thinking is not explicitly disabled.
 */
export function singleTranslateMaxTokens(cfg: TranslateConfig, sourceText: string): number {
  const ceiling = cfg.llm.maxTokens;
  const estimated = Math.ceil(estimateSourceTokens(sourceText) * 2.5 + 64);
  let budget = Math.min(ceiling, estimated);
  if (!isThinkingExplicitlyDisabled(cfg.llm.extraBody)) {
    budget = Math.max(budget, Math.min(ceiling, SINGLE_TRANSLATE_MIN_COMPLETION_TOKENS));
  }
  return budget;
}
