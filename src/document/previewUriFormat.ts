import { PREVIEW_SCHEME } from '../constants/previewScheme';

export function formatDocumentPreviewUriPath(
  sourcePath: string,
  sourceUriString: string,
  lang: string,
): string {
  const name = sourcePath.split('/').pop() ?? 'doc.md';
  const extMatch = name.match(/(\.[^.]+)$/);
  const ext = extMatch?.[1] ?? '.md';
  const base = name.replace(/\.[^.]+$/, '') + `.${lang}.preview${ext}`;
  return `${PREVIEW_SCHEME}:/${base}?source=${encodeURIComponent(sourceUriString)}&lang=${lang}`;
}
