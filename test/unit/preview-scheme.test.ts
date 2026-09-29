import { describe, expect, it } from 'vitest';
import { PREVIEW_SCHEME } from '../../src/constants/previewScheme';
import { formatDocumentPreviewUriPath } from '../../src/document/previewUriFormat';
import { canTranslateWholeDocument } from '../../src/document/documentEligibility';

describe('document preview scheme', () => {
  it('formatDocumentPreviewUriPath uses PREVIEW_SCHEME (same as registered provider)', () => {
    const formatted = formatDocumentPreviewUriPath('/proj/README.md', 'file:///proj/README.md', 'zh-CN');
    expect(formatted.startsWith(`${PREVIEW_SCHEME}:/`)).toBe(true);
    expect(formatted).toContain('lang=zh-CN');
  });

  it('preview virtual documents are not eligible for whole-document translation', () => {
    const previewDoc = {
      uri: { scheme: PREVIEW_SCHEME, path: '/README.zh-CN.preview.md' },
      languageId: 'markdown',
      fileName: 'README.zh-CN.preview.md',
    } as import('vscode').TextDocument;
    expect(canTranslateWholeDocument(previewDoc)).toBe(false);
  });
});
