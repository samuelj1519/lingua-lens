import * as vscode from 'vscode';
import type { ApiKeyStore } from '../secrets/ApiKeyStore';
import type { ConfigService } from '../config/ConfigService';
import type { StatsService } from '../stats/StatsService';
import { TARGET_LANGUAGE_NATIVE_LABELS } from '../l10n/targetLanguage';
import { t } from '../l10n/uiL10n';
import type { TargetLang } from '../types';

export class StatusBarController implements vscode.Disposable {
  private readonly toggleItem: vscode.StatusBarItem;
  private readonly langItem: vscode.StatusBarItem;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly stats: StatsService,
    private readonly apiKeys: ApiKeyStore,
  ) {
    this.toggleItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.toggleItem.command = 'linguaLens.showQuickPick';
    this.langItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
    this.langItem.command = 'linguaLens.selectTargetLanguage';
    this.stats.onDidChange(() => this.scheduleRefresh());
    this.config.onDidChange(() => this.refresh());
    void this.refresh();
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) return;
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      this.refresh();
    }, 500);
  }

  async refresh(): Promise<void> {
    const cfg = this.config.get();
    if (!cfg.statusBar.enabled) {
      this.toggleItem.hide();
      this.langItem.hide();
      return;
    }
    const key = await this.apiKeys.get(cfg.llm.baseUrl);
    const enabled = cfg.enabled;
    if (!key) {
      this.toggleItem.text = `$(warning) ${t('statusbar.shortLabel')}`;
    } else if (enabled) {
      this.toggleItem.text = `$(globe) ${t('statusbar.shortLabel')}`;
    } else {
      this.toggleItem.text = `$(circle-slash) ${t('statusbar.shortLabel')}`;
    }
    this.langItem.text = cfg.targetLanguage;
    const s = this.stats.snapshot();
    const md = new vscode.MarkdownString();
    md.isTrusted = { enabledCommands: ['linguaLens.setApiKey', 'linguaLens.clearCache'] };
    const stateLabel = enabled ? t('statusbar.tooltip.enabled') : t('statusbar.tooltip.disabled');
    md.appendMarkdown(
      `**${t('statusbar.tooltip.title')}** ${stateLabel} (${t('statusbar.tooltip.target')} ${cfg.targetLanguage})\n\n` +
        `| | |\n| --- | --- |\n` +
        `| ${t('statusbar.tooltip.apiCalls')} | ${s.apiCalls} |\n` +
        `| ${t('statusbar.tooltip.cacheHits')} | ${s.memoryHits} / ${s.diskHits} |\n` +
        `| ${t('statusbar.tooltip.skipped')} | ${s.skipped} |\n` +
        `| ${t('statusbar.tooltip.errors')} | ${s.errors} |\n` +
        `| ${t('statusbar.tooltip.tokens')} | ${s.promptTokens} / ${s.completionTokens} |\n\n` +
        `${t('statusbar.tooltip.model')} \`${cfg.llm.model || '—'}\` · [${t('statusbar.tooltip.setApiKey')}](command:linguaLens.setApiKey) · [${t('statusbar.tooltip.clearCache')}](command:linguaLens.clearCache)`,
    );
    this.toggleItem.tooltip = md;
    this.langItem.tooltip = md;
    this.toggleItem.show();
    this.langItem.show();
  }

  async pickLanguage(): Promise<void> {
    const cfg = this.config.get();
    const items = (Object.keys(TARGET_LANGUAGE_NATIVE_LABELS) as TargetLang[]).map((code) => ({
      label: (code === cfg.targetLanguage ? '$(check) ' : '') + TARGET_LANGUAGE_NATIVE_LABELS[code],
      description: code,
      code,
    }));
    const picked = await vscode.window.showQuickPick(items, { title: t('statusbar.pickLanguage.title') });
    if (picked) {
      await this.config.setTargetLanguage(picked.code);
      this.refresh();
    }
  }

  dispose(): void {
    this.toggleItem.dispose();
    this.langItem.dispose();
  }
}
