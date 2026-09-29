import type { DocSession } from './DocTranslationService';
import type { TranslationService } from '../translation/TranslationService';
import type { TargetLang } from '../types';
import { reassembleListFromLineTranslations } from './listFallback';
import { isSameTranslationAsSource } from '../util/textEquivalence';
import { shouldTranslateDocumentText } from './documentSegmentDetection';
import type { TranslateConfig } from '../config/types';

export async function translatePartialDocumentSegments(
  session: DocSession,
  source: string,
  cfg: TranslateConfig,
  translation: TranslationService,
  target: TargetLang,
): Promise<void> {
  for (const seg of session.segments) {
    const plan = session.plans.get(seg.id);
    if (!plan || plan.mode !== 'list-lines') continue;

    const original = source.slice(seg.range.start, seg.range.end);
    const lines = original.split('\n');
    const translations = new Map<string, string>();

    const specs =
      plan.lineSpecs ??
      (seg.listFallbackItems ?? [])
        .filter((it) => plan.lineIds?.includes(it.id))
        .map((it) => ({
          id: it.id,
          lineIndex: it.lineIndex,
          prefix: it.prefix,
          text: it.text,
          placeholders: it.placeholders,
        }));

    for (const spec of specs) {
      if (
        !cfg.document.forceTranslate &&
        !shouldTranslateDocumentText(spec.text, cfg, 'paragraph', false)
      ) {
        continue;
      }
      try {
        const unit = {
          kind: 'documentParagraph' as const,
          range: { start: 0, end: spec.text.length },
          rawText: spec.text,
          text: spec.text,
          placeholders: spec.placeholders,
          languageId: 'markdown',
          source: 'document' as const,
        };
        const r = await translation.translate(unit, target, {
          kind: 'hover',
          uri: session.sourceUri,
        });
        if (isSameTranslationAsSource(spec.text, r.text, spec.placeholders)) {
          continue;
        }
        translations.set(spec.id, r.text);
      } catch (e) {
        session.results.set(seg.id, {
          status: 'failed',
          error: e instanceof Error ? e.message : String(e),
        });
        translations.clear();
        break;
      }
    }

    if (session.results.get(seg.id)?.status === 'failed') continue;

    if (translations.size === 0) {
      session.results.set(seg.id, { status: 'skipped' });
      continue;
    }

    if (seg.listFallbackItems?.length && !plan.lineSpecs) {
      const merged = reassembleListFromLineTranslations(
        original,
        seg.listFallbackItems.filter((it) => translations.has(it.id)),
        translations,
      );
      session.results.set(seg.id, { status: 'done', text: merged });
    } else if (plan.lineSpecs) {
      for (const spec of plan.lineSpecs) {
        const tr = translations.get(spec.id);
        if (tr === undefined) continue;
        lines[spec.lineIndex] = spec.prefix + tr;
      }
      session.results.set(seg.id, { status: 'done', text: lines.join('\n') });
    }
  }
}
