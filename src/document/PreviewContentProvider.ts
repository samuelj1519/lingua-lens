import * as vscode from 'vscode';
import { t } from '../l10n/uiL10n';
import { BilingualRenderer } from './BilingualRenderer';
import type { DocSession } from './DocTranslationService';
import type { PreviewStyle } from './DocumentAssembler';
import { assembleStructuredTranslated } from './structured/applyReplacements';

export class PreviewContentProvider implements vscode.TextDocumentContentProvider {
  private readonly emitter = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this.emitter.event;
  private readonly sessions = new Map<string, DocSession>();
  private readonly renderer = new BilingualRenderer();
  private previewStyle: PreviewStyle = 'interleaved';
  private readonly pending = new Map<string, ReturnType<typeof setTimeout>>();

  registerSession(session: DocSession): void {
    this.sessions.set(session.previewUri.toString(), session);
  }

  setPreviewStyle(style: PreviewStyle): void {
    this.previewStyle = style;
  }

  refreshAll(): void {
    for (const key of this.sessions.keys()) {
      this.emitter.fire(vscode.Uri.parse(key));
    }
  }

  notify(uri: vscode.Uri): void {
    const key = uri.toString();
    const existing = this.pending.get(key);
    if (existing) clearTimeout(existing);
    this.pending.set(
      key,
      setTimeout(() => {
        this.pending.delete(key);
        this.emitter.fire(uri);
      }, 200),
    );
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    const session = this.sessions.get(uri.toString());
    if (!session) {
      return t('doc.previewExpired');
    }
    if (session.renderMode === 'structured') {
      return assembleStructuredTranslated(session.sourceText, session);
    }
    return this.renderer.renderBilingual(session.sourceText, session, this.previewStyle);
  }
}
