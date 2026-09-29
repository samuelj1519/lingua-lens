import type { Segment } from '../types';

/** Strip Markdown syntax so language detection focuses on natural language (hover-aligned). */
export function stripMarkdownForDetection(raw: string, kind: Segment['kind']): string {
  let t = raw;
  if (kind === 'heading') {
    t = t.replace(/^#+\s*/, '');
  }
  t = t.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  t = t.replace(/`[^`]+`/g, ' ');
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
  t = t.replace(/\*([^*]+)\*/g, '$1');
  t = t.replace(/__([^_]+)__/g, '$1');
  t = t.replace(/_([^_]+)_/g, '$1');
  t = t.replace(/^>\s?/gm, '');
  t = t.replace(/^\s*[-*+]\s(\[[ xX]\]\s)?/gm, '');
  t = t.replace(/^\s*\d+\.\s+/gm, '');
  t = t.replace(/\|/g, ' ');
  t = t.replace(/^[-:| ]+$/gm, ' ');
  return t.replace(/\s+/g, ' ').trim();
}
