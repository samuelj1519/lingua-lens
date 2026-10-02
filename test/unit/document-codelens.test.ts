import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => {
  class Range {
    constructor(
      public readonly startLine: number,
      public readonly startCharacter: number,
      public readonly endLine: number,
      public readonly endCharacter: number,
    ) {}
  }
  class CodeLens {
    constructor(
      public readonly range: Range,
      public readonly command?: { title: string; command: string; arguments: unknown[] },
    ) {}
  }
  class EventEmitter<T> {
    event = () => ({ dispose: () => {} });
    fire(_e: T): void {}
  }
  return { Range, CodeLens, EventEmitter };
});

vi.mock('../../src/l10n/uiL10n', () => ({
  t: (key: string) => key,
}));

import { DocumentCodeLensProvider } from '../../src/document/DocumentCodeLensProvider';
import { PREVIEW_SCHEME } from '../../src/constants/previewScheme';
import {
  DOCUMENT_TRANSLATE_CODE_LENS_SELECTORS,
  isWholeDocumentTranslationSupported,
} from '../../src/document/documentTranslateSupport';
import type { ConfigService } from '../../src/config/ConfigService';

function mockDoc(
  opts: { scheme?: string; languageId: string; fileName: string },
): import('vscode').TextDocument {
  const path = `/proj/${opts.fileName}`;
  const scheme = opts.scheme ?? 'file';
  return {
    uri: {
      scheme,
      path,
      fsPath: path,
      toString: () => `${scheme}://${path}`,
    },
    languageId: opts.languageId,
    fileName: opts.fileName,
  } as import('vscode').TextDocument;
}

function mockConfig(codeLens: boolean): ConfigService {
  return {
    get: () =>
      ({
        enabled: true,
        document: { codeLens },
      }) as ReturnType<ConfigService['get']>,
  } as ConfigService;
}

describe('document CodeLens', () => {
  const provider = new DocumentCodeLensProvider(mockConfig(true));

  it('registers selectors for structured formats and extension patterns', () => {
    const langs = DOCUMENT_TRANSLATE_CODE_LENS_SELECTORS.filter((s) => 'language' in s && s.language).map(
      (s) => (s as { language: string }).language,
    );
    expect(langs).toContain('toml');
    expect(langs).toContain('yaml');
    expect(DOCUMENT_TRANSLATE_CODE_LENS_SELECTORS.some((s) => s.pattern === '**/*.yml')).toBe(true);
    expect(DOCUMENT_TRANSLATE_CODE_LENS_SELECTORS.some((s) => s.pattern === '**/*.plist')).toBe(true);
  });

  const eligibleCases = [
    { languageId: 'markdown', fileName: 'README.md' },
    { languageId: 'toml', fileName: 'Cargo.toml' },
    { languageId: 'yaml', fileName: 'config.yaml' },
    { languageId: 'json', fileName: 'package.json' },
    { languageId: 'jsonc', fileName: 'tsconfig.jsonc' },
    { languageId: 'xml', fileName: 'strings.xml' },
    { languageId: 'xml', fileName: 'Info.plist' },
    { languageId: 'plaintext', fileName: 'notes.yml' },
  ] as const;

  for (const { languageId, fileName } of eligibleCases) {
    it(`returns lenses for ${languageId} / ${fileName}`, () => {
      const doc = mockDoc({ languageId, fileName });
      expect(isWholeDocumentTranslationSupported(doc)).toBe(true);
      const lenses = provider.provideCodeLenses(doc, { isCancellationRequested: false } as never);
      expect(lenses.length).toBe(3);
      expect(lenses[0]?.command?.command).toBe('linguaLens.translateDocument');
    });
  }

  it('returns no lenses when document.codeLens is disabled', () => {
    const off = new DocumentCodeLensProvider(mockConfig(false));
    const doc = mockDoc({ languageId: 'toml', fileName: 'x.toml' });
    expect(off.provideCodeLenses(doc, { isCancellationRequested: false } as never)).toEqual([]);
  });

  it('returns no lenses for TypeScript sources', () => {
    const doc = mockDoc({ languageId: 'typescript', fileName: 'app.ts' });
    expect(isWholeDocumentTranslationSupported(doc)).toBe(false);
    expect(provider.provideCodeLenses(doc, { isCancellationRequested: false } as never)).toEqual([]);
  });

  it('returns no lenses for lingualens preview scheme', () => {
    const doc = mockDoc({
      scheme: PREVIEW_SCHEME,
      languageId: 'markdown',
      fileName: 'README.preview.md',
    });
    expect(isWholeDocumentTranslationSupported(doc)).toBe(false);
    expect(provider.provideCodeLenses(doc, { isCancellationRequested: false } as never)).toEqual([]);
  });
});
