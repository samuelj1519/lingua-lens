import type { DocumentSnapshot, TextUnit, UnitKind } from '../types';
import { LANGUAGE_TO_FAMILY } from './languages/regexFamilies';
import { normalize } from './TextNormalizer';

export class RegexExtractor {
  extractAt(doc: DocumentSnapshot, offset: number): TextUnit | null {
    const family = LANGUAGE_TO_FAMILY[doc.languageId];
    if (!family) return null;
    const text = doc.getText();
    const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
    const lineEnd = text.indexOf('\n', offset);
    const lineEndIdx = lineEnd === -1 ? text.length : lineEnd;
    const line = text.slice(lineStart, lineEndIdx);
    const col = offset - lineStart;

    const stringHit = findStringInLine(line, col, family);
    if (stringHit) {
      const absStart = lineStart + stringHit.start;
      const absEnd = lineStart + stringHit.end;
      const raw = text.slice(absStart, absEnd);
      const norm = normalize('string', raw, doc.languageId);
      return {
        kind: 'string',
        range: { start: absStart, end: absEnd },
        rawText: raw,
        text: norm.text,
        placeholders: norm.placeholders,
        languageId: doc.languageId,
        source: 'regex',
      };
    }

    const commentHit = findLineComment(line, col, family);
    if (commentHit) {
      const merged = mergeAdjacentCommentLines(text, lineStart, family, commentHit.prefix);
      const raw = text.slice(merged.start, merged.end);
      const kind: UnitKind = commentHit.block ? 'blockComment' : 'lineComment';
      const norm = normalize(kind, raw, doc.languageId);
      return {
        kind,
        range: { start: merged.start, end: merged.end },
        rawText: raw,
        text: norm.text,
        placeholders: norm.placeholders,
        languageId: doc.languageId,
        source: 'regex',
      };
    }

    const block = findBlockComment(text, offset, family);
    if (block) {
      const raw = text.slice(block.start, block.end);
      const norm = normalize('blockComment', raw, doc.languageId);
      return {
        kind: 'blockComment',
        range: block,
        rawText: raw,
        text: norm.text,
        placeholders: norm.placeholders,
        languageId: doc.languageId,
        source: 'regex',
      };
    }
    return null;
  }
}

function linePrefix(family: string): string[] {
  switch (family) {
    case 'hash':
      return ['#'];
    case 'dashDash':
      return ['--'];
    case 'semicolon':
      return [';'];
    case 'percent':
      return ['%'];
    default:
      return ['//'];
  }
}

function findStringInLine(line: string, col: number, _family: string): { start: number; end: number } | null {
  let i = 0;
  let inStr: '"' | "'" | null = null;
  let start = -1;
  while (i < line.length) {
    const c = line[i];
    if (inStr) {
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === inStr) {
        if (col >= start && col <= i + 1) return { start, end: i + 1 };
        inStr = null;
      }
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      start = i;
      i++;
      continue;
    }
    i++;
  }
  return null;
}

function findLineComment(
  line: string,
  col: number,
  family: string,
): { start: number; end: number; prefix: string; block: boolean } | null {
  for (const p of linePrefix(family)) {
    const idx = line.indexOf(p);
    if (idx === -1) continue;
    const before = line.slice(0, idx);
    if (before.trim() && !before.endsWith(' ')) continue;
    const end = line.length;
    if (col >= idx && col <= end) return { start: idx, end, prefix: p, block: false };
  }
  if (family === 'cLike' || family === 'dashDash') {
    const idx = line.indexOf('//');
    if (idx >= 0 && col >= idx) {
      const before = line.slice(0, idx);
      if (!before.trim() || before.trim().length === before.length - idx) {
        return { start: idx, end: line.length, prefix: '//', block: false };
      }
    }
  }
  return null;
}

function mergeAdjacentCommentLines(
  text: string,
  lineStart: number,
  family: string,
  prefix: string,
): { start: number; end: number } {
  const lines = text.split('\n');
  let lineNo = text.slice(0, lineStart).split('\n').length - 1;
  let firstLine = lineNo;
  let lastLine = lineNo;

  const lineHasComment = (row: number): boolean => {
    const l = lines[row] ?? '';
    const idx = l.indexOf(prefix);
    if (idx < 0) return false;
    return l.slice(0, idx).trim() === '';
  };

  while (firstLine > 0 && lines[firstLine - 1]?.trim() !== '' && lineHasComment(firstLine - 1)) {
    if (linePrefix(family)[0] !== prefix && !lines[firstLine - 1]?.includes(prefix)) break;
    firstLine--;
  }
  while (lastLine < lines.length - 1 && lines[lastLine + 1]?.trim() !== '' && lineHasComment(lastLine + 1)) {
    lastLine++;
  }

  return { start: lineStartOf(text, firstLine), end: lineEndOf(text, lastLine) };

  function lineStartOf(full: string, row: number): number {
    const parts = full.split('\n');
    let off = 0;
    for (let i = 0; i < row; i++) off += parts[i].length + 1;
    return off;
  }
  function lineEndOf(full: string, row: number): number {
    const parts = full.split('\n');
    let off = 0;
    for (let i = 0; i <= row; i++) off += parts[i].length + (i < row ? 1 : 0);
    return off;
  }
}

function findBlockComment(text: string, offset: number, family: string): { start: number; end: number } | null {
  const open = family === 'xml' ? '<!--' : '/*';
  const close = family === 'xml' ? '-->' : '*/';
  const before = text.slice(0, offset);
  const start = before.lastIndexOf(open);
  if (start < 0) return null;
  const end = text.indexOf(close, start);
  if (end < 0 || offset > end + close.length) return null;
  return { start, end: end + close.length };
}
