import type { DocumentSnapshot, TextUnit } from '../types';
import { protect } from './placeholders';

const UI_ATTRS = new Set([
  'placeholder',
  'title',
  'alt',
  'aria-label',
  'aria-placeholder',
  'aria-description',
  'label',
]);

const TEMPLATE_LANGS = new Set(['html', 'xml', 'vue', 'svelte', 'javascriptreact', 'typescriptreact']);

export function extractTemplateUiTextAt(doc: DocumentSnapshot, offset: number): TextUnit | null {
  if (!TEMPLATE_LANGS.has(doc.languageId)) return null;
  const text = doc.getText();
  const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
  const lineEnd = text.indexOf('\n', offset);
  const lineEndIdx = lineEnd === -1 ? text.length : lineEnd;
  const line = text.slice(lineStart, lineEndIdx);
  const col = offset - lineStart;

  const attr = findUiAttribute(line, col);
  if (attr) {
    const absStart = lineStart + attr.valueStart;
    const absEnd = lineStart + attr.valueEnd;
    const body = stripQuotes(line.slice(attr.valueStart, attr.valueEnd));
    const p = protect(body);
    return {
      kind: 'string',
      range: { start: absStart, end: absEnd },
      rawText: text.slice(absStart, absEnd),
      text: p.text,
      placeholders: p.placeholders,
      languageId: doc.languageId,
      source: 'regex',
    };
  }

  const textNode = findHtmlTextNode(line, col);
  if (textNode) {
    const absStart = lineStart + textNode.start;
    const absEnd = lineStart + textNode.end;
    const body = line.slice(textNode.start, textNode.end).trim();
    if (!body || body.startsWith('<')) return null;
    const p = protect(body);
    return {
      kind: 'string',
      range: { start: absStart, end: absEnd },
      rawText: text.slice(absStart, absEnd),
      text: p.text,
      placeholders: p.placeholders,
      languageId: doc.languageId,
      source: 'regex',
    };
  }
  return null;
}

function findUiAttribute(
  line: string,
  col: number,
): { valueStart: number; valueEnd: number } | null {
  const re = /([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const name = m[1].toLowerCase();
    if (!UI_ATTRS.has(name) && !name.startsWith('aria-')) continue;
    const valueStart = m.index + m[0].indexOf(m[3]);
    const valueEnd = valueStart + m[3].length;
    if (col >= valueStart && col < valueEnd) return { valueStart, valueEnd };
  }
  return null;
}

function findHtmlTextNode(line: string, col: number): { start: number; end: number } | null {
  const close = line.lastIndexOf('>', col);
  if (close < 0) return null;
  const open = line.indexOf('<', close + 1);
  const start = close + 1;
  const end = open < 0 ? line.length : open;
  if (col < start || col >= end) return null;
  return { start, end };
}

function stripQuotes(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}
