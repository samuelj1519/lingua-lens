import * as vscode from 'vscode';
import type { ConfigService } from '../config/ConfigService';
import { t } from '../l10n/uiL10n';
import {
  DOCUMENT_TRANSLATE_CODE_LENS_SELECTORS,
  isWholeDocumentTranslationSupported,
} from './documentTranslateSupport';

export class DocumentCodeLensProvider implements vscode.CodeLensProvider {
  private readonly onDidChangeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this.onDidChangeEmitter.event;

  constructor(private readonly config: ConfigService) {}

  refresh(): void {
    this.onDidChangeEmitter.fire();
  }

  provideCodeLenses(
    doc: vscode.TextDocument,
    _token: vscode.CancellationToken,
  ): vscode.CodeLens[] {
    const cfg = this.config.get(doc.uri);
    if (!cfg.document.codeLens || !cfg.enabled) return [];
    if (!isWholeDocumentTranslationSupported(doc)) return [];

    const top = new vscode.Range(0, 0, 0, 0);
    return [
      new vscode.CodeLens(top, {
        title: t('codelens.translatePreview'),
        command: 'linguaLens.translateDocument',
        arguments: [],
      }),
      new vscode.CodeLens(top, {
        title: t('codelens.generateSideFile'),
        command: 'linguaLens.generateSideFile',
        arguments: [],
      }),
      new vscode.CodeLens(top, {
        title: t('codelens.refreshDocument'),
        command: 'linguaLens.refreshDocumentTranslation',
        arguments: [],
      }),
    ];
  }
}

export function registerDocumentCodeLens(config: ConfigService): {
  disposable: vscode.Disposable;
  provider: DocumentCodeLensProvider;
} {
  const provider = new DocumentCodeLensProvider(config);
  const disposable = vscode.languages.registerCodeLensProvider(
    DOCUMENT_TRANSLATE_CODE_LENS_SELECTORS,
    provider,
  );
  return { disposable, provider };
}
