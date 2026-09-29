import * as vscode from 'vscode';
import type { ConfigService } from '../config/ConfigService';
import { canTranslateWholeDocument } from './documentEligibility';

export class DocumentCodeLensProvider implements vscode.CodeLensProvider {
  constructor(private readonly config: ConfigService) {}

  provideCodeLenses(
    doc: vscode.TextDocument,
    _token: vscode.CancellationToken,
  ): vscode.CodeLens[] {
    const cfg = this.config.get(doc.uri);
    if (!cfg.document.codeLens || !cfg.enabled) return [];
    if (!canTranslateWholeDocument(doc)) return [];

    const top = new vscode.Range(0, 0, 0, 0);
    return [
      new vscode.CodeLens(top, {
        title: '🌐 翻译全文（对照预览）',
        command: 'aiTranslate.translateDocument',
        arguments: [],
      }),
      new vscode.CodeLens(top, {
        title: '生成译文文件',
        command: 'aiTranslate.generateSideFile',
        arguments: [],
      }),
    ];
  }
}

export function registerDocumentCodeLens(config: ConfigService): vscode.Disposable {
  const provider = new DocumentCodeLensProvider(config);
  return vscode.languages.registerCodeLensProvider(
    [{ language: 'markdown' }, { language: 'plaintext' }],
    provider,
  );
}
