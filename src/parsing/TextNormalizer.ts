import type { UnitKind } from '../types';
import type { Placeholder } from '../types';
import { protect, restore } from './placeholders';

export interface NormalizeResult {
  text: string;
  placeholders: Placeholder[];
}

export function normalize(kind: UnitKind, raw: string, _languageId: string): NormalizeResult {
  let body = raw;
  if (kind === 'lineComment') {
    body = stripLineComments(raw);
  } else if (kind === 'blockComment' || kind === 'docComment') {
    body = stripBlockComment(raw);
  } else if (kind === 'docstring') {
    body = stripPythonDocstring(raw);
  } else if (kind === 'string' || kind === 'templateString' || kind === 'rawString') {
    body = looksLikeQuotedCodeString(raw) ? stripStringLiteral(raw) : raw;
  } else if (kind === 'configKey') {
    body = raw.trim();
  }
  const protected_ = protect(body.trim());
  return protected_;
}

export { restore };

function stripLineComments(raw: string): string {
  return raw
    .split('\n')
    .map((line) => {
      const m = line.match(/^\s*(\/\/|\/\/\/|\/\/!|#|--|;|%)\s?(.*)$/);
      return m ? m[2] : line.replace(/^\s*\/\/\s?/, '');
    })
    .join('\n');
}

function stripBlockComment(raw: string): string {
  let t = raw.replace(/^\/\*+!?/, '').replace(/\*\/$/, '');
  return t
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, ''))
    .join('\n');
}

function stripPythonDocstring(raw: string): string {
  let t = raw.replace(/^[rubfRUBF]*/g, '');
  t = t.replace(/^"""|'''|"""|'''$/g, '');
  const lines = t.split('\n');
  const nonEmpty = lines.filter((l) => l.trim());
  if (nonEmpty.length === 0) return '';
  const indent = Math.min(...nonEmpty.map((l) => l.match(/^\s*/)?.[0].length ?? 0));
  return lines.map((l) => l.slice(indent)).join('\n').trim();
}

function looksLikeQuotedCodeString(raw: string): boolean {
  const t = raw.trimStart();
  return t.startsWith('"') || t.startsWith("'") || t.startsWith('`');
}

function stripStringLiteral(raw: string): string {
  let t = raw.trim();
  t = t.replace(/^[rubfRUBFLU@$]+/i, '');
  if (t.startsWith('`') && t.endsWith('`')) return t.slice(1, -1);
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1);
  }
  return t.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\'/g, "'");
}
