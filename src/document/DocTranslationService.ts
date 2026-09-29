import * as vscode from 'vscode';
import type { ConfigService } from '../config/ConfigService';
import type { PrivacyGuard } from '../privacy/PrivacyGuard';
import type { Segment, TargetLang } from '../types';
import type { TranslationService } from '../translation/TranslationService';
import { BilingualRenderer } from './BilingualRenderer';
import { MarkdownSegmenter } from './MarkdownSegmenter';
import { PlainTextSegmenter } from './PlainTextSegmenter';
import type { PreviewContentProvider } from './PreviewContentProvider';
import { SideFileWriter } from './SideFileWriter';
import { canTranslateWholeDocument } from './documentEligibility';
import { validateAndFallbackContainers } from './containerPostProcess';

export interface DocSession {
  sourceUri: vscode.Uri;
  previewUri: vscode.Uri;
  target: TargetLang;
  sourceVersion: number;
  sourceLabel: string;
  segments: Segment[];
  results: Map<string, { status: 'pending' | 'done' | 'failed'; text?: string; error?: string }>;
  cts: vscode.CancellationTokenSource;
  doneCount: number;
  totalTranslatable: number;
  sourceText: string;
}

export class DocTranslationService {
  private readonly sessions = new Map<string, DocSession>();
  private readonly md = new MarkdownSegmenter();
  private readonly plain = new PlainTextSegmenter();
  private readonly renderer = new BilingualRenderer();
  readonly sideWriter = new SideFileWriter();

  constructor(
    private readonly config: ConfigService,
    private readonly guard: PrivacyGuard,
    private readonly translation: TranslationService,
    private readonly preview: PreviewContentProvider,
  ) {}

  getSession(previewUri: vscode.Uri): DocSession | undefined {
    return this.sessions.get(previewUri.toString());
  }

  previewUriFor(source: vscode.Uri, lang: TargetLang): vscode.Uri {
    const name = source.path.split('/').pop() ?? 'doc.md';
    const base = name.replace(/\.[^.]+$/, '') + `.${lang}.preview.md`;
    return vscode.Uri.parse(`aitranslate:/${base}?source=${encodeURIComponent(source.toString())}&lang=${lang}`);
  }

  async openPreview(doc: vscode.TextDocument): Promise<void> {
    if (!canTranslateWholeDocument(doc)) {
      void vscode.window.showWarningMessage('整篇翻译仅支持 Markdown / 纯文本；配置文件请使用悬停翻译。');
      return;
    }
    const block = this.guard.check(doc);
    if (block === 'excluded') {
      void vscode.window.showWarningMessage('该文件已被排除');
      return;
    }
    if (block) {
      if (block === 'noAck') {
        if (!(await this.guard.ensureAcknowledged(true))) return;
      } else if (block === 'disabled') {
        void vscode.window.showWarningMessage('AI Translate 已禁用');
        return;
      }
    }
    const cfg = this.config.get(doc.uri);
    const previewUri = this.previewUriFor(doc.uri, cfg.targetLanguage);
    await this.startSession(doc, previewUri, cfg.targetLanguage);
    await vscode.window.showTextDocument(previewUri, {
      viewColumn: vscode.ViewColumn.Beside,
      preview: true,
      preserveFocus: true,
    });
  }

  async refreshDocumentTranslation(doc: vscode.TextDocument): Promise<void> {
    const cfg = this.config.get(doc.uri);
    const previewUri = this.previewUriFor(doc.uri, cfg.targetLanguage);
    const session = this.sessions.get(previewUri.toString());
    if (!session) {
      void vscode.window.showInformationMessage('请先打开全文翻译预览');
      await this.openPreview(doc);
      return;
    }
    await this.refresh(previewUri, { bypassCache: true });
  }

  async refresh(previewUri: vscode.Uri, opts?: { bypassCache?: boolean }): Promise<void> {
    const session = this.sessions.get(previewUri.toString());
    if (!session) return;
    const doc = await vscode.workspace.openTextDocument(session.sourceUri);
    session.sourceVersion = doc.version;
    session.sourceText = doc.getText();
    session.segments = this.segment(doc);
    for (const seg of session.segments) {
      if (seg.kind !== 'preserved') session.results.set(seg.id, { status: 'pending' });
    }
    session.doneCount = 0;
    if (opts?.bypassCache) {
      await this.translation.invalidateDocumentSegmentCaches(
        session.segments,
        session.target,
        session.sourceUri,
      );
    }
    await this.runTranslation(session, session.sourceText);
  }

  async generateSideFile(doc: vscode.TextDocument): Promise<void> {
    const cfg = this.config.get(doc.uri);
    const previewUri = this.previewUriFor(doc.uri, cfg.targetLanguage);
    let session = this.sessions.get(previewUri.toString());
    if (!session) {
      await this.startSession(doc, previewUri, cfg.targetLanguage);
      session = this.sessions.get(previewUri.toString())!;
      await this.runTranslation(session, doc.getText(), true);
    } else if (session.doneCount < session.totalTranslatable) {
      await this.runTranslation(session, doc.getText(), true);
    }
    const content =
      cfg.document.sideFileContent === 'bilingual'
        ? this.renderer.renderBilingual(doc.getText(), session)
        : this.renderer.renderTranslated(doc.getText(), session);
    await this.sideWriter.write(doc.uri, content, cfg.targetLanguage, cfg.document.sideFileNamePattern);
  }

  private segment(doc: vscode.TextDocument): Segment[] {
    const text = doc.getText();
    const cfg = this.config.get(doc.uri);
    if (doc.languageId === 'markdown') {
      return this.md.segment(text, {
        targetLanguage: cfg.targetLanguage,
        detection: cfg.detection,
        privacy: cfg.privacy,
        markdown: cfg.markdown,
      });
    }
    return this.plain.segment(text);
  }

  private async startSession(doc: vscode.TextDocument, previewUri: vscode.Uri, target: TargetLang): Promise<void> {
    const segments = this.segment(doc);
    const results = new Map<string, { status: 'pending' | 'done' | 'failed'; text?: string; error?: string }>();
    const translatable = segments.filter((s) => s.kind !== 'preserved');
    for (const s of translatable) results.set(s.id, { status: 'pending' });
    const session: DocSession = {
      sourceUri: doc.uri,
      previewUri,
      target,
      sourceVersion: doc.version,
      sourceLabel: doc.fileName,
      segments,
      results,
      cts: new vscode.CancellationTokenSource(),
      doneCount: 0,
      totalTranslatable: results.size,
      sourceText: doc.getText(),
    };
    this.sessions.set(previewUri.toString(), session);
    this.preview.registerSession(session);
    await this.runTranslation(session, doc.getText());
  }

  private async runTranslation(session: DocSession, _source: string, waitComplete = false): Promise<void> {
    const items: {
      id: string;
      text: string;
      placeholders: import('../types').Placeholder[];
      batchCacheKind: 'documentBatch' | 'documentFrontmatterBatch';
    }[] = [];
    for (const seg of session.segments) {
      if (seg.kind === 'preserved') continue;
      items.push({
        id: seg.id,
        text: seg.sourceText,
        placeholders: seg.placeholders,
        batchCacheKind: seg.kind === 'frontmatter' ? 'documentFrontmatterBatch' : 'documentBatch',
      });
    }

    const cfg = this.config.get(session.sourceUri);
    const batches: typeof items[] = [];
    let batch: typeof items = [];
    let chars = 0;
    for (const item of items) {
      const kindClash = batch.length > 0 && batch[0].batchCacheKind !== item.batchCacheKind;
      if (
        kindClash ||
        batch.length >= cfg.document.batchSize ||
        chars + item.text.length > cfg.document.maxBatchChars
      ) {
        if (batch.length) batches.push(batch);
        batch = [];
        chars = 0;
      }
      batch.push(item);
      chars += item.text.length;
    }
    if (batch.length) batches.push(batch);

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'AI Translate', cancellable: true },
      async (progress, token) => {
        token.onCancellationRequested(() => session.cts.cancel());
        let done = 0;
        for (let i = 0; i < batches.length; i++) {
          if (token.isCancellationRequested || session.cts.token.isCancellationRequested) break;
          progress.report({ message: `正在翻译 ${session.sourceLabel}: ${i + 1}/${batches.length} 批` });
          const ac = new AbortController();
          session.cts.token.onCancellationRequested(() => ac.abort());
          const res = await this.translation.translateBatch(
            batches[i],
            session.target,
            ac.signal,
            session.sourceLabel,
            session.sourceUri,
          );
          for (const [id, r] of res) {
            if (r instanceof Error) {
              session.results.set(id, { status: 'failed', error: r.message });
            } else {
              session.results.set(id, { status: 'done', text: r.text });
              done++;
            }
          }
          session.doneCount = [...session.results.values()].filter((v) => v.status === 'done').length;
          this.preview.notify(session.previewUri);
        }
        await validateAndFallbackContainers(session, _source, this.translation, session.target);
        session.doneCount = [...session.results.values()].filter((v) => v.status === 'done').length;
        this.preview.notify(session.previewUri);
      },
    );
    if (waitComplete) {
      /* already waited */
    }
  }

  onClosePreview(uri: vscode.Uri): void {
    const session = this.sessions.get(uri.toString());
    if (session) {
      session.cts.cancel();
      this.sessions.delete(uri.toString());
    }
  }
}
