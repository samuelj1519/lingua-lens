import * as vscode from 'vscode';
import type { ConfigService } from '../config/ConfigService';
import { decide } from '../detection/LanguageDetector';
import { LlmError } from '../llm/errors';
import type { PrivacyGuard } from '../privacy/PrivacyGuard';
import type { StatsService } from '../stats/StatsService';
import type { TranslationService } from '../translation/TranslationService';
import type { TextUnit } from '../types';
import { cancellableDelay } from '../util/delay';
import type { AppLogger } from '../util/logger';
import { diagnosticHoverRange, diagnosticsAt, formatDiagnosticMessages } from './DiagnosticHover';
import { extractSymbolDocumentation } from './SymbolDocHover';
import {
  fetchCommitMessageForBlame,
  isGitBlameHoverPosition,
  shouldTranslateCommitMessage,
} from './GitCommitHover';
import type { HoverActionRegistry } from './HoverActionRegistry';
import { t } from '../l10n/uiL10n';
import { HOVER_TRUSTED_COMMANDS, hoverActionLinks } from './hoverActionLinks';
import { redactForUserFacingText } from '../secrets/redactBinding';

export interface HoverBlockResult {
  markdown: vscode.MarkdownString;
  range: vscode.Range;
}

export async function buildSupplementalHoverBlocks(
  doc: vscode.TextDocument,
  pos: vscode.Position,
  token: vscode.CancellationToken,
  cfg: ReturnType<ConfigService['get']>,
  _guard: PrivacyGuard,
  translation: TranslationService,
  _stats: StatsService,
  log: AppLogger,
  registry: HoverActionRegistry,
): Promise<HoverBlockResult[]> {
  const blocks: HoverBlockResult[] = [];
  const detOpts = {
    target: cfg.targetLanguage,
    minLength: cfg.detection.minLength,
    targetRatio: cfg.detection.targetRatio,
    reliableMinLength: cfg.detection.reliableMinLength,
    strictChineseVariant: cfg.detection.strictChineseVariant,
    userSkipPatterns: cfg.detection.skipPatterns.map((p) => new RegExp(p)),
  };

  let needsDelay = false;
  const pending: Array<{
    title: string;
    unit: TextUnit;
    range: vscode.Range;
    cached?: { text: string; fromCache: true; placeholderOk: boolean };
  }> = [];

  if (cfg.hover.gitCommitMessage && isGitBlameHoverPosition(doc, pos)) {
    const line = pos.line + 1;
    const msg = await fetchCommitMessageForBlame(doc, line);
    if (msg && shouldTranslateCommitMessage(msg, cfg)) {
      const unit = plainUnit(doc, 'diagnostic', msg);
      const range = new vscode.Range(pos.line, 0, pos.line, doc.lineAt(pos.line).text.length);
      const cached = await translation.peekCache(unit, cfg.targetLanguage, 'hover', doc.uri);
      if (cached) {
        pending.push({
          title: t('hover.title.gitCommit'),
          unit,
          range,
          cached: { text: cached.text, fromCache: true, placeholderOk: cached.placeholderOk },
        });
      } else {
        needsDelay = true;
        pending.push({ title: t('hover.title.gitCommit'), unit, range });
      }
    }
  }

  if (cfg.hover.diagnostics) {
    const diags = diagnosticsAt(doc.uri, pos);
    if (diags.length) {
      const text = formatDiagnosticMessages(diags);
      const unit = plainUnit(doc, 'diagnostic', text);
      const decision = decide(text, detOpts);
      if (decision.action === 'translate') {
        const range = diagnosticHoverRange(diags, pos);
        const cached = await translation.peekCache(unit, cfg.targetLanguage, 'hover', doc.uri);
        if (cached) {
          pending.push({
            title: t('hover.title.diagnostics'),
            unit,
            range,
            cached: { text: cached.text, fromCache: true, placeholderOk: cached.placeholderOk },
          });
        } else {
          needsDelay = true;
          pending.push({ title: t('hover.title.diagnostics'), unit, range });
        }
      }
    }
  }

  if (cfg.hover.symbolDocs) {
    const docText = await extractSymbolDocumentation(doc.uri, pos);
    if (docText) {
      const unit = plainUnit(doc, 'symbolDoc', docText);
      const decision = decide(docText, detOpts);
      if (decision.action === 'translate') {
        const range = doc.getWordRangeAtPosition(pos) ?? new vscode.Range(pos, pos);
        const cached = await translation.peekCache(unit, cfg.targetLanguage, 'hover', doc.uri);
        if (cached) {
          pending.push({
            title: t('hover.title.symbolDocs'),
            unit,
            range,
            cached: { text: cached.text, fromCache: true, placeholderOk: cached.placeholderOk },
          });
        } else {
          needsDelay = true;
          pending.push({ title: t('hover.title.symbolDocs'), unit, range });
        }
      }
    }
  }

  if (!pending.length) return blocks;

  if (needsDelay) {
    if (translation.isPaused()) return blocks;
    const ok = await cancellableDelay(cfg.hover.extraDelayMs, token);
    if (!ok) {
      log.debug('hover: cancelled during delay (supplemental blocks)');
      pending.splice(0, pending.length, ...pending.filter((p) => p.cached));
      if (!pending.length) return blocks;
    }
  }

  for (const item of pending) {
    if (token.isCancellationRequested) break;
    try {
      let text: string;
      let fromCache = false;
      let placeholderOk = true;
      if (item.cached) {
        text = item.cached.text;
        fromCache = true;
        placeholderOk = item.cached.placeholderOk;
      } else {
        const result = await translation.translate(item.unit, cfg.targetLanguage, {
          kind: 'hover',
          uri: doc.uri,
        });
        text = result.text;
        placeholderOk = result.placeholderOk;
      }
      const md = new vscode.MarkdownString();
      md.supportHtml = false;
      md.isTrusted = { enabledCommands: [...HOVER_TRUSTED_COMMANDS] };
      const cacheLabel = fromCache ? t('hover.fromCache') : '';
      md.appendMarkdown(`**${t('hover.sectionPrefix', item.title)}** \`${cfg.targetLanguage}\`${cacheLabel}\n\n`);
      md.appendMarkdown(text);
      if (!placeholderOk) md.appendMarkdown(`\n\n${t('hover.placeholderWarning')}`);
      const id = registry.put({
        translation: text,
        uri: doc.uri.toString(),
        range: item.unit.range,
        languageId: doc.languageId,
        unit: item.unit,
        targetLanguage: cfg.targetLanguage,
        translateKind: 'hover',
      });
      md.appendMarkdown(hoverActionLinks(id, { copy: true, refresh: true }));
      blocks.push({ markdown: md, range: item.range });
    } catch (e) {
      log.warn(`hover supplemental failed: ${e instanceof Error ? e.message : e}`);
      if (e instanceof LlmError && e.kind === 'noKey') {
        const msg = await redactForUserFacingText(e.message);
        const md = new vscode.MarkdownString(
          `**${t('hover.sectionPrefix', item.title)}**\n\n${msg}`,
        );
        md.isTrusted = { enabledCommands: ['linguaLens.setApiKey'] };
        blocks.push({ markdown: md, range: item.range });
      }
    }
  }

  return blocks;
}

function plainUnit(doc: vscode.TextDocument, kind: TextUnit['kind'], text: string): TextUnit {
  const start = 0;
  const end = Math.min(text.length, 1);
  return {
    kind,
    range: { start, end },
    rawText: text,
    text,
    placeholders: [],
    languageId: doc.languageId,
    source: 'selection',
  };
}
