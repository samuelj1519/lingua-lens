import * as vscode from 'vscode';
import { buildHoverDocumentSelector } from '../constants/hoverSelector';
import type { ConfigService } from '../config/ConfigService';
import { decide } from '../detection/LanguageDetector';
import { LlmError } from '../llm/errors';
import { localizedLlmErrorMessage, reasoningBudgetHoverLinks } from '../llm/llmErrorUi';
import type { CombinedExtractor } from '../parsing/CombinedExtractor';
import type { PrivacyGuard } from '../privacy/PrivacyGuard';
import type { StatsService } from '../stats/StatsService';
import type { TranslationService } from '../translation/TranslationService';
import { cancellableDelay } from '../util/delay';
import type { AppLogger } from '../util/logger';
import { t } from '../l10n/uiL10n';
import type { HoverActionRegistry } from './HoverActionRegistry';
import { HOVER_TRUSTED_COMMANDS, hoverActionLinks } from './hoverActionLinks';
import { LINGUA_LENS_HOVER_MARKER } from './hoverMarkers';
import { buildSupplementalHoverBlocks } from './HoverBlocks';

export class TranslateHoverProvider implements vscode.HoverProvider {
  constructor(
    private readonly config: ConfigService,
    private readonly guard: PrivacyGuard,
    private readonly extractor: CombinedExtractor,
    private readonly translation: TranslationService,
    private readonly stats: StatsService,
    private readonly registry: HoverActionRegistry,
    private readonly log: AppLogger,
  ) {}

  async provideHover(
    doc: vscode.TextDocument,
    pos: vscode.Position,
    token: vscode.CancellationToken,
  ): Promise<vscode.Hover | undefined> {
    try {
      return await this.provideHoverInner(doc, pos, token);
    } catch (e) {
      const msg = e instanceof Error ? e.stack ?? e.message : String(e);
      this.log.error(`provideHover unexpected error: ${msg}`);
      return errorHover(doc, pos, t('hover.error.internal'), [
        `[${t('hover.error.showLog')}](command:linguaLens.showLog)`,
      ]);
    }
  }

  private async provideHoverInner(
    doc: vscode.TextDocument,
    pos: vscode.Position,
    token: vscode.CancellationToken,
  ): Promise<vscode.Hover | undefined> {
    const cfg = this.config.get(doc.uri);
    this.log.debug(`hover: ${doc.uri.toString()} ${doc.languageId} @ ${pos.line}:${pos.character}`);

    if (!cfg.enabled || !cfg.hover.enabled) {
      this.log.debug('hover: disabled by settings');
      return undefined;
    }

    const block = this.guard.check(doc);
    this.log.debug(`hover: privacy guard -> ${block ?? 'ok'}`);
    if (block === 'excluded' || block === 'disabled' || block === 'scheme' || block === 'untrusted') {
      return undefined;
    }
    if (block === 'noAck') {
      const origin = new URL(cfg.llm.baseUrl).origin;
      return errorHover(doc, pos, t('privacy.prompt', origin), [
        `[${t('privacy.continue')}](command:linguaLens.acknowledgePrivacy)`,
      ]);
    }

    const offset = doc.offsetAt(pos);
    const snapshot = {
      uri: doc.uri.toString(),
      version: doc.version,
      languageId: doc.languageId,
      getText: () => doc.getText(),
    };
    const unit = await this.extractor.extractAt(snapshot, offset, {
      documentHover: cfg.hover.documents,
      configKeys: cfg.hover.configKeys,
    });

    let primary: vscode.Hover | undefined;
    if (!unit) {
      primary = undefined;
    } else {

    const commentKinds = new Set(['lineComment', 'blockComment', 'docComment', 'docstring']);
    let skipPrimary = false;
    if (unit.kind === 'configKey' && !cfg.hover.configKeys) skipPrimary = true;
    if (!skipPrimary && unit.source !== 'document' && unit.kind !== 'configKey') {
      if (!cfg.hover.comments && commentKinds.has(unit.kind)) skipPrimary = true;
      if (!cfg.hover.strings && !commentKinds.has(unit.kind)) skipPrimary = true;
    } else if (!skipPrimary && unit.source === 'document' && !cfg.hover.documents) {
      skipPrimary = true;
    }

    if (!skipPrimary && this.guard.containsSecret(unit.text)) {
      primary = errorHover(doc, pos, t('msg.secretNotSent'), []);
      skipPrimary = true;
    }

    const detOpts = {
      target: cfg.targetLanguage,
      minLength: cfg.detection.minLength,
      targetRatio: cfg.detection.targetRatio,
      reliableMinLength: cfg.detection.reliableMinLength,
      strictChineseVariant: cfg.detection.strictChineseVariant,
      userSkipPatterns: cfg.detection.skipPatterns.map((p) => new RegExp(p)),
      blockSecrets: cfg.privacy.blockSecrets,
    };
    if (!skipPrimary && !primary) {
    const decision = decide(unit.text, detOpts);
    this.log.debug(`hover: detection -> ${decision.action}${decision.action === 'skip' ? ` (${decision.reason})` : ''}`);
    if (decision.action === 'skip') {
      this.stats.inc('skipped');
      primary = undefined;
    } else {
      const range = new vscode.Range(doc.positionAt(unit.range.start), doc.positionAt(unit.range.end));

      const cached = await this.translation.peekCache(unit, cfg.targetLanguage, 'hover', doc.uri);
      if (cached) {
        this.log.debug(`hover: cache hit (${cached.fromCache})`);
        if (cached.fromCache === 'memory') this.stats.inc('memoryHits');
        primary = this.buildHover(doc, range, unit, cached.text, cfg, true, cached.placeholderOk);
      } else if (this.translation.isPaused()) {
        primary = errorHover(doc, pos, t('hover.error.servicePaused'), []);
      } else {
        const ok = await cancellableDelay(cfg.hover.extraDelayMs, token);
        if (!ok) {
          this.log.debug('hover: cancelled during extra delay');
          primary = undefined;
        } else {
          const t0 = Date.now();
          try {
            const result = await this.translation.translate(unit, cfg.targetLanguage, {
              kind: 'hover',
              uri: doc.uri,
            });
            this.log.debug(`hover: API ok in ${Date.now() - t0}ms`);
            primary = this.buildHover(doc, range, unit, result.text, cfg, false, result.placeholderOk);
          } catch (e) {
            this.log.warn(`hover: API failed in ${Date.now() - t0}ms: ${e instanceof Error ? e.message : e}`);
            if (e instanceof LlmError) {
              primary = this.errorFromLlm(doc, range, e);
            } else {
              primary = errorHover(doc, pos, String(e), []);
            }
          }
        }
      }
    }
    }
    }

    const supplemental = await buildSupplementalHoverBlocks(
      doc,
      pos,
      token,
      cfg,
      this.guard,
      this.translation,
      this.stats,
      this.log,
      this.registry,
    );
    return mergeHoverBlocks(primary, supplemental, doc, pos);
  }

  private buildHover(
    doc: vscode.TextDocument,
    range: vscode.Range,
    unit: import('../types').TextUnit,
    translation: string,
    cfg: ReturnType<ConfigService['get']>,
    fromCache: boolean,
    placeholderOk: boolean,
  ): vscode.Hover {
    const md = new vscode.MarkdownString();
    md.isTrusted = { enabledCommands: [...HOVER_TRUSTED_COMMANDS] };
    md.supportHtml = false;
    const cacheLabel = fromCache ? t('hover.fromCache') : '';
    md.appendMarkdown(`${LINGUA_LENS_HOVER_MARKER}\n**${t('hover.brand')}** \`${cfg.targetLanguage}\`${cacheLabel}\n\n`);
    const isString = unit.kind === 'string' || unit.kind === 'templateString';
    if (isString) md.appendText(translation);
    else md.appendMarkdown(translation);
    if (!placeholderOk) md.appendMarkdown(`\n\n${t('hover.placeholderWarning')}`);
    if (cfg.hover.showOriginal) {
      const orig = unit.text.slice(0, 500);
      md.appendMarkdown(`\n\n> ${orig}`);
    }
    const id = this.registry.put({
      translation,
      uri: doc.uri.toString(),
      range: unit.range,
      languageId: doc.languageId,
      unit,
      targetLanguage: cfg.targetLanguage,
      translateKind: 'hover',
    });
    md.appendMarkdown(
      hoverActionLinks(id, { copy: true, insertComment: true, refresh: true }),
    );
    return new vscode.Hover(md, range);
  }

  private errorFromLlm(_doc: vscode.TextDocument, range: vscode.Range, e: LlmError): vscode.Hover {
    const links: string[] = [];
    if (e.kind === 'noKey' || e.kind === 'auth') {
      links.push(`[${t('hover.error.setApiKey')}](command:linguaLens.setApiKey)`);
    }
    if (e.kind === 'noModel' || e.kind === 'notFound') {
      links.push(`[${t('hover.error.openSettings')}](command:linguaLens.openSettings)`);
    }
    if (e.kind === 'reasoningBudget') {
      links.push(reasoningBudgetHoverLinks());
    }
    const md = new vscode.MarkdownString(
      localizedLlmErrorMessage(e) + (links.length ? '\n\n' + links.join(' · ') : ''),
    );
    md.isTrusted = {
      enabledCommands: [
        'linguaLens.setApiKey',
        'linguaLens.openSettings',
        'linguaLens.openExtraBodySettings',
        'linguaLens.applyDeepSeekExtraBodyPreset',
      ],
    };
    return new vscode.Hover(md, range);
  }
}

export function createHoverProvider(
  config: ConfigService,
  guard: PrivacyGuard,
  extractor: CombinedExtractor,
  translation: TranslationService,
  stats: StatsService,
  registry: HoverActionRegistry,
  log: AppLogger,
): vscode.Disposable {
  const provider = new TranslateHoverProvider(config, guard, extractor, translation, stats, registry, log);
  const schemes = config.get().privacy.allowedSchemes;
  const selector = buildHoverDocumentSelector(schemes);
  log.info(`Registered hover provider for schemes: ${schemes.join(', ')}`);
  return vscode.languages.registerHoverProvider(selector, provider);
}

function mergeHoverBlocks(
  primary: vscode.Hover | undefined,
  supplemental: import('./HoverBlocks').HoverBlockResult[],
  doc: vscode.TextDocument,
  pos: vscode.Position,
): vscode.Hover | undefined {
  if (!primary && !supplemental.length) return undefined;
  const parts: vscode.MarkdownString[] = [];
  if (primary) {
    for (const c of primary.contents) {
      if (typeof c === 'string') {
        parts.push(new vscode.MarkdownString(c));
      } else if (c instanceof vscode.MarkdownString) {
        parts.push(c);
      } else {
        parts.push(new vscode.MarkdownString(c.value));
      }
    }
  }
  for (const s of supplemental) {
    parts.push(s.markdown);
  }
  const combined = new vscode.MarkdownString();
  combined.supportHtml = false;
  combined.isTrusted = primary?.contents[0] && typeof primary.contents[0] !== 'string'
    ? (primary.contents[0] as vscode.MarkdownString).isTrusted
    : { enabledCommands: ['linguaLens.setApiKey', 'linguaLens.acknowledgePrivacy', 'linguaLens.showLog'] };
  for (let i = 0; i < parts.length; i++) {
    if (i > 0) combined.appendMarkdown('\n\n---\n\n');
    combined.appendMarkdown(parts[i].value);
  }
  const range =
    primary?.range ??
    supplemental[0]?.range ??
    doc.getWordRangeAtPosition(pos) ??
    new vscode.Range(pos, pos);
  return new vscode.Hover(combined, range);
}

function errorHover(doc: vscode.TextDocument, pos: vscode.Position, msg: string, links: string[]): vscode.Hover {
  const md = new vscode.MarkdownString(msg + (links.length ? '\n\n' + links.join(' · ') : ''));
  md.isTrusted = {
    enabledCommands: ['linguaLens.acknowledgePrivacy', 'linguaLens.setApiKey', 'linguaLens.showLog'],
  };
  const range = doc.getWordRangeAtPosition(pos) ?? new vscode.Range(pos, pos);
  return new vscode.Hover(md, range);
}
