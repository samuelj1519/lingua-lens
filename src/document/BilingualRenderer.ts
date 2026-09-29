import type { DocSession } from './DocTranslationService';

export class BilingualRenderer {
  renderBilingual(source: string, session: DocSession): string {
    const header = `> AI 翻译预览 (只读) · 源文件 ${session.sourceLabel} · 目标 ${session.target} · 进度 ${session.doneCount}/${session.totalTranslatable}\n\n`;
    let out = header + source;
    const inserts: Array<{ pos: number; text: string }> = [];

    for (const seg of session.segments) {
      if (seg.kind === 'preserved') continue;
      const st = session.results.get(seg.id);
      let translation = '(翻译中...)';
      if (st?.status === 'done' && st.text) translation = st.text;
      if (st?.status === 'failed') translation = `(翻译失败: ${st.error ?? '未知'})`;

      if (seg.kind === 'heading' && seg.headingDepth) {
        inserts.push({ pos: seg.range.end, text: `\n\n${'#'.repeat(seg.headingDepth)} ${translation}` });
      } else if (seg.kind === 'table' && seg.table) {
        inserts.push({ pos: seg.range.end, text: `\n\n${translation}` });
      } else {
        const prefix = seg.linePrefix ? `\n\n${seg.linePrefix}` : '\n\n';
        inserts.push({ pos: seg.range.end, text: `${prefix}${translation}` });
      }
    }

    inserts.sort((a, b) => b.pos - a.pos);
    for (const ins of inserts) {
      out = out.slice(0, ins.pos) + ins.text + out.slice(ins.pos);
    }
    return out;
  }

  renderTranslated(source: string, session: DocSession): string {
    let out = source;
    const replacements: Array<{ start: number; end: number; text: string }> = [];
    for (const seg of session.segments) {
      if (seg.kind === 'preserved') continue;
      const st = session.results.get(seg.id);
      if (st?.status !== 'done' || !st.text) continue;
      if (seg.kind === 'heading' && seg.headingDepth) {
        const raw = source.slice(seg.range.start, seg.range.end);
        const hashes = raw.match(/^#+\s/)?.[0] ?? '';
        replacements.push({
          start: seg.range.start,
          end: seg.range.end,
          text: hashes + st.text,
        });
      } else if (seg.kind !== 'table') {
        replacements.push({ start: seg.range.start, end: seg.range.end, text: st.text });
      }
    }
    replacements.sort((a, b) => b.start - a.start);
    for (const r of replacements) {
      out = out.slice(0, r.start) + r.text + out.slice(r.end);
    }
    return out;
  }
}
