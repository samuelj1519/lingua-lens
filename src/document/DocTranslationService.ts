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
import {
  buildDocumentTranslationPlan,
  type DocumentSegmentPlan,
} from './documentTranslationPlan';
import { translatePartialDocumentSegments } from './documentPartialTranslate';
import { isSameTranslationAsSource } from '../util/textEquivalence';
import { DocumentSegmentProgressReporter } from './DocumentSegmentProgressReporter';
import type { Placeholder } from '../types';
import { t } from '../l10n/uiL10n';

export type SegmentResultStatus = 'pending' | 'done' | 'failed' | 'skipped';

export interface DocSession {
  sourceUri: vscode.Uri;
  previewUri: vscode.Uri;
  target: TargetLang;
  sourceVersion: number;
  sourceLabel: string;
  segments: Segment[];
  plans: Map<string, DocumentSegmentPlan>;
  results: Map<string, { status: SegmentResultStatus; text?: string; error?: string }>;
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
      void vscode.window.showWarningMessage(t('doc.markdownOnly'));
      return;
    }
    const block = this.guard.check(doc);
    if (block === 'excluded') {
      void vscode.window.showWarningMessage(t('doc.fileExcluded'));
      return;
    }
    if (block) {
      if (block === 'noAck') {
        if (!(await this.guard.ensureAcknowledged(true))) return;
      } else if (block === 'disabled') {
        void vscode.window.showWarningMessage(t('doc.disabled'));
        return;
      }
    }
    const cfg = this.config.get(doc.uri);
    const segments = this.segment(doc);
    const { plans, translatableCount } = buildDocumentTranslationPlan(segments, doc.getText(), cfg);
    if (translatableCount === 0 && !cfg.document.forceTranslate) {
      void vscode.window.showInformationMessage(t('doc.alreadyTarget'));
      return;
    }
    const previewUri = this.previewUriFor(doc.uri, cfg.targetLanguage);
    await this.startSession(doc, previewUri, cfg.targetLanguage, segments, plans);
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
      void vscode.window.showInformationMessage(t('doc.openPreviewFirst'));
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
    const cfg = this.config.get(doc.uri);
    session.segments = this.segment(doc);
    const { plans, translatableCount } = buildDocumentTranslationPlan(
      session.segments,
      session.sourceText,
      cfg,
    );
    session.plans = plans;
    session.totalTranslatable = translatableCount;
    this.initResultsFromPlans(session);
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
    const segments = this.segment(doc);
    const { plans, translatableCount } = buildDocumentTranslationPlan(segments, doc.getText(), cfg);
    if (translatableCount === 0 && !cfg.document.forceTranslate) {
      void vscode.window.showInformationMessage(t('doc.alreadyTarget'));
      return;
    }
    const previewUri = this.previewUriFor(doc.uri, cfg.targetLanguage);
    let session = this.sessions.get(previewUri.toString());
    if (!session) {
      await this.startSession(doc, previewUri, cfg.targetLanguage, segments, plans);
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

  private initResultsFromPlans(session: DocSession): void {
    for (const seg of session.segments) {
      if (seg.kind === 'preserved') continue;
      const plan = session.plans.get(seg.id);
      if (!plan || plan.mode === 'skip') {
        session.results.set(seg.id, { status: 'skipped' });
      } else {
        session.results.set(seg.id, { status: 'pending' });
      }
    }
  }

  private async startSession(
    doc: vscode.TextDocument,
    previewUri: vscode.Uri,
    target: TargetLang,
    segments: Segment[],
    plans: Map<string, DocumentSegmentPlan>,
  ): Promise<void> {
    const results = new Map<string, { status: SegmentResultStatus; text?: string; error?: string }>();
    const translatableCount = [...plans.values()].filter((p) => p.mode !== 'skip').length;
    const session: DocSession = {
      sourceUri: doc.uri,
      previewUri,
      target,
      sourceVersion: doc.version,
      sourceLabel: doc.fileName,
      segments,
      plans,
      results,
      cts: new vscode.CancellationTokenSource(),
      doneCount: 0,
      totalTranslatable: translatableCount,
      sourceText: doc.getText(),
    };
    this.initResultsFromPlans(session);
    this.sessions.set(previewUri.toString(), session);
    this.preview.registerSession(session);
    await this.runTranslation(session, doc.getText());
  }

  private setSegmentTranslationResult(
    session: DocSession,
    segId: string,
    text: string,
    placeholders: Placeholder[],
  ): void {
    const seg = session.segments.find((s) => s.id === segId);
    if (seg && isSameTranslationAsSource(seg.sourceText, text, placeholders)) {
      session.results.set(segId, { status: 'skipped' });
    } else {
      session.results.set(segId, { status: 'done', text });
    }
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
      const plan = session.plans.get(seg.id);
      if (!plan || plan.mode === 'skip' || plan.mode === 'list-lines') continue;
      items.push({
        id: seg.id,
        text: seg.sourceText,
        placeholders: seg.placeholders,
        batchCacheKind: seg.kind === 'frontmatter' ? 'documentFrontmatterBatch' : 'documentBatch',
      });
    }

    const cfg = this.config.get(session.sourceUri);
    const pendingItems: typeof items = [];
    for (const item of items) {
      const cached = await this.translation.peekDocumentBatchCache(
        item.text,
        item.placeholders,
        session.target,
        item.batchCacheKind,
        session.sourceUri,
      );
      if (cached) {
        this.setSegmentTranslationResult(session, item.id, cached.text, item.placeholders);
      } else {
        pendingItems.push(item);
      }
    }

    const batches: typeof items[] = [];
    let batch: typeof items = [];
    let chars = 0;
    for (const item of pendingItems) {
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

    const totalSegments = session.totalTranslatable;
    const fileName = session.sourceLabel;

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'AI Translate', cancellable: true },
      async (progress, token) => {
        token.onCancellationRequested(() => session.cts.cancel());
        const segmentProgress = new DocumentSegmentProgressReporter(progress, fileName, totalSegments);
        segmentProgress.sync(session);
        session.doneCount = [...session.results.values()].filter((v) => v.status === 'done').length;
        this.preview.notify(session.previewUri);

        for (let i = 0; i < batches.length; i++) {
          if (token.isCancellationRequested || session.cts.token.isCancellationRequested) break;
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
              const item = batches[i].find((b) => b.id === id);
              this.setSegmentTranslationResult(
                session,
                id,
                r.text,
                item?.placeholders ?? [],
              );
            }
          }
          session.doneCount = [...session.results.values()].filter((v) => v.status === 'done').length;
          segmentProgress.sync(session);
          this.preview.notify(session.previewUri);
        }
        await translatePartialDocumentSegments(session, _source, cfg, this.translation, session.target);
        segmentProgress.sync(session);
        await validateAndFallbackContainers(session, _source, this.translation, session.target, cfg);
        session.doneCount = [...session.results.values()].filter((v) => v.status === 'done').length;
        segmentProgress.sync(session);
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
