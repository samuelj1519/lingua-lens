import * as vscode from 'vscode';
import { BilingualRenderer } from './BilingualRenderer';
import type { DocSession } from './DocTranslationService';
import type { PreviewStyle } from './DocumentAssembler';

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
      return '预览已失效，请重新执行「AI Translate: 翻译文档 (双语预览)」命令。';
    }
    return this.renderer.renderBilingual(session.sourceText, session, this.previewStyle);
  }
}
