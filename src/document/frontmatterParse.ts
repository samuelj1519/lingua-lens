import { decide } from '../detection/LanguageDetector';
import type { TranslateConfig } from '../config/types';

export const DEFAULT_FRONTMATTER_FIELDS = [
  'description',
  'title',
  'summary',
  'subtitle',
  'excerpt',
  'about',
];

export const FRONTMATTER_FIELD_LABELS: Record<string, string> = {
  description: '描述',
  title: '标题',
  summary: '摘要',
  subtitle: '副标题',
  excerpt: '摘录',
  about: '关于',
};

export interface FrontmatterBlock {
  fence: '---' | '+++';
  start: number;
  end: number;
  bodyStart: number;
  bodyEnd: number;
}

export interface ParsedFrontmatterField {
  key: string;
  valueText: string;
  valueRange: { start: number; end: number };
  insertAfter: number;
}

export function detectFrontmatterBlock(source: string): FrontmatterBlock | null {
  if (!source.startsWith('---') && !source.startsWith('+++')) return null;
  const fence = source.startsWith('+++') ? '+++' : '---';
  const openEnd = source.indexOf('\n');
  if (openEnd < 0) return null;
  const closeIdx = source.indexOf(`\n${fence}`, openEnd + 1);
  if (closeIdx < 0) return null;
  const end = closeIdx + 1 + fence.length;
  const tail = source[end] === '\r' ? end + 2 : source[end] === '\n' ? end + 1 : end;
  return {
    fence: fence as '---' | '+++',
    start: 0,
    end: tail,
    bodyStart: openEnd + 1,
    bodyEnd: closeIdx,
  };
}

export function parseFrontmatterFields(
  source: string,
  block: FrontmatterBlock,
): ParsedFrontmatterField[] {
  const body = source.slice(block.bodyStart, block.bodyEnd);
  const base = block.bodyStart;
  const fields: ParsedFrontmatterField[] = [];
  const lines = body.split('\n');
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = base + offset;
    const keyMatch = line.match(/^([\w.-]+)\s*:\s*(.*)$/);
    if (!keyMatch) {
      offset += line.length + 1;
      continue;
    }
    const key = keyMatch[1];
    const rest = keyMatch[2];
    const valueStartOnLine = line.indexOf(':') + 1 + (line.slice(line.indexOf(':') + 1).match(/^\s*/)?.[0]?.length ?? 0);

    if (rest === '|' || rest === '>' || rest === '|+' || rest === '|-') {
      const contentLines: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const nl = lines[j];
        if (nl.trim() === '') {
          contentLines.push('');
          j++;
          continue;
        }
        if (/^[\w.-]+\s*:/.test(nl) && !/^\s/.test(nl)) break;
        contentLines.push(nl);
        j++;
      }
      let content = contentLines.join('\n').replace(/\n+$/, '');
      const indentMatch = content.match(/^[ \t]+/m);
      if (indentMatch) {
        const indent = indentMatch[0];
        content = content
          .split('\n')
          .map((l) => (l.startsWith(indent) ? l.slice(indent.length) : l))
          .join('\n');
      }
      const blockEnd = base + offset + line.length + 1 + contentLines.join('\n').length + (contentLines.length ? 1 : 0);
      fields.push({
        key,
        valueText: content,
        valueRange: { start: lineStart + valueStartOnLine, end: blockEnd },
        insertAfter: blockEnd,
      });
      offset += lines.slice(i, j).join('\n').length + 1;
      i = j - 1;
      continue;
    }

    const quoted = parseQuotedScalar(rest);
    const valueText = quoted.text;
    const valueStart = lineStart + valueStartOnLine + quoted.valueOffset;
    const valueEnd = valueStart + valueText.length;
    const insertAfter = lineStart + line.length;
    fields.push({ key, valueText, valueRange: { start: valueStart, end: valueEnd }, insertAfter });
    offset += line.length + 1;
  }
  return fields;
}

function parseQuotedScalar(rest: string): { text: string; valueOffset: number } {
  const t = rest.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return { text: t.slice(1, -1), valueOffset: rest.indexOf(t[0]) + 1 };
  }
  return { text: t, valueOffset: rest.indexOf(t) };
}

export function isNonNaturalLanguageValue(text: string, key: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/^(true|false|null|yes|no)$/i.test(t)) return true;
  if (/^-?\d+(\.\d+)?$/.test(t)) return true;
  if (/^https?:\/\//i.test(t)) return true;
  if (/^[./~]/.test(t) || /^[\w.-]+\/[\w./-]+$/.test(t)) return true;
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return true;
  if (key === 'name' || key === 'id') return true;
  if (/^[\w-]+$/.test(t) && t.length < 48 && !/\s/.test(t)) return true;
  return false;
}

export function shouldTranslateFrontmatterField(
  field: ParsedFrontmatterField,
  whitelist: string[],
  cfg: Pick<TranslateConfig, 'targetLanguage' | 'detection' | 'privacy'>,
): boolean {
  if (!whitelist.length) return false;
  if (!whitelist.includes(field.key.toLowerCase())) return false;
  if (isNonNaturalLanguageValue(field.valueText, field.key)) return false;
  const det = decide(field.valueText, {
    target: cfg.targetLanguage,
    minLength: cfg.detection.minLength,
    targetRatio: cfg.detection.targetRatio,
    reliableMinLength: cfg.detection.reliableMinLength,
    strictChineseVariant: cfg.detection.strictChineseVariant,
    userSkipPatterns: cfg.detection.skipPatterns.map((p) => new RegExp(p)),
    blockSecrets: cfg.privacy.blockSecrets,
  });
  return det.action === 'translate';
}

export function formatFrontmatterYamlComments(fieldKey: string, translation: string): string {
  const label = FRONTMATTER_FIELD_LABELS[fieldKey.toLowerCase()] ?? fieldKey;
  const lines = translation.split('\n');
  if (lines.length === 1) return `# ${label}：${lines[0]}`;
  return [`# ${label}：${lines[0]}`, ...lines.slice(1).map((l) => (l ? `# ${l}` : '#'))].join('\n');
}
