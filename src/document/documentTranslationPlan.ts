import { protect } from '../parsing/placeholders';
import type { TranslateConfig } from '../config/types';
import type { Placeholder, Segment } from '../types';
import { shouldTranslateDocumentText } from './documentSegmentDetection';

export type DocumentSegmentPlanMode = 'skip' | 'batch' | 'list-lines';

export interface LineTranslateSpec {
  id: string;
  lineIndex: number;
  prefix: string;
  text: string;
  placeholders: Placeholder[];
}

export interface DocumentSegmentPlan {
  mode: DocumentSegmentPlanMode;
  /** For `list-lines`, ids from `listFallbackItems` that need translation. */
  lineIds?: string[];
  /** Non-list containers: per-line translate specs when mode is `list-lines`. */
  lineSpecs?: LineTranslateSpec[];
}

export interface DocumentTranslationPlanResult {
  plans: Map<string, DocumentSegmentPlan>;
  translatableCount: number;
}

export function buildDocumentTranslationPlan(
  segments: Segment[],
  source: string,
  cfg: Pick<TranslateConfig, 'targetLanguage' | 'detection' | 'privacy' | 'document'>,
): DocumentTranslationPlanResult {
  const force = cfg.document.forceTranslate;
  const plans = new Map<string, DocumentSegmentPlan>();
  let translatableCount = 0;

  for (const seg of segments) {
    if (seg.kind === 'preserved') continue;

    if (seg.containerKind === 'list' && seg.listFallbackItems?.length) {
      const plan = planListSegment(seg, source, cfg, force);
      plans.set(seg.id, plan);
      if (plan.mode !== 'skip') translatableCount++;
      continue;
    }

    if (seg.containerKind === 'table' || seg.containerKind === 'blockquote') {
      const plan = planMultilineContainer(seg, source, cfg, force);
      plans.set(seg.id, plan);
      if (plan.mode !== 'skip') translatableCount++;
      continue;
    }

    const slice = source.slice(seg.range.start, seg.range.end);
    const translate = force || shouldTranslateDocumentText(seg.sourceText || slice, cfg, seg.kind, false);
    const plan: DocumentSegmentPlan = translate ? { mode: 'batch' } : { mode: 'skip' };
    plans.set(seg.id, plan);
    if (plan.mode !== 'skip') translatableCount++;
  }

  return { plans, translatableCount };
}

function planListSegment(
  seg: Segment,
  source: string,
  cfg: Pick<TranslateConfig, 'targetLanguage' | 'detection' | 'privacy' | 'document'>,
  force: boolean,
): DocumentSegmentPlan {
  const items = seg.listFallbackItems ?? [];
  if (!items.length) {
    const block = source.slice(seg.range.start, seg.range.end);
    return shouldTranslateDocumentText(block, cfg, seg.kind, force)
      ? { mode: 'batch' }
      : { mode: 'skip' };
  }

  const needIds = items
    .filter((it) => force || shouldTranslateDocumentText(it.text, cfg, 'paragraph', false))
    .map((it) => it.id);
  if (needIds.length === 0) return { mode: 'skip' };
  if (needIds.length === items.length) {
    const block = source.slice(seg.range.start, seg.range.end);
    if (force || shouldTranslateDocumentText(block, cfg, 'list', false)) {
      return { mode: 'batch' };
    }
  }
  return { mode: 'list-lines', lineIds: needIds };
}

function planMultilineContainer(
  seg: Segment,
  source: string,
  cfg: Pick<TranslateConfig, 'targetLanguage' | 'detection' | 'privacy' | 'document'>,
  force: boolean,
): DocumentSegmentPlan {
  const block = source.slice(seg.range.start, seg.range.end);
  if (force || shouldTranslateDocumentText(block, cfg, seg.kind, false)) {
    return { mode: 'batch' };
  }

  const lines = block.split('\n');
  const specs: LineTranslateSpec[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prefixMatch = line.match(/^(\s*>?\s*)(.*)$/);
    const prefix = prefixMatch?.[1] ?? '';
    const body = prefixMatch?.[2] ?? line;
    if (!body.trim()) continue;
    if (!force && !shouldTranslateDocumentText(body, cfg, 'paragraph', false)) continue;
    const p = protect(body);
    specs.push({
      id: `${seg.id}.ln${i}`,
      lineIndex: i,
      prefix,
      text: p.text,
      placeholders: p.placeholders,
    });
  }
  if (specs.length === 0) return { mode: 'skip' };
  return { mode: 'list-lines', lineSpecs: specs };
}

export const DOCUMENT_ALREADY_TARGET_MESSAGE = '文档已是目标语言，无需翻译';
