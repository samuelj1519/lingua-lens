export type ContainerKind = 'list' | 'table' | 'blockquote';

export function listItemLineCount(markdown: string): number {
  let n = 0;
  for (const line of markdown.split('\n')) {
    if (/^\s*([-*+]|\d+\.)\s/.test(line)) n++;
    else if (/^\s*[-*+]\s\[[ xX]\]\s/.test(line)) n++;
  }
  return n;
}

export function tableShape(markdown: string): { rows: number; cols: number } {
  const rows = markdown
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && !/^\|[\s:|-]+\|$/.test(l));
  const cols = rows[0] ? rows[0].split('|').filter((c) => c.trim().length > 0).length : 0;
  return { rows: rows.length, cols };
}

export function extractMarkdownUrls(markdown: string): string[] {
  const urls: string[] = [];
  const re = /\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown))) {
    urls.push(m[1]);
  }
  return urls;
}

export function inlineCodeSpanCount(markdown: string): number {
  const matches = markdown.match(/`[^`\n]+`/g);
  return matches?.length ?? 0;
}

export function maxListIndentDepth(markdown: string): number {
  let max = 0;
  for (const line of markdown.split('\n')) {
    const m = line.match(/^(\s*)(?:[-*+]|\d+\.)\s/);
    if (m) max = Math.max(max, m[1].length);
  }
  return max;
}

export function validateContainerTranslation(
  source: string,
  translated: string,
  kind: ContainerKind,
): boolean {
  if (!translated.trim()) return false;

  const srcUrls = extractMarkdownUrls(source);
  for (const u of srcUrls) {
    if (!translated.includes(u)) return false;
  }

  const srcCodes = inlineCodeSpanCount(source);
  const trCodes = inlineCodeSpanCount(translated);
  if (trCodes < srcCodes) return false;

  if (kind === 'list') {
    if (listItemLineCount(source) !== listItemLineCount(translated)) return false;
    if (maxListIndentDepth(source) !== maxListIndentDepth(translated)) return false;
    return true;
  }

  if (kind === 'table') {
    const a = tableShape(source);
    const b = tableShape(translated);
    return a.rows === b.rows && a.cols === b.cols;
  }

  if (kind === 'blockquote') {
    const srcLines = source.split('\n').filter((l) => l.trim().startsWith('>')).length;
    const trLines = translated.split('\n').filter((l) => l.trim().startsWith('>')).length;
    return srcLines > 0 && trLines === srcLines;
  }

  return true;
}
