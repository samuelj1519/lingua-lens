import type { DocumentSnapshot, TextUnit } from '../types';
import { splitConfigIdentifier, stripConfigKeyQuotes } from './configKey';
import { CONFIG_KEY_LANGUAGE_IDS } from './languages/configLanguages';
import { protect } from './placeholders';

/** Regex fallback when tree-sitter yaml grammar is unavailable or misses a scalar. */
export function extractYamlHoverAt(
  doc: DocumentSnapshot,
  offset: number,
  configKeys: boolean,
): TextUnit | null {
  if (doc.languageId !== 'yaml') return null;
  const text = doc.getText();
  const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
  const lineEnd = text.indexOf('\n', offset);
  const lineEndIdx = lineEnd === -1 ? text.length : lineEnd;
  const line = text.slice(lineStart, lineEndIdx);
  const col = offset - lineStart;

  const hash = line.indexOf('#');
  if (hash >= 0 && col >= hash) {
    const start = lineStart + hash;
    const end = lineEndIdx;
    const raw = text.slice(start, end);
    const body = raw.replace(/^#\s?/, '').trim();
    if (!body) return null;
    const p = protect(body);
    return {
      kind: 'lineComment',
      range: { start, end },
      rawText: raw,
      text: p.text,
      placeholders: p.placeholders,
      languageId: doc.languageId,
      source: 'regex',
    };
  }

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
    const quoted =
      (valRaw.startsWith('"') && valRaw.endsWith('"')) || (valRaw.startsWith("'") && valRaw.endsWith("'"));
    const body = quoted ? stripConfigKeyQuotes(valRaw) : valRaw;
    const p = protect(body);
    return {
      kind: 'string',
      range: { start: valStart, end: valEnd },
      rawText: text.slice(valStart, valEnd),
      text: p.text,
      placeholders: p.placeholders,
      languageId: doc.languageId,
      source: 'regex',
    };
  }
  return null;
}

/** Regex fallback for config keys in ini/properties and similar (comments/strings use RegexExtractor). */
export function extractConfigKeyAt(
  doc: DocumentSnapshot,
  offset: number,
): TextUnit | null {
  if (!CONFIG_KEY_LANGUAGE_IDS.has(doc.languageId)) return null;
  const text = doc.getText();
  const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
  const lineEnd = text.indexOf('\n', offset);
  const lineEndIdx = lineEnd === -1 ? text.length : lineEnd;
  const line = text.slice(lineStart, lineEndIdx);
  const col = offset - lineStart;

  const ini = line.match(/^(\s*)([^#;=\s][^=]*?)(\s*)=(\s*)(.*)$/);
  if (ini) {
    const keyStart = lineStart + ini[1].length;
    const keyEnd = keyStart + ini[2].length;
    if (offset >= keyStart && offset < keyEnd) {
      return keyUnit(doc, keyStart, keyEnd, ini[2]);
    }
  }

  if (doc.languageId === 'xml') {
    const attr = findXmlAttributeAt(line, col);
    if (attr?.inName) {
      const absStart = lineStart + attr.nameStart;
      const absEnd = lineStart + attr.nameEnd;
      return keyUnit(doc, absStart, absEnd, line.slice(attr.nameStart, attr.nameEnd));
    }
  }

  return null;
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

function findXmlAttributeAt(
  line: string,
  col: number,
): { nameStart: number; nameEnd: number; inName: boolean } | null {
  const tag = line.match(/<\s*\/?\s*([\w:.-]+)/);
  if (!tag) return null;
  let i = line.indexOf(tag[1]);
  if (col >= i && col < i + tag[1].length) {
    return { nameStart: i, nameEnd: i + tag[1].length, inName: true };
  }
  const re = /\s([\w:.-]+)\s*=\s*["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const nameStart = m.index + m[0].indexOf(m[1]);
    const nameEnd = nameStart + m[1].length;
    if (col >= nameStart && col < nameEnd) {
      return { nameStart, nameEnd, inName: true };
    }
  }
  return null;
}
