import type { StructuredFormatAdapter, StructuredStringSpan } from './types';
import { shouldSkipStructuredStringValue } from './skipValue';

const TRANSLATABLE_ATTRS = new Set([
  'title',
  'alt',
  'label',
  'description',
  'placeholder',
  'summary',
  'tooltip',
  'aria-label',
  'aria-description',
]);

function decodeXmlEntities(s: string): string {
  return s.replace(/&(amp|lt|gt|quot|apos|#(\d+)|#x([0-9a-fA-F]+));/g, (_m, name, dec, hex) => {
    if (name === 'amp') return '&';
    if (name === 'lt') return '<';
    if (name === 'gt') return '>';
    if (name === 'quot') return '"';
    if (name === 'apos') return "'";
    if (dec) return String.fromCharCode(Number(dec));
    if (hex) return String.fromCodePoint(parseInt(hex, 16));
    return _m;
  });
}

function shouldTranslateAttrValue(name: string, decoded: string): boolean {
  if (!TRANSLATABLE_ATTRS.has(name.toLowerCase())) return false;
  if (shouldSkipStructuredStringValue(decoded)) return false;
  return decoded.trim().length >= 1;
}

export const xmlAdapter: StructuredFormatAdapter = {
  formatId: 'xml',
  extractSpans(source: string): StructuredStringSpan[] {
    const spans: StructuredStringSpan[] = [];
    let i = 0;
    const n = source.length;
    const stack: string[] = [];

    while (i < n) {
      if (source.startsWith('<?', i)) {
        const end = source.indexOf('?>', i + 2);
        i = end < 0 ? n : end + 2;
        continue;
      }
      if (source.startsWith('<!--', i)) {
        const end = source.indexOf('-->', i + 4);
        i = end < 0 ? n : end + 3;
        continue;
      }
      if (source.startsWith('<![CDATA[', i)) {
        const end = source.indexOf(']]>', i + 9);
        i = end < 0 ? n : end + 3;
        continue;
      }
      if (source[i] === '<') {
        const close = source[i + 1] === '/';
        const tagEnd = source.indexOf('>', i);
        if (tagEnd < 0) break;
        const tagContent = source.slice(i + (close ? 2 : 1), tagEnd).trim();
        const nameMatch = tagContent.match(/^([^\s/>]+)/);
        const tagName = nameMatch?.[1] ?? '';
        if (close) {
          if (stack.length) stack.pop();
        } else if (!tagContent.startsWith('!')) {
          const selfClosing = tagContent.endsWith('/');
          const attrsSource = selfClosing ? tagContent.slice(0, -1).trimEnd() : tagContent;
          if (!selfClosing) stack.push(tagName);
          const attrRe = /([A-Za-z_][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
          let m: RegExpExecArray | null;
          while ((m = attrRe.exec(attrsSource))) {
            const attrName = m[1];
            const quote = m[2][0] as "'" | '"';
            const inner = m[3] ?? m[4] ?? '';
            const quoteIdx = i + 1 + m.index + m[0].indexOf(quote);
            const decoded = decodeXmlEntities(inner);
            if (!shouldTranslateAttrValue(attrName, decoded)) continue;
            const innerStart = quoteIdx + 1;
            spans.push({
              replaceRange: { start: innerStart, end: innerStart + inner.length },
              sourceLiteral: inner,
              decoded,
              escape: quote === "'" ? 'xml-attr-single' : 'xml-attr-double',
              xmlAttrQuote: quote,
            });
          }
        }
        i = tagEnd + 1;
        continue;
      }
      const nextTag = source.indexOf('<', i);
      const textEnd = nextTag < 0 ? n : nextTag;
      const raw = source.slice(i, textEnd);
      if (raw.trim()) {
        const parent = stack[stack.length - 1];
        if (parent?.toLowerCase() === 'key') {
          i = textEnd;
          continue;
        }
        const decoded = decodeXmlEntities(raw);
        if (!shouldSkipStructuredStringValue(decoded) && /[A-Za-z\u4e00-\u9fff]/.test(decoded)) {
          spans.push({
            replaceRange: { start: i, end: textEnd },
            sourceLiteral: raw,
            decoded,
            escape: 'xml-text',
          });
        }
      }
      i = textEnd;
    }
    return spans;
  },
};
