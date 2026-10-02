import type { StructuredFormatAdapter, StructuredStringSpan } from './types';
import { shouldSkipStructuredStringValue } from './skipValue';
import type { StructuredEscapeKind } from './types';

/** TOML multiline basic string: strip opening newline and line-ending backslash continuations. */
export function decodeTomlMultilineBasic(raw: string): string {
  let body = raw;
  if (body.startsWith('\n')) body = body.slice(1);
  body = body.replace(/\\(\r\n|\r|\n)[ \t]*/g, '');
  return decodeTomlBasic(body);
}

export function decodeTomlMultilineLiteral(raw: string): string {
  let body = raw;
  if (body.startsWith('\n')) body = body.slice(1);
  return body;
}

export function decodeTomlBasic(raw: string): string {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch !== '\\' || i + 1 >= raw.length) {
      out += ch;
      continue;
    }
    const n = raw[++i];
    if (n === 'n') out += '\n';
    else if (n === 'r') out += '\r';
    else if (n === 't') out += '\t';
    else if (n === 'b') out += '\b';
    else if (n === 'f') out += '\f';
    else if (n === '\\' || n === '"') out += n;
    else if (n === 'u' && i + 4 < raw.length) {
      out += String.fromCharCode(parseInt(raw.slice(i + 1, i + 5), 16));
      i += 4;
    } else if (n === 'U' && i + 8 < raw.length) {
      out += String.fromCodePoint(parseInt(raw.slice(i + 1, i + 9), 16));
      i += 8;
    } else out += n;
  }
  return out;
}

function scanQuotedString(
  source: string,
  start: number,
  delim: string,
  fullEscape: StructuredEscapeKind,
): { span?: StructuredStringSpan; next: number } | null {
  const isMl = delim.length === 3;
  const innerStart = start + delim.length;
  let i = innerStart;
  const n = source.length;
  while (i < n) {
    if (source.startsWith(delim, i)) {
      const innerEnd = i;
      const rawInner = source.slice(innerStart, innerEnd);
      const decoded =
        delim[0] === '"'
          ? isMl
            ? decodeTomlMultilineBasic(rawInner)
            : decodeTomlBasic(rawInner)
          : isMl
            ? decodeTomlMultilineLiteral(rawInner)
            : rawInner;
      if (shouldSkipStructuredStringValue(decoded)) {
        return { span: undefined, next: i + delim.length };
      }
      const fullStart = start;
      const fullEnd = i + delim.length;
      const useInner = delim[0] === '"' && isMl;
      const repStart = useInner ? innerStart : fullStart;
      const repEnd = useInner ? innerEnd : fullEnd;
      const span: StructuredStringSpan = {
        replaceRange: { start: repStart, end: repEnd },
        sourceLiteral: source.slice(repStart, repEnd),
        decoded,
        escape:
          delim[0] === '"'
            ? isMl
              ? 'toml-ml-basic'
              : fullEscape
            : isMl
              ? 'toml-ml-literal'
              : 'toml-literal',
      };
      return { span, next: fullEnd };
    }
    if (delim[0] === '"' && source[i] === '\\' && i + 1 < n) {
      i += 2;
      continue;
    }
    i++;
  }
  return null;
}

function extractValueStrings(source: string, valueStart: number): StructuredStringSpan[] {
  const spans: StructuredStringSpan[] = [];
  let i = valueStart;
  const n = source.length;
  while (i < n && /[ \t]/.test(source[i])) i++;
  if (i >= n || source[i] === '#') return spans;
  const ch = source[i];
  if (ch === '"' || ch === "'") {
    const isMl = source.slice(i, i + 3) === ch.repeat(3);
    const delim = isMl ? ch.repeat(3) : ch;
    const fullEsc: StructuredEscapeKind = 'toml-basic-full';
    const res = scanQuotedString(source, i, delim, fullEsc);
    if (res?.span) spans.push(res.span);
  }
  return spans;
}

export const tomlAdapter: StructuredFormatAdapter = {
  formatId: 'toml',
  extractSpans(source: string): StructuredStringSpan[] {
    const spans: StructuredStringSpan[] = [];
    const lines = source.split(/(?=\n)/);
    let offset = 0;
    for (const line of lines) {
      const trimmed = line.trimStart();
      if (!trimmed || trimmed.startsWith('#')) {
        offset += line.length;
        continue;
      }
      if (/^\[.+\]\s*$/.test(trimmed)) {
        offset += line.length;
        continue;
      }
      const eq = line.indexOf('=');
      if (eq < 0) {
        offset += line.length;
        continue;
      }
      const valueStart = offset + eq + 1;
      spans.push(...extractValueStrings(source, valueStart));
      offset += line.length;
    }
    return spans;
  },
};
