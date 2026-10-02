import type { YamlBlockMeta } from './types';

function splitTranslationLines(text: string): string[] {
  const lines = text.split('\n');
  if (!text.endsWith('\n') && lines.length > 1 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}

/** Indentation indicator digits in the block header (e.g. 2 in `|2`). */
export function blockStripWidth(block: YamlBlockMeta): number {
  if (block.indentIndicator != null) return block.indentIndicator;
  const w = block.contentIndent.length - block.headerKeyIndent;
  return w > 0 ? w : block.contentIndent.length;
}

export function yamlBlockBodyLinePrefix(block: YamlBlockMeta): string {
  if (block.indentIndicator != null) {
    return ' '.repeat(block.headerKeyIndent + blockStripWidth(block));
  }
  return block.contentIndent;
}

/** Only when the translation string begins with whitespace (incl. leading blank line). */
export function needsExplicitIndentIndicator(block: YamlBlockMeta, text: string): boolean {
  if (block.indentIndicator != null) return false;
  return /^[ \t]/.test(text) || text.startsWith('\n');
}

export function foldedNeedsLiteralBlock(text: string): boolean {
  if (!text.includes('\n')) return false;
  return /^[ \t]/.test(text) || text.startsWith('\n');
}

/** Trailing newlines preserved in the parsed value from the original block chomping. */
export function originalValueTrailingSuffix(block: YamlBlockMeta, decoded: string): string {
  if (block.chomp === 'strip') return '';
  if (block.chomp === 'keep') return decoded.match(/\n+$/)?.[0] ?? '';
  return decoded.endsWith('\n') ? '\n' : '';
}

/** Expected parsed scalar value: translation content + original chomping tail. */
export function expectedYamlBlockParsedValue(
  block: YamlBlockMeta,
  decoded: string,
  translation: string,
): string {
  const content = translation.replace(/\n+$/, '');
  const suffix = originalValueTrailingSuffix(block, decoded);
  if (content === '') {
    if (block.chomp === 'keep') return suffix;
    return '';
  }
  if (block.folded && !foldedNeedsLiteralBlock(translation)) {
    return content.replace(/\s*\n\s*/g, ' ') + suffix;
  }
  return content + suffix;
}

export function buildBlockHeader(block: YamlBlockMeta, includeIndentDigit: boolean): string {
  const style = block.folded ? '>' : '|';
  const chompSuffix = block.chomp === 'strip' ? '-' : block.chomp === 'keep' ? '+' : '';
  const digit =
    includeIndentDigit && (block.indentIndicator != null || blockStripWidth(block) > 0)
      ? String(block.indentIndicator ?? blockStripWidth(block))
      : '';
  return `${style}${digit}${chompSuffix}`;
}

/** Physical suffix inside the replace range so keep chomping matches decoded tail. */
export function keepBlockBodyPhysicalSuffix(
  block: YamlBlockMeta,
  decoded: string,
): string {
  const decodedTailNl = (decoded.match(/\n+$/) ?? [''])[0].length;
  const bodyTailNl = Math.max(0, decodedTailNl - block.trailingNewlinesOutsideBody);
  if (bodyTailNl === 0) return '';
  let suffix = '\n';
  const linePrefix = yamlBlockBodyLinePrefix(block);
  for (let i = 1; i < bodyTailNl; i++) {
    suffix += linePrefix + '\n';
  }
  return suffix;
}

export function encodeYamlBlockPhysicalLines(
  block: YamlBlockMeta,
  text: string,
  asLiteral: boolean,
): string {
  const content = text.replace(/\n+$/, '');
  const linePrefix = yamlBlockBodyLinePrefix(block);

  if (!asLiteral && block.folded) {
    const folded = content.replace(/\s*\n\s*/g, ' ');
    return linePrefix + folded;
  }

  const lines = splitTranslationLines(content);
  return lines.map((line) => linePrefix + line).join('\n');
}
