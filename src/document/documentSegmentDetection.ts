import { decide, type DetectOptions } from '../detection/LanguageDetector';
import type { TranslateConfig } from '../config/types';
import type { Segment } from '../types';
import { stripMarkdownForDetection } from './documentDetectionText';

export function detectOptionsFromConfig(cfg: Pick<TranslateConfig, 'targetLanguage' | 'detection' | 'privacy'>): DetectOptions {
  return {
    target: cfg.targetLanguage,
    minLength: cfg.detection.minLength,
    targetRatio: cfg.detection.targetRatio,
    reliableMinLength: cfg.detection.reliableMinLength,
    strictChineseVariant: cfg.detection.strictChineseVariant,
    userSkipPatterns: cfg.detection.skipPatterns.map((p) => new RegExp(p)),
  };
}

/** Whether this fragment should be sent to the model (same rules as hover translation). */
export function shouldTranslateDocumentText(
  text: string,
  cfg: Pick<TranslateConfig, 'targetLanguage' | 'detection' | 'privacy'>,
  kind: Segment['kind'] = 'paragraph',
  force = false,
): boolean {
  if (force) return true;
  const sample = stripMarkdownForDetection(text, kind);
  if (!sample.trim()) return false;
  const det = decide(sample, detectOptionsFromConfig(cfg));
  return det.action === 'translate';
}

export function shouldTranslateDocumentSegment(
  seg: Segment,
  source: string,
  cfg: Pick<TranslateConfig, 'targetLanguage' | 'detection' | 'privacy'>,
  force = false,
): boolean {
  if (seg.kind === 'preserved') return false;
  const slice = source.slice(seg.range.start, seg.range.end);
  return shouldTranslateDocumentText(seg.sourceText || slice, cfg, seg.kind, force);
}
