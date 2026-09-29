import type { Placeholder } from '../types';
import { protect } from '../parsing/placeholders';

export interface ListLineItem {
  id: string;
  lineIndex: number;
  prefix: string;
  text: string;
  placeholders: Placeholder[];
}

export function splitListIntoLineItems(segmentId: string, markdown: string): ListLineItem[] {
  const lines = markdown.split('\n');
  const items: ListLineItem[] = [];
  let itemIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const task = line.match(/^(\s*[-*+]\s\[[ xX]\]\s)(.*)$/);
    const bullet = line.match(/^(\s*(?:[-*+]|\d+\.)\s)(.*)$/);
    const m = task ?? bullet;
    if (!m) continue;
    const p = protect(m[2]);
    items.push({
      id: `${segmentId}.li${itemIdx++}`,
      lineIndex: i,
      prefix: m[1],
      text: p.text,
      placeholders: p.placeholders,
    });
  }
  return items;
}

export function reassembleListFromLineTranslations(
  originalMarkdown: string,
  items: ListLineItem[],
  translations: Map<string, string>,
): string {
  const lines = originalMarkdown.split('\n');
  for (const item of items) {
    const tr = translations.get(item.id);
    if (tr === undefined) continue;
    lines[item.lineIndex] = item.prefix + tr;
  }
  return lines.join('\n');
}
