import { describe, expect, it } from 'vitest';
import { PREVIEW_SCHEME } from '../../src/constants/previewScheme';
import { isWholeDocumentTranslationSupported } from '../../src/document/documentTranslateSupport';

function doc(languageId: string, fileName: string, scheme = 'file'): import('vscode').TextDocument {
  const path = `/workspace/${fileName}`;
  return {
    uri: { scheme, path, toString: () => `${scheme}://${path}` },
    languageId,
    fileName,
  } as import('vscode').TextDocument;
}

describe('isWholeDocumentTranslationSupported', () => {
  const supported = [
    { languageId: 'toml', fileName: 'Cargo.toml' },
    { languageId: 'yaml', fileName: 'config.yaml' },
    { languageId: 'plaintext', fileName: 'docker-compose.yml' },
    { languageId: 'json', fileName: 'package.json' },
    { languageId: 'jsonc', fileName: 'tsconfig.jsonc' },
    { languageId: 'xml', fileName: 'Info.plist' },
    { languageId: 'markdown', fileName: 'README.md' },
    { languageId: 'plaintext', fileName: 'notes.txt' },
  ] as const;

  for (const { languageId, fileName } of supported) {
    it(`supports ${languageId} / ${fileName}`, () => {
      expect(isWholeDocumentTranslationSupported(doc(languageId, fileName))).toBe(true);
    });
  }

  it('rejects TypeScript sources', () => {
    expect(isWholeDocumentTranslationSupported(doc('typescript', 'app.ts'))).toBe(false);
  });

  it('rejects lingualens preview scheme', () => {
    expect(
      isWholeDocumentTranslationSupported(doc('markdown', 'README.preview.md', PREVIEW_SCHEME)),
    ).toBe(false);
  });
});
