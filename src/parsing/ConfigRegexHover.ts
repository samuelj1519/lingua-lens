import type { DocumentSnapshot, TextUnit } from '../types';
import { splitConfigIdentifier, stripConfigKeyQuotes } from './configKey';
import {
  configFilePath,
  isConfigHoverLanguage,
  resolveConfigFormat,
} from './languages/configLanguages';
import { protect } from './placeholders';

/** Regex / line-based config hover (comments, values, keys) aligned across formats. */
export function extractConfigRegexHoverAt(
  doc: DocumentSnapshot,
  offset: number,
  configKeys: boolean,
): TextUnit | null {
  const path = configFilePath(doc);
  if (!isConfigHoverLanguage(doc.languageId, path)) return null;
  const format = resolveConfigFormat(doc.languageId, path);
  switch (format) {
    case 'yaml':
      return extractYamlLineAt(doc, offset, configKeys);
    case 'toml':
      return extractTomlLineAt(doc, offset, configKeys);
    case 'json':
      return extractJsonFamilyAt(doc, offset, configKeys);
    case 'xml':
      return extractXmlAt(doc, offset, configKeys);
    case 'ini':
      return extractIniLineAt(doc, offset, configKeys, ['#', ';']);
    case 'properties':
      return extractIniLineAt(doc, offset, configKeys, ['#', '!']);
    default:
      return extractGenericKvAt(doc, offset, configKeys);
  }
}

function extractYamlLineAt(
  doc: DocumentSnapshot,
  offset: number,
  configKeys: boolean,
): TextUnit | null {
  const text = doc.getText();
  const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
  const lineEnd = text.indexOf('\n', offset);
  const lineEndIdx = lineEnd === -1 ? text.length : lineEnd;
  const line = text.slice(lineStart, lineEndIdx);
  const col = offset - lineStart;

  const hash = line.indexOf('#');
  if (hash >= 0 && col >= hash) {
    return commentUnit(doc, lineStart + hash, lineEndIdx, line.slice(hash), '#');
  }

  return kvColonLineUnit(doc, lineStart, line, offset, configKeys);
}

function extractTomlLineAt(
  doc: DocumentSnapshot,
  offset: number,
  configKeys: boolean,
): TextUnit | null {
  const text = doc.getText();
  const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
  const lineEnd = text.indexOf('\n', offset);
  const lineEndIdx = lineEnd === -1 ? text.length : lineEnd;
  const line = text.slice(lineStart, lineEndIdx);
  const col = offset - lineStart;

  const hash = line.indexOf('#');
  if (hash >= 0 && col >= hash) {
    return commentUnit(doc, lineStart + hash, lineEndIdx, line.slice(hash), '#');
  }

  const eq = line.match(/^(\s*)([^=]+?)(\s*)=(\s*)(.+)$/);
  if (!eq) return null;
  const keyRaw = eq[2].trim();
  const keyStart = lineStart + eq[1].length + eq[2].indexOf(keyRaw);
  const keyEnd = keyStart + keyRaw.length;
  const valTrim = eq[5].trim();
  const valStart = lineStart + eq[1].length + eq[2].length + eq[3].length + 1 + eq[4].length + eq[5].indexOf(valTrim);

  if (configKeys && offset >= keyStart && offset < keyEnd) {
    return keyUnit(doc, keyStart, keyEnd, keyRaw);
  }
  if (valTrim && offset >= valStart && offset < valStart + valTrim.length) {
    return stringValueUnit(doc, valStart, valStart + valTrim.length, valTrim);
  }
  return null;
}

function extractIniLineAt(
  doc: DocumentSnapshot,
  offset: number,
  configKeys: boolean,
  commentPrefixes: string[],
): TextUnit | null {
  const text = doc.getText();
  const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
  const lineEnd = text.indexOf('\n', offset);
  const lineEndIdx = lineEnd === -1 ? text.length : lineEnd;
  const line = text.slice(lineStart, lineEndIdx);
  const col = offset - lineStart;

  for (const p of commentPrefixes) {
    const idx = line.indexOf(p);
    if (idx >= 0 && col >= idx) {
      const before = line.slice(0, idx);
      if (!before.trim() || p === '!') {
        return commentUnit(doc, lineStart + idx, lineEndIdx, line.slice(idx), p);
      }
    }
  }

  const eq = line.match(/^(\s*)([^=]+?)(\s*)=(\s*)(.*)$/);
  if (!eq) return null;
  const keyRaw = eq[2].trim();
  const keyStart = lineStart + eq[1].length + eq[2].indexOf(keyRaw);
  const keyEnd = keyStart + keyRaw.length;
  const valTrim = eq[5].trim();
  const valStart = lineStart + eq[1].length + eq[2].length + eq[3].length + 1 + eq[4].length + eq[5].indexOf(valTrim);

  if (configKeys && offset >= keyStart && offset < keyEnd) {
    return keyUnit(doc, keyStart, keyEnd, keyRaw);
  }
  if (valTrim && offset >= valStart && offset < valStart + valTrim.length) {
    return stringValueUnit(doc, valStart, valStart + valTrim.length, valTrim);
  }
  return null;
}

function extractGenericKvAt(
  doc: DocumentSnapshot,
  offset: number,
  configKeys: boolean,
): TextUnit | null {
  const text = doc.getText();
  const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
  const lineEnd = text.indexOf('\n', offset);
  const lineEndIdx = lineEnd === -1 ? text.length : lineEnd;
  const line = text.slice(lineStart, lineEndIdx);

  const colon = kvColonLineUnit(doc, lineStart, line, offset, configKeys);
  if (colon) return colon;

  const eq = line.match(/^(\s*)([^#;=]+?)(\s*)=(\s*)(.+)$/);
  if (!eq) return null;
  const keyRaw = eq[2].trim();
  const keyStart = lineStart + eq[1].length + eq[2].indexOf(keyRaw);
  const keyEnd = keyStart + keyRaw.length;
  const valTrim = eq[5].trim();
  const valStart = lineStart + line.indexOf(eq[5].trim(), eq[0].length - eq[1].length);

  if (configKeys && offset >= keyStart && offset < keyEnd) {
    return keyUnit(doc, keyStart, keyEnd, keyRaw);
  }
  if (valTrim && offset >= valStart && offset < valStart + valTrim.length) {
    return stringValueUnit(doc, valStart, valStart + valTrim.length, valTrim);
  }
  return null;
}

function kvColonLineUnit(
  doc: DocumentSnapshot,
  lineStart: number,
  line: string,
  offset: number,
  configKeys: boolean,
): TextUnit | null {
  const m = line.match(/^(\s*)([^:\s#][^:]*?)(\s*):(\s*)(.+)$/);
  if (!m) return null;
  const keyStart = lineStart + m[1].length;
  const keyEnd = keyStart + m[2].length;
  const valStart = keyEnd + m[3].length + 1 + m[4].length;
  const valRaw = m[5].trim();
  const valEnd = valStart + m[5].length - (m[5].length - m[5].trimEnd().length);

  if (configKeys && offset >= keyStart && offset < keyEnd) {
    return keyUnit(doc, keyStart, keyEnd, m[2].trim());
  }
  if (offset >= valStart && offset <= valEnd) {
    return stringValueUnit(doc, valStart, valEnd, valRaw);
  }
  return null;
}

function extractJsonFamilyAt(
  doc: DocumentSnapshot,
  offset: number,
  configKeys: boolean,
): TextUnit | null {
  const text = doc.getText();
  const block = blockCommentAt(text, offset, '/*', '*/');
  if (block) {
    const raw = text.slice(block.start, block.end);
    const body = raw.replace(/^\/\*+/, '').replace(/\*+\/$/, '').trim();
    const p = protect(body);
    return {
      kind: 'blockComment',
      range: block,
      rawText: raw,
      text: p.text,
      placeholders: p.placeholders,
      languageId: doc.languageId,
      source: 'regex',
    };
  }

  const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
  const lineEnd = text.indexOf('\n', offset);
  const lineEndIdx = lineEnd === -1 ? text.length : lineEnd;
  const line = text.slice(lineStart, lineEndIdx);
  const col = offset - lineStart;
  const slash = line.indexOf('//');
  if (slash >= 0 && col >= slash) {
    return commentUnit(doc, lineStart + slash, lineEndIdx, line.slice(slash), '//');
  }

  const hit = jsonStringAt(text, offset, doc.languageId === 'json5');
  if (hit) {
    if (hit.isKey && configKeys) {
      return keyUnit(doc, hit.start, hit.end, hit.unquoted);
    }
    if (!hit.isKey) {
      return stringValueUnit(doc, hit.start, hit.end, hit.unquoted);
    }
  }

  const bare = json5BareKeyAt(doc, text, offset, configKeys);
  if (bare) return bare;

  return null;
}

function extractXmlAt(doc: DocumentSnapshot, offset: number, configKeys: boolean): TextUnit | null {
  const text = doc.getText();
  const block = blockCommentAt(text, offset, '<!--', '-->');
  if (block) {
    const raw = text.slice(block.start, block.end);
    const body = raw.replace(/^<!--\s?/, '').replace(/\s?-->$/, '').trim();
    const p = protect(body);
    return {
      kind: 'blockComment',
      range: block,
      rawText: raw,
      text: p.text,
      placeholders: p.placeholders,
      languageId: doc.languageId,
      source: 'regex',
    };
  }

  const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
  const lineEnd = text.indexOf('\n', offset);
  const lineEndIdx = lineEnd === -1 ? text.length : lineEnd;
  const line = text.slice(lineStart, lineEndIdx);
  const col = offset - lineStart;

  const str = quotedStringOnLine(line, col);
  if (str) {
    const absStart = lineStart + str.start;
    const absEnd = lineStart + str.end;
    const body = stripConfigKeyQuotes(line.slice(str.start, str.end));
    return stringValueUnit(doc, absStart, absEnd, body);
  }

  const attr = xmlNameAt(line, col);
  if (attr && configKeys) {
    const absStart = lineStart + attr.start;
    const absEnd = lineStart + attr.end;
    return keyUnit(doc, absStart, absEnd, line.slice(attr.start, attr.end));
  }

  const textNode = xmlTextNodeAt(line, col);
  if (textNode) {
    const absStart = lineStart + textNode.start;
    const absEnd = lineStart + textNode.end;
    const body = line.slice(textNode.start, textNode.end).trim();
    if (body) return stringValueUnit(doc, absStart, absEnd, body);
  }

  return null;
}

interface JsonStringHit {
  start: number;
  end: number;
  unquoted: string;
  isKey: boolean;
}

function jsonStringAt(text: string, offset: number, json5: boolean): JsonStringHit | null {
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"') {
      const parsed = readJsonString(text, i, '"');
      if (!parsed) break;
      if (offset >= parsed.start && offset < parsed.end) {
        const after = skipWs(text, parsed.end);
        const isKey = text[after] === ':';
        return { ...parsed, isKey };
      }
      i = parsed.end;
      continue;
    }
    if (json5 && c === "'") {
      const parsed = readJsonString(text, i, "'");
      if (!parsed) break;
      if (offset >= parsed.start && offset < parsed.end) {
        const after = skipWs(text, parsed.end);
        const isKey = text[after] === ':';
        return { ...parsed, isKey };
      }
      i = parsed.end;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end < 0 ? text.length : end + 2;
      continue;
    }
    if (c === '/' && text[i + 1] === '/') {
      i = text.indexOf('\n', i);
      if (i < 0) break;
      continue;
    }
    i++;
  }
  return null;
}

function readJsonString(
  text: string,
  start: number,
  quote: '"' | "'",
): { start: number; end: number; unquoted: string } | null {
  let i = start + 1;
  let raw = '';
  while (i < text.length) {
    const c = text[i];
    if (c === '\\') {
      raw += c + (text[i + 1] ?? '');
      i += 2;
      continue;
    }
    if (c === quote) {
      const body = stripConfigKeyQuotes(text.slice(start, i + 1));
      return { start, end: i + 1, unquoted: body };
    }
    raw += c;
    i++;
  }
  return null;
}

function json5BareKeyAt(
  doc: DocumentSnapshot,
  text: string,
  offset: number,
  configKeys: boolean,
): TextUnit | null {
  if (!configKeys) return null;
  const re = /(^|[,{]\s*)([A-Za-z_][\w$-]*)(\s*):/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const keyStart = m.index + m[1].length;
    const keyEnd = keyStart + m[2].length;
    if (offset >= keyStart && offset < keyEnd) {
      return keyUnit(doc, keyStart, keyEnd, m[2]);
    }
  }
  return null;
}

function xmlNameAt(line: string, col: number): { start: number; end: number } | null {
  const tag = line.match(/<\s*\/?\s*([\w:.-]+)/);
  if (tag) {
    const start = line.indexOf(tag[1]);
    if (col >= start && col < start + tag[1].length) {
      return { start, end: start + tag[1].length };
    }
  }
  const re = /(?:\s|^)([\w:.-]+)\s*=\s*["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const start = m.index + m[0].indexOf(m[1]);
    const end = start + m[1].length;
    if (col >= start && col < end) return { start, end };
  }
  return null;
}

function xmlTextNodeAt(line: string, col: number): { start: number; end: number } | null {
  const close = line.lastIndexOf('>', col);
  if (close < 0) return null;
  const open = line.indexOf('<', close + 1);
  const start = close + 1;
  const end = open < 0 ? line.length : open;
  if (col < start || col >= end) return null;
  if (!line.slice(start, end).trim()) return null;
  return { start, end };
}

function quotedStringOnLine(line: string, col: number): { start: number; end: number } | null {
  let i = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === '"' || c === "'") {
      const start = i;
      i++;
      while (i < line.length) {
        if (line[i] === '\\') {
          i += 2;
          continue;
        }
        if (line[i] === c) {
          i++;
          break;
        }
        i++;
      }
      if (col >= start && col < i) return { start, end: i };
      continue;
    }
    i++;
  }
  return null;
}

function blockCommentAt(
  text: string,
  offset: number,
  open: string,
  close: string,
): { start: number; end: number } | null {
  const before = text.slice(0, offset);
  const start = before.lastIndexOf(open);
  if (start < 0) return null;
  const end = text.indexOf(close, start);
  if (end < 0 || offset > end + close.length) return null;
  return { start, end: end + close.length };
}

function skipWs(text: string, i: number): number {
  while (i < text.length && /\s/.test(text[i])) i++;
  return i;
}

function commentUnit(
  doc: DocumentSnapshot,
  start: number,
  end: number,
  raw: string,
  prefix: string,
): TextUnit {
  const body = raw.replace(new RegExp(`^${escapeReg(prefix)}\\s?`), '').trim();
  const p = protect(body);
  return {
    kind: 'lineComment',
    range: { start, end },
    rawText: doc.getText().slice(start, end),
    text: p.text,
    placeholders: p.placeholders,
    languageId: doc.languageId,
    source: 'regex',
  };
}

function stringValueUnit(doc: DocumentSnapshot, start: number, end: number, raw: string): TextUnit {
  const quoted =
    (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"));
  const body = quoted ? stripConfigKeyQuotes(raw) : raw;
  const p = protect(body);
  return {
    kind: 'string',
    range: { start, end },
    rawText: doc.getText().slice(start, end),
    text: p.text,
    placeholders: p.placeholders,
    languageId: doc.languageId,
    source: 'regex',
  };
}

function keyUnit(doc: DocumentSnapshot, start: number, end: number, rawKey: string): TextUnit {
  const ident = stripConfigKeyQuotes(rawKey.trim());
  const words = splitConfigIdentifier(ident);
  return {
    kind: 'configKey',
    range: { start, end },
    rawText: doc.getText().slice(start, end),
    text: words || ident,
    placeholders: [],
    languageId: doc.languageId,
    source: 'regex',
  };
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** @deprecated use extractConfigRegexHoverAt */
export const extractYamlHoverAt = extractYamlLineAt;

/** @deprecated use extractConfigRegexHoverAt */
export function extractConfigKeyAt(doc: DocumentSnapshot, offset: number): TextUnit | null {
  return extractConfigRegexHoverAt(doc, offset, true);
}
