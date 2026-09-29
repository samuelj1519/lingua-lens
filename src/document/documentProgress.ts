import type { DocSession } from './DocTranslationService';

/** English template (mirrors `package.l10n.json`). */
export const DOCUMENT_PROGRESS_TEMPLATE_EN = 'Translating {0}: {1}/{2} segments';

/** Chinese template (mirrors `package.l10n.zh-cn.json`). */
export const DOCUMENT_PROGRESS_TEMPLATE_ZH = '正在翻译 {0}：{1}/{2} 段';

export function formatDocumentProgressMessage(
  fileName: string,
  completed: number,
  total: number,
  template: string = DOCUMENT_PROGRESS_TEMPLATE_EN,
): string {
  return template
    .replace('{0}', fileName)
    .replace('{1}', String(completed))
    .replace('{2}', String(total));
}

/** Segments that need translation and are no longer pending (incl. cache, identity-skip, failed). */
export function countCompletedTranslatableSegments(session: DocSession): number {
  let n = 0;
  for (const seg of session.segments) {
    if (seg.kind === 'preserved') continue;
    const plan = session.plans.get(seg.id);
    if (!plan || plan.mode === 'skip') continue;
    const st = session.results.get(seg.id);
    if (!st || st.status === 'pending') continue;
    n++;
  }
  return n;
}

export function segmentProgressIncrement(completed: number, total: number, previousPercent: number): number {
  if (total <= 0) return 100 - previousPercent;
  const pct = (completed / total) * 100;
  return Math.max(0, pct - previousPercent);
}
