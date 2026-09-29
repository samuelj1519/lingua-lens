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
): Promise<HoverBlockResult[]> {
  const blocks: HoverBlockResult[] = [];
  const detOpts = {
    target: cfg.targetLanguage,
    minLength: cfg.detection.minLength,
    targetRatio: cfg.detection.targetRatio,
    reliableMinLength: cfg.detection.reliableMinLength,
    strictChineseVariant: cfg.detection.strictChineseVariant,
    userSkipPatterns: cfg.detection.skipPatterns.map((p) => new RegExp(p)),
    blockSecrets: cfg.privacy.blockSecrets,
  };

  let needsDelay = false;
  const pending: Array<{
    title: string;
    unit: TextUnit;
    range: vscode.Range;
    cached?: { text: string; fromCache: true; placeholderOk: boolean };
  }> = [];

  if (cfg.hover.diagnostics) {
    const diags = diagnosticsAt(doc.uri, pos);
    if (diags.length) {
      const text = formatDiagnosticMessages(diags);
      const unit = plainUnit(doc, 'diagnostic', text);
      const decision = decide(text, detOpts);
      if (decision.action === 'translate') {
        const range = diagnosticHoverRange(diags, pos);
        const cached = await translation.peekCache(unit, cfg.targetLanguage, doc.uri);
        if (cached) {
          pending.push({ title: '诊断信息', unit, range, cached: { text: cached.text, fromCache: true, placeholderOk: cached.placeholderOk } });
        } else {
          needsDelay = true;
          pending.push({ title: '诊断信息', unit, range });
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
        const cached = await translation.peekCache(unit, cfg.targetLanguage, doc.uri);
        if (cached) {
          pending.push({ title: '符号文档', unit, range, cached: { text: cached.text, fromCache: true, placeholderOk: cached.placeholderOk } });
        } else {
          needsDelay = true;
          pending.push({ title: '符号文档', unit, range });
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
      const cacheLabel = fromCache ? ' · 缓存' : '';
      md.appendMarkdown(`**AI 翻译 · ${item.title}** \`${cfg.targetLanguage}\`${cacheLabel}\n\n`);
      md.appendMarkdown(text);
      if (!placeholderOk) md.appendMarkdown('\n\n*部分占位符未保留*');
      blocks.push({ markdown: md, range: item.range });
    } catch (e) {
      log.warn(`hover supplemental failed: ${e instanceof Error ? e.message : e}`);
      if (e instanceof LlmError && e.kind === 'noKey') {
        const md = new vscode.MarkdownString(`**AI 翻译 · ${item.title}**\n\n${e.message}`);
        md.isTrusted = { enabledCommands: ['aiTranslate.setApiKey'] };
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
