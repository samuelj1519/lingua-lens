import * as vscode from 'vscode';
import type { ApiKeyStore } from '../secrets/ApiKeyStore';
import type { ConfigService } from '../config/ConfigService';
import type { StatsService } from '../stats/StatsService';
import type { TargetLang } from '../types';

const LANG_LABELS: Record<TargetLang, string> = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  ru: 'Русский',
};

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
    this.toggleItem.command = 'aiTranslate.showQuickPick';
    this.langItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
    this.langItem.command = 'aiTranslate.selectTargetLanguage';
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
      this.toggleItem.text = '$(warning) 译';
    } else if (enabled) {
      this.toggleItem.text = '$(globe) 译';
    } else {
      this.toggleItem.text = '$(circle-slash) 译';
    }
    this.langItem.text = cfg.targetLanguage;
    const s = this.stats.snapshot();
    const md = new vscode.MarkdownString();
    md.isTrusted = { enabledCommands: ['aiTranslate.setApiKey', 'aiTranslate.clearCache'] };
    md.appendMarkdown(
      `**AI Translate** ${enabled ? '已启用' : '已禁用'} (目标 ${cfg.targetLanguage})\n\n` +
        `| 项 | 次数 |\n| --- | --- |\n` +
        `| API 调用 | ${s.apiCalls} |\n` +
        `| 缓存命中 (内存/磁盘) | ${s.memoryHits} / ${s.diskHits} |\n` +
        `| 本地跳过 | ${s.skipped} |\n` +
        `| 错误 | ${s.errors} |\n` +
        `| Token (输入/输出) | ${s.promptTokens} / ${s.completionTokens} |\n\n` +
        `模型 \`${cfg.llm.model || '(未设置)'}\` · [设置 API Key](command:aiTranslate.setApiKey) · [清除缓存](command:aiTranslate.clearCache)`,
    );
    this.toggleItem.tooltip = md;
    this.langItem.tooltip = md;
    this.toggleItem.show();
    this.langItem.show();
  }

  async pickLanguage(): Promise<void> {
    const cfg = this.config.get();
    const items = (Object.keys(LANG_LABELS) as TargetLang[]).map((code) => ({
      label: (code === cfg.targetLanguage ? '$(check) ' : '') + LANG_LABELS[code],
      description: code,
      code,
    }));
    const picked = await vscode.window.showQuickPick(items, { title: '选择目标语言' });
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
