import type { Segment } from '../types';
import type { DocSession } from './DocTranslationService';
import { restore } from '../parsing/placeholders';

export type PreviewStyle = 'interleaved' | 'append';

/** Build preview/side-file text by walking segments in source order (no offset inserts). */
export function assembleDocument(
  source: string,
  session: DocSession,
  style: PreviewStyle,
): string {
  const sorted = [...session.segments].sort((a, b) => a.range.start - b.range.start);
  const parts: string[] = [];
  let cursor = 0;

  const header =
    `> AI 翻译预览 (只读) · 源文件 ${session.sourceLabel} · 目标 ${session.target} · 进度 ${session.doneCount}/${session.totalTranslatable}\n\n`;

  parts.push(header);

  for (const seg of sorted) {
    if (seg.range.start > cursor) {
      parts.push(source.slice(cursor, seg.range.start));
    }
    const original = source.slice(seg.range.start, seg.range.end);
    parts.push(original);

    if (seg.kind !== 'preserved') {
      const block = translationBlockForSegment(seg, session, style);
      if (block) parts.push(block);
    }
    cursor = seg.range.end;
  }
  if (cursor < source.length) {
    parts.push(source.slice(cursor));
  }
  return parts.join('');
}

function translationBlockForSegment(
  seg: Segment,
  session: DocSession,
  style: PreviewStyle,
): string {
  if (style === 'append' && seg.kind === 'preserved') return '';

  if (seg.table) {
    return renderTableTranslation(seg, session);
  }

  const st = session.results.get(seg.id);
  if (!st || st.status === 'pending') {
    return style === 'interleaved' ? '\n\n> *(翻译中…)*\n' : '';
  }
  if (st.status === 'failed') {
    return `\n\n> ⚠️ 翻译失败：${st.error ?? '未知错误'}（保留原文）\n`;
  }
  const restored = restore(st.text ?? '', seg.placeholders);
  const text = restored.ok ? restored.text : (st.text ?? '');
  if (!text.trim()) return '';

  if (seg.kind === 'heading' && seg.headingDepth) {
    const hashes = '#'.repeat(seg.headingDepth);
    const clean = text.replace(/^#+\s*/, '').trim();
    return `\n\n${hashes} ${clean}\n`;
  }

  return `\n\n${text}\n`;
}

function renderTableTranslation(seg: Segment, session: DocSession): string {
  if (!seg.table) return '';
  const lines: string[] = ['\n'];
  for (const row of seg.table.cells) {
    const cells: string[] = [];
    for (const cell of row) {
      const st = session.results.get(cell.id);
      if (st?.status === 'done' && st.text) {
        const r = restore(st.text, cell.placeholders);
        cells.push((r.ok ? r.text : st.text).replace(/\|/g, '\\|'));
      } else if (st?.status === 'failed') {
        cells.push(`⚠️${cell.text.slice(0, 20)}`);
      } else {
        cells.push(cell.text.replace(/\|/g, '\\|'));
      }
    }
    lines.push(`| ${cells.join(' | ')} |`);
  }
  return lines.join('\n') + '\n';
}

/** Replace translatable ranges in source with translated text (structure-aware). */
export function assembleTranslatedOnly(source: string, session: DocSession): string {
  const replacements: Array<{ start: number; end: number; text: string }> = [];

  for (const seg of session.segments) {
    if (seg.kind === 'preserved') continue;
    if (seg.table && seg.table) {
      for (const row of seg.table.cells) {
        for (const cell of row) {
          if (!cell.range) continue;
          const st = session.results.get(cell.id);
          if (st?.status !== 'done' || !st.text) continue;
          const r = restore(st.text, cell.placeholders);
          replacements.push({
            start: cell.range.start,
            end: cell.range.end,
            text: r.ok ? r.text : st.text,
          });
        }
      }
      continue;
    }
    const st = session.results.get(seg.id);
    if (st?.status !== 'done' || !st.text) continue;
    const r = restore(st.text, seg.placeholders);
    const text = r.ok ? r.text : st.text;

    if (seg.kind === 'heading' && seg.headingDepth) {
      const raw = source.slice(seg.range.start, seg.range.end);
      const hashes = raw.match(/^#+\s/)?.[0] ?? '';
      replacements.push({
        start: seg.range.start,
        end: seg.range.end,
        text: hashes + text.replace(/^#+\s*/, '').trim(),
      });
    } else {
      replacements.push({ start: seg.range.start, end: seg.range.end, text });
    }
  }

  replacements.sort((a, b) => b.start - a.start);
  let out = source;
  for (const rep of replacements) {
    out = out.slice(0, rep.start) + rep.text + out.slice(rep.end);
  }
  return out;
}
