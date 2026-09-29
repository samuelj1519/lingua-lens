import type { TargetLang } from '../types';
import { decide } from '../detection/LanguageDetector';
import type { TranslateConfig } from '../config/types';

const EN: TargetLang = 'en';

export function resolveSelectionTargetLanguage(
  text: string,
  cfg: TranslateConfig,
): TargetLang {
  const detOpts = {
    target: cfg.targetLanguage,
    minLength: cfg.detection.minLength,
    targetRatio: cfg.detection.targetRatio,
    reliableMinLength: cfg.detection.reliableMinLength,
    strictChineseVariant: cfg.detection.strictChineseVariant,
    userSkipPatterns: cfg.detection.skipPatterns.map((p) => new RegExp(p)),
    blockSecrets: cfg.privacy.blockSecrets,
  };
  const decision = decide(text, detOpts);
  if (decision.action === 'skip' && decision.detected === 'zh') {
    return EN;
  }
  if (decision.action === 'translate' && decision.detected === 'zh') {
    return EN;
  }
  if (decision.action === 'skip' && cfg.targetLanguage === EN) {
    return cfg.targetLanguage;
  }
  return cfg.targetLanguage;
}
