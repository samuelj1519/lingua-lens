import type { DocSession } from './DocTranslationService';
import type { TranslationService } from '../translation/TranslationService';
import type { TargetLang } from '../types';
import { restore } from '../parsing/placeholders';
import { validateContainerTranslation } from './containerStructure';
import { reassembleListFromLineTranslations } from './listFallback';
export async function validateAndFallbackContainers(
  session: DocSession,
  source: string,
  translation: TranslationService,
  target: TargetLang,
): Promise<void> {
  for (const seg of session.segments) {
    if (!seg.containerKind) continue;
    const st = session.results.get(seg.id);
    if (st?.status !== 'done' || !st.text) continue;

    const original = source.slice(seg.range.start, seg.range.end);
    const restored = restore(st.text, seg.placeholders);
    const translated = restored.ok ? restored.text : st.text;

    if (validateContainerTranslation(original, translated, seg.containerKind)) continue;

    if (seg.containerKind === 'list' && seg.listFallbackItems?.length) {
      const map = new Map<string, string>();
      for (const item of seg.listFallbackItems) {
        const unit = {
          kind: 'documentParagraph' as const,
          range: { start: 0, end: item.text.length },
          rawText: item.text,
          text: item.text,
          placeholders: item.placeholders,
          languageId: 'markdown',
          source: 'document' as const,
        };
        try {
          const r = await translation.translate(unit, target, {
            kind: 'hover',
            uri: session.sourceUri,
          });
          map.set(item.id, r.text);
        } catch (e) {
          session.results.set(seg.id, {
            status: 'failed',
            error: e instanceof Error ? e.message : String(e),
          });
          map.clear();
          break;
        }
      }
      if (map.size) {
        const merged = reassembleListFromLineTranslations(original, seg.listFallbackItems, map);
        session.results.set(seg.id, { status: 'done', text: merged });
      }
    } else {
      session.results.set(seg.id, {
        status: 'failed',
        error: '结构校验未通过，已保留原文块',
      });
    }
  }
}
