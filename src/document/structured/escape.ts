import type { StructuredEscapeKind, YamlBlockMeta } from './types';
import {
  buildBlockHeader,
  encodeYamlBlockPhysicalLines,
  foldedNeedsLiteralBlock,
  needsExplicitIndentIndicator,
  blockStripWidth,
  keepBlockBodyPhysicalSuffix,
} from './yamlBlockEncode';

export interface StructuredReplacementMeta {
  escape: StructuredEscapeKind;
  decoded: string;
  sourceLiteral: string;
  yamlBlock?: YamlBlockMeta;
  xmlAttrQuote?: "'" | '"';
  valueStart: number;
  valueEnd: number;
}

function escapeYamlDouble(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function needsYamlPlainQuoting(text: string): boolean {
  if (!text) return true;
  if (/^[\s#:&*!|>'"%@`]|[-?]/.test(text)) return true;
  if (/[:\s#]/.test(text)) return true;
  if (text.includes('\n')) return true;
  return false;
}

function encodeTomlBasic(text: string): string {
  let out = '';
  for (const ch of text) {
    if (ch === '\\') out += '\\\\';
    else if (ch === '"') out += '\\"';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (ch === '\b') out += '\\b';
    else if (ch === '\f') out += '\\f';
    else if (ch.charCodeAt(0) < 0x20) {
      out += `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`;
    } else out += ch;
  }
  return out;
}

const XML_ENTITY_RE = /&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/g;

function encodeXmlText(text: string): string {
  const parts: string[] = [];
  let last = 0;
  for (const m of text.matchAll(XML_ENTITY_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) {
      parts.push(escapeXmlRaw(text.slice(last, idx)));
    }
    parts.push(m[0]);
    last = idx + m[0].length;
  }
  if (last < text.length) parts.push(escapeXmlRaw(text.slice(last)));
  return parts.join('');
}

function escapeXmlRaw(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function encodeXmlAttrWhitespace(text: string): string {
  return text.replace(/\t/g, '&#9;').replace(/\n/g, '&#10;').replace(/\r/g, '&#13;');
}

function encodeXmlAttrDouble(text: string): string {
  return encodeXmlAttrWhitespace(encodeXmlText(text)).replace(/"/g, '&quot;');
}

function encodeXmlAttrSingle(text: string): string {
  return encodeXmlAttrWhitespace(encodeXmlText(text)).replace(/'/g, '&apos;');
}

function yamlBlockNeedsQuotedFallback(text: string, block: YamlBlockMeta): boolean {
  if (!blockStripWidth(block) && text.includes('\n')) return true;
  return false;
}

function encodeYamlBlockBody(text: string, decoded: string, sourceLiteral: string, block: YamlBlockMeta): string {
  if (text === decoded) return sourceLiteral;

  const asLiteral = !block.folded || foldedNeedsLiteralBlock(text);
  let body = encodeYamlBlockPhysicalLines(block, text, asLiteral);

  body = body.replace(/\n+$/, '');
  if (block.chomp === 'keep') {
    body += keepBlockBodyPhysicalSuffix(block, decoded);
  }

  return body;
}

function yamlBlockHeaderRewrite(
  block: YamlBlockMeta,
  text: string,
): { rewrite: boolean; block: YamlBlockMeta; header: string } {
  const toLiteral = block.folded && foldedNeedsLiteralBlock(text);
  let workBlock: YamlBlockMeta = toLiteral ? { ...block, folded: false } : block;
  const needIndent = needsExplicitIndentIndicator(workBlock, text);
  if (!needIndent && !toLiteral) {
    return { rewrite: false, block: workBlock, header: '' };
  }
  if (needIndent) {
    workBlock = { ...workBlock, indentIndicator: blockStripWidth(workBlock) };
  }
  const includeDigit = needIndent || workBlock.indentIndicator != null;
  return {
    rewrite: true,
    block: workBlock,
    header: buildBlockHeader(workBlock, includeDigit),
  };
}

/** Replacement bytes for replaceRange (identity when text === decoded). */
export function encodeStructuredReplacement(
  escape: StructuredEscapeKind,
  text: string,
  decoded: string,
  sourceLiteral: string,
  meta?: Pick<StructuredReplacementMeta, 'yamlBlock' | 'xmlAttrQuote'>,
): string {
  if (text === decoded) return sourceLiteral;

  switch (escape) {
    case 'json':
      return JSON.stringify(text).slice(1, -1);
    case 'yaml-double':
      return `"${escapeYamlDouble(text)}"`;
    case 'yaml-single':
      if (text.includes('\n') || text.includes('"')) return `"${escapeYamlDouble(text)}"`;
      return `'${text.replace(/'/g, "''")}'`;
    case 'yaml-plain':
      if (needsYamlPlainQuoting(text)) return `"${escapeYamlDouble(text)}"`;
      return text;
    case 'yaml-block': {
      const block = meta?.yamlBlock;
      if (!block) return text;
      return encodeYamlBlockBody(text, decoded, sourceLiteral, block);
    }
    case 'toml-basic':
      return encodeTomlBasic(text);
    case 'toml-basic-full':
      return `"${encodeTomlBasic(text)}"`;
    case 'toml-literal':
      if (text.includes("'") || text.includes('\n') || text.includes('\r')) return `"${encodeTomlBasic(text)}"`;
      return `'${text}'`;
    case 'toml-ml-literal':
      if (text.includes("'")) return `"${encodeTomlBasic(text)}"`;
      return `'''${text}'''`;
    case 'toml-ml-basic':
      return encodeTomlBasic(text);
    case 'xml-text':
      return encodeXmlText(text);
    case 'xml-attr-single':
      return encodeXmlAttrSingle(text);
    case 'xml-attr-double':
      return encodeXmlAttrDouble(text);
    default:
      return text;
  }
}

/** Resolve replacement range and literal (YAML block may fall back to a quoted full scalar). */
export function buildStructuredReplacement(
  meta: StructuredReplacementMeta,
  text: string,
): { start: number; end: number; literal: string } {
  if (text === meta.decoded) {
    return { start: meta.valueStart, end: meta.valueEnd, literal: meta.sourceLiteral };
  }

  if (meta.escape === 'yaml-block' && meta.yamlBlock) {
    if (yamlBlockNeedsQuotedFallback(text, meta.yamlBlock)) {
      let literal = `"${escapeYamlDouble(text)}"`;
      if (meta.yamlBlock.scalarEndsWithNewline) literal += '\n';
      return {
        start: meta.yamlBlock.scalarStart,
        end: meta.yamlBlock.scalarEnd,
        literal,
      };
    }
    const block = meta.yamlBlock;
    const headerPlan = yamlBlockHeaderRewrite(block, text);
    const literal = encodeYamlBlockBody(
      text,
      meta.decoded,
      meta.sourceLiteral,
      headerPlan.block,
    );
    if (headerPlan.rewrite) {
      return {
        start: block.scalarStart,
        end: block.bodyEnd,
        literal: `${headerPlan.header}\n${literal}`,
      };
    }
    return { start: block.bodyStart, end: block.bodyEnd, literal };
  }

  const literal = encodeStructuredReplacement(
    meta.escape,
    text,
    meta.decoded,
    meta.sourceLiteral,
    meta,
  );
  return { start: meta.valueStart, end: meta.valueEnd, literal };
}

/** @deprecated use encodeStructuredReplacement */
export function escapeStructuredInnerText(text: string, kind: StructuredEscapeKind): string {
  return encodeStructuredReplacement(kind, text, '', '');
}
