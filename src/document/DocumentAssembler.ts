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
  return finalizeTrailingNewlines(source, parts.join(''));
}

function trailingNewlineCount(s: string): number {
  const m = s.match(/\n+$/);
  return m ? m[0].length : 0;
}

function finalizeTrailingNewlines(source: string, out: string): string {
  const want = trailingNewlineCount(source);
  const headerEnd = out.indexOf('\n\n');
  const hasPreviewHeader = out.startsWith('> AI 翻译预览');
  const bodyStart = hasPreviewHeader && headerEnd >= 0 ? headerEnd + 2 : 0;
  const header = out.slice(0, bodyStart);
  let body = out.slice(bodyStart).replace(/\n+$/, '');
  if (want > 0) body += '\n'.repeat(want);
  return header + body;
}

function gapBeforeTranslation(originalSlice: string): string {
  if (originalSlice.endsWith('\n\n')) return '';
  if (originalSlice.endsWith('\n')) return '\n';
  return '\n\n';
}

function translationBlockForSegment(
  seg: Segment,
  session: DocSession,
  style: PreviewStyle,
): string {
  if (style === 'append' && seg.kind === 'preserved') return '';

  const original = session.sourceText.slice(seg.range.start, seg.range.end);
  const gap = gapBeforeTranslation(original);

  const st = session.results.get(seg.id);
  if (!st || st.status === 'pending') {
    return style === 'interleaved' ? `${gap}> *(翻译中…)*` : '';
  }
  if (st.status === 'failed') {
    return `${gap}> ⚠️ 翻译失败：${st.error ?? '未知错误'}（保留原文）`;
  }
  const restored = restore(st.text ?? '', seg.placeholders);
  const text = (restored.ok ? restored.text : (st.text ?? '')).trimEnd();
  if (!text) return '';

  if (seg.kind === 'heading' && seg.headingDepth) {
    const hashes = '#'.repeat(seg.headingDepth);
    const clean = text.replace(/^#+\s*/, '').trim();
    return `${gap}${hashes} ${clean}`;
  }

  if (seg.containerKind) {
    return `${gap}${text}`;
  }

  return `${gap}${text}`;
}

/** Replace translatable ranges in source with translated text (structure-aware). */
export function assembleTranslatedOnly(source: string, session: DocSession): string {
  const replacements: Array<{ start: number; end: number; text: string }> = [];

  const trimReplacement = (text: string): string => {
    if (source.endsWith('\n')) return text;
    return text.replace(/\n+$/, '');
  };

  for (const seg of session.segments) {
    if (seg.kind === 'preserved') continue;
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
      replacements.push({ start: seg.range.start, end: seg.range.end, text: trimReplacement(text) });
    }
  }

  replacements.sort((a, b) => b.start - a.start);
  let out = source;
  for (const rep of replacements) {
    out = out.slice(0, rep.start) + rep.text + out.slice(rep.end);
  }
  return finalizeTrailingNewlines(source, out);
}
