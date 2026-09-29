import * as vscode from 'vscode';
import { buildHoverDocumentSelector } from '../constants/hoverSelector';
import type { ConfigService } from '../config/ConfigService';
import { decide } from '../detection/LanguageDetector';
import { LlmError } from '../llm/errors';
import type { CombinedExtractor } from '../parsing/CombinedExtractor';
import type { PrivacyGuard } from '../privacy/PrivacyGuard';
import type { StatsService } from '../stats/StatsService';
import type { TranslationService } from '../translation/TranslationService';
import { cancellableDelay } from '../util/delay';
import type { AppLogger } from '../util/logger';
import type { HoverActionRegistry } from './HoverActionRegistry';

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
      return errorHover(doc, pos, '悬停翻译内部错误，请查看 AI Translate 输出日志', [
        `[显示日志](command:aiTranslate.showLog)`,
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
      return errorHover(doc, pos, `首次使用需确认：文本将发送至 ${origin}`, [
        `[确认并继续](command:aiTranslate.acknowledgePrivacy)`,
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
    });
    if (!unit) return undefined;

    const commentKinds = new Set(['lineComment', 'blockComment', 'docComment', 'docstring']);
    if (unit.source !== 'document') {
      if (!cfg.hover.comments && commentKinds.has(unit.kind)) return undefined;
      if (!cfg.hover.strings && !commentKinds.has(unit.kind)) return undefined;
    } else if (!cfg.hover.documents) {
      return undefined;
    }

    if (this.guard.containsSecret(unit.text)) {
      return errorHover(doc, pos, '疑似密钥，未发送', []);
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
    const decision = decide(unit.text, detOpts);
    this.log.debug(`hover: detection -> ${decision.action}${decision.action === 'skip' ? ` (${decision.reason})` : ''}`);
    if (decision.action === 'skip') {
      this.stats.inc('skipped');
      return undefined;
    }

    const range = new vscode.Range(doc.positionAt(unit.range.start), doc.positionAt(unit.range.end));

    const cached = await this.translation.peekCache(unit, cfg.targetLanguage, doc.uri);
    if (cached) {
      this.log.debug(`hover: cache hit (${cached.fromCache})`);
      if (cached.fromCache === 'memory') this.stats.inc('memoryHits');
      return this.buildHover(doc, range, unit, cached.text, cfg, true, cached.placeholderOk);
    }

    if (this.translation.isPaused()) {
      return errorHover(doc, pos, '翻译服务暂停中 (连续失败)，60 秒后自动恢复', []);
    }

    const ok = await cancellableDelay(cfg.hover.extraDelayMs, token);
    if (!ok) {
      this.log.debug('hover: cancelled during extra delay');
      return undefined;
    }

    const t0 = Date.now();
    try {
      const result = await this.translation.translate(unit, cfg.targetLanguage, {
        kind: 'hover',
        uri: doc.uri,
      });
      this.log.debug(`hover: API ok in ${Date.now() - t0}ms`);
      return this.buildHover(doc, range, unit, result.text, cfg, false, result.placeholderOk);
    } catch (e) {
      this.log.warn(`hover: API failed in ${Date.now() - t0}ms: ${e instanceof Error ? e.message : e}`);
      if (e instanceof LlmError) {
        return this.errorFromLlm(doc, range, e);
      }
      return errorHover(doc, pos, String(e), []);
    }
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
    md.isTrusted = {
      enabledCommands: [
        'aiTranslate.hover.copy',
        'aiTranslate.hover.insertComment',
        'aiTranslate.hover.retranslate',
        'aiTranslate.acknowledgePrivacy',
        'aiTranslate.setApiKey',
        'aiTranslate.openSettings',
        'aiTranslate.showLog',
      ],
    };
    md.supportHtml = false;
    const cacheLabel = fromCache ? ' · 缓存' : '';
    md.appendMarkdown(`**AI 翻译** \`${cfg.targetLanguage}\`${cacheLabel}\n\n`);
    const isString = unit.kind === 'string' || unit.kind === 'templateString';
    if (isString) md.appendText(translation);
    else md.appendMarkdown(translation);
    if (!placeholderOk) md.appendMarkdown('\n\n*部分占位符未保留*');
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
    });
    md.appendMarkdown(
      `\n\n---\n[复制](command:aiTranslate.hover.copy?${encodeURIComponent(JSON.stringify([id]))}) · ` +
        `[插入为注释](command:aiTranslate.hover.insertComment?${encodeURIComponent(JSON.stringify([id]))}) · ` +
        `[重新翻译](command:aiTranslate.hover.retranslate?${encodeURIComponent(JSON.stringify([id]))})`,
    );
    return new vscode.Hover(md, range);
  }

  private errorFromLlm(_doc: vscode.TextDocument, range: vscode.Range, e: LlmError): vscode.Hover {
    const links: string[] = [];
    if (e.kind === 'noKey' || e.kind === 'auth') {
      links.push(`[设置 API Key](command:aiTranslate.setApiKey)`);
    }
    if (e.kind === 'noModel' || e.kind === 'notFound') {
      links.push(`[打开设置](command:aiTranslate.openSettings)`);
    }
    const md = new vscode.MarkdownString(e.message + (links.length ? '\n\n' + links.join(' · ') : ''));
    md.isTrusted = { enabledCommands: ['aiTranslate.setApiKey', 'aiTranslate.openSettings'] };
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
  log.info(`注册悬停提供器，scheme: ${schemes.join(', ')}`);
  return vscode.languages.registerHoverProvider(selector, provider);
}

function errorHover(doc: vscode.TextDocument, pos: vscode.Position, msg: string, links: string[]): vscode.Hover {
  const md = new vscode.MarkdownString(msg + (links.length ? '\n\n' + links.join(' · ') : ''));
  md.isTrusted = {
    enabledCommands: ['aiTranslate.acknowledgePrivacy', 'aiTranslate.setApiKey', 'aiTranslate.showLog'],
  };
  const range = doc.getWordRangeAtPosition(pos) ?? new vscode.Range(pos, pos);
  return new vscode.Hover(md, range);
}
