import { restore } from '../../parsing/placeholders';
import type { DocSession } from '../DocTranslationService';
import { buildStructuredReplacement } from './escape';

/** Apply translated string values by offset; leaves file byte-identical when nothing is translated. */
export function assembleStructuredTranslated(source: string, session: DocSession): string {
  const replacements: Array<{ start: number; end: number; text: string }> = [];

  for (const seg of session.segments) {
    if (seg.kind !== 'structured' || !seg.structuredMeta) continue;
    const st = session.results.get(seg.id);
    if (st?.status !== 'done' || st.text === undefined || st.text === null) continue;
    const r = restore(st.text, seg.placeholders);
    const inner = r.ok ? r.text : st.text;
    const meta = seg.structuredMeta;
    const rep = buildStructuredReplacement(meta, inner);
    replacements.push({
      start: rep.start,
      end: rep.end,
      text: rep.literal,
    });
  }

  replacements.sort((a, b) => b.start - a.start);
  let out = source;
  for (const rep of replacements) {
    out = out.slice(0, rep.start) + rep.text + out.slice(rep.end);
  }
  return out;
}
