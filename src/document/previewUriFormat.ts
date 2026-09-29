import { PREVIEW_SCHEME } from '../constants/previewScheme';

export function formatDocumentPreviewUriPath(
  sourcePath: string,
  sourceUriString: string,
  lang: string,
): string {
  const name = sourcePath.split('/').pop() ?? 'doc.md';
  const base = name.replace(/\.[^.]+$/, '') + `.${lang}.preview.md`;
  return `${PREVIEW_SCHEME}:/${base}?source=${encodeURIComponent(sourceUriString)}&lang=${lang}`;
}
