import * as vscode from 'vscode';
import type { ConfigService } from '../config/ConfigService';
import { decide } from '../detection/LanguageDetector';
import type { PrivacyGuard } from '../privacy/PrivacyGuard';
import type { TranslationService } from '../translation/TranslationService';
import { buildHoverDocumentSelector } from '../constants/hoverSelector';
import { cancellableDelay } from '../util/delay';
import type { HoverActionRegistry } from './HoverActionRegistry';
import { LlmError } from '../llm/errors';

export class SelectionHoverProvider implements vscode.HoverProvider {
  constructor(
    private readonly config: ConfigService,
    private readonly guard: PrivacyGuard,
    private readonly translation: TranslationService,
    private readonly registry: HoverActionRegistry,
  ) {}

  async provideHover(
    doc: vscode.TextDocument,
    pos: vscode.Position,
    token: vscode.CancellationToken,
  ): Promise<vscode.Hover | undefined> {
    const cfg = this.config.get(doc.uri);
    if (!cfg.enabled || !cfg.hover.enabled || !cfg.hover.selection) return undefined;
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document !== doc || editor.selection.isEmpty) return undefined;
    if (!editor.selection.contains(pos)) return undefined;

    const block = this.guard.check(doc);
    if (block && block !== 'noAck') return undefined;
    if (block === 'noAck') {
      return new vscode.Hover('首次使用需确认隐私提示', editor.selection);
    }

    const text = doc.getText(editor.selection);
    const det = decide(text, {
      target: cfg.targetLanguage,
      minLength: cfg.detection.minLength,
      targetRatio: cfg.detection.targetRatio,
      reliableMinLength: cfg.detection.reliableMinLength,
      strictChineseVariant: cfg.detection.strictChineseVariant,
      userSkipPatterns: cfg.detection.skipPatterns.map((p) => new RegExp(p)),
      blockSecrets: cfg.privacy.blockSecrets,
    });
    if (det.action === 'skip') return undefined;

    const unit = {
      kind: 'string' as const,
      range: { start: doc.offsetAt(editor.selection.start), end: doc.offsetAt(editor.selection.end) },
      rawText: text,
      text,
      placeholders: [],
      languageId: doc.languageId,
      source: 'selection' as const,
    };

    const cached = await this.translation.peekCache(unit, cfg.targetLanguage, doc.uri);
    if (cached) {
      return this.build(doc, editor.selection, unit, cached.text, cfg, true);
    }

    const ok = await cancellableDelay(cfg.hover.extraDelayMs, token);
    if (!ok || token.isCancellationRequested) return undefined;

    try {
      const result = await this.translation.translate(unit, cfg.targetLanguage, {
        kind: 'hover',
        uri: doc.uri,
      });
      return this.build(doc, editor.selection, unit, result.text, cfg, false);
    } catch (e) {
      if (e instanceof LlmError) return new vscode.Hover(e.message, editor.selection);
      return undefined;
    }
  }

  private build(
    doc: vscode.TextDocument,
    range: vscode.Selection,
    unit: import('../types').TextUnit,
    translation: string,
    cfg: ReturnType<ConfigService['get']>,
    fromCache: boolean,
  ): vscode.Hover {
    const md = new vscode.MarkdownString();
    md.isTrusted = {
      enabledCommands: [
        'aiTranslate.hover.copy',
        'aiTranslate.hover.insertComment',
        'aiTranslate.hover.retranslate',
        'aiTranslate.selection.replace',
        'aiTranslate.selection.insertBelow',
      ],
    };
    md.appendMarkdown(`**AI 翻译 · 选区** \`${cfg.targetLanguage}\`${fromCache ? ' · 缓存' : ''}\n\n`);
    md.appendMarkdown(translation);
    const id = this.registry.put({
      translation,
      uri: doc.uri.toString(),
      range: unit.range,
      languageId: doc.languageId,
      unit,
    });
    md.appendMarkdown(
      `\n\n---\n[复制](command:aiTranslate.hover.copy?${encodeURIComponent(JSON.stringify([id]))}) · ` +
        `[替换选区](command:aiTranslate.selection.replace?${encodeURIComponent(JSON.stringify([id]))}) · ` +
        `[插入下方](command:aiTranslate.selection.insertBelow?${encodeURIComponent(JSON.stringify([id]))})`,
    );
    return new vscode.Hover(md, range);
  }
}

export function createSelectionHoverProvider(
  config: ConfigService,
  guard: PrivacyGuard,
  translation: TranslationService,
  registry: HoverActionRegistry,
): vscode.Disposable {
  const provider = new SelectionHoverProvider(config, guard, translation, registry);
  return vscode.languages.registerHoverProvider(buildHoverDocumentSelector(config.get().privacy.allowedSchemes), provider);
}
