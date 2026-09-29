import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ConfigService } from '../config/ConfigService';
import type { CacheService } from '../cache/CacheService';
import type { ApiKeyStore } from '../secrets/ApiKeyStore';
import type { LlmClient } from '../llm/LlmClient';
import { loadBundleStrings, type BundleLocale } from '../l10n/bundleStrings';
import type { TargetLang } from '../types';
import {
  EXTRA_BODY_TEMPLATE_DEEPSEEK,
  EXTRA_BODY_TEMPLATE_QWEN,
  parseExtraBodyJson,
} from './extraBody';
import { readOverrides, readPanelValues, updatePanelKey } from './configState';
import { getSettingsPanelHtml } from './panelHtml';
import type { SettingsPanelMessageFromWebview, SettingsScope } from './protocol';
import { sanitizeConnectionError } from './sanitize';

export class SettingsPanelController {
  private panel: vscode.WebviewPanel | undefined;
  private scope: SettingsScope = 'global';
  private readonly totalNativeSettings: number;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly config: ConfigService,
    private readonly cache: CacheService,
    private readonly apiKeys: ApiKeyStore,
    private readonly llm: LlmClient,
    totalNativeSettings: number,
  ) {
    this.totalNativeSettings = totalNativeSettings;
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('aiTranslate') && this.panel) {
          void this.postState();
          if (e.affectsConfiguration('aiTranslate.targetLanguage')) {
            void this.postInit();
          }
        }
      }),
    );
  }

  reveal(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return;
    }
    this.panel = vscode.window.createWebviewPanel(
      'aiTranslate.settingsPanel',
      'AI Translate',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [this.context.extensionUri] },
    );
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
    this.panel.webview.onDidReceiveMessage((msg: SettingsPanelMessageFromWebview) => {
      void this.onMessage(msg);
    });
    void this.render();
  }

  private readBundle(locale: BundleLocale): Record<string, string> | undefined {
    const file = locale === 'en' ? 'bundle.l10n.json' : `bundle.l10n.${locale}.json`;
    const p = path.join(this.context.extensionPath, file);
    if (!fs.existsSync(p)) return undefined;
    return JSON.parse(fs.readFileSync(p, 'utf8')) as Record<string, string>;
  }

  private stringsForTarget(target: TargetLang): Record<string, string> {
    return loadBundleStrings((loc) => this.readBundle(loc), target);
  }

  private async render(): Promise<void> {
    if (!this.panel) return;
    const nonce = String(Date.now());
    const scriptUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'settings-panel-webview.js'),
    );
    this.panel.webview.html = getSettingsPanelHtml(scriptUri.toString(), nonce);
    await this.postInit();
  }

  private async postInit(): Promise<void> {
    if (!this.panel) return;
    const cfg = this.config.get();
    const strings = this.stringsForTarget(cfg.targetLanguage);
    const title = strings['panel.title'] ?? 'AI Translate Settings';
    this.panel.title = title;
    const baseUrl = cfg.llm.baseUrl;
    const apiKeyConfigured = Boolean(await this.apiKeys.get(baseUrl));
    this.panel.webview.postMessage({
      type: 'init',
      strings,
      scope: this.scope,
      values: readPanelValues(this.scope),
      overrides: readOverrides(),
      apiKeyConfigured,
      cacheStats: this.cache.stats(),
      totalNativeSettings: this.totalNativeSettings,
      targetLanguage: cfg.targetLanguage,
    });
  }

  private async postState(): Promise<void> {
    if (!this.panel) return;
    this.panel.webview.postMessage({
      type: 'state',
      values: readPanelValues(this.scope),
      overrides: readOverrides(),
    });
  }

  private async onMessage(msg: SettingsPanelMessageFromWebview): Promise<void> {
    if (!this.panel) return;
    switch (msg.type) {
      case 'ready':
        await this.postInit();
        break;
      case 'setScope':
        this.scope = msg.scope;
        await this.postInit();
        break;
      case 'update':
        if (msg.key === 'llm.extraBody' && typeof msg.value === 'string') {
          const parsed = parseExtraBodyJson(msg.value);
          if (!parsed.ok) {
            this.panel.webview.postMessage({ type: 'extraBodyError', message: parsed.error });
            return;
          }
          await updatePanelKey(msg.key, parsed.value, this.scope);
        } else {
          await updatePanelKey(msg.key, msg.value, this.scope);
        }
        await this.postState();
        if (msg.key === 'targetLanguage') await this.postInit();
        break;
      case 'applyExtraBodyTemplate':
        if (msg.template === 'clear') {
          await updatePanelKey('llm.extraBody', {}, this.scope);
        } else if (msg.template === 'deepseek') {
          await updatePanelKey('llm.extraBody', EXTRA_BODY_TEMPLATE_DEEPSEEK, this.scope);
        } else {
          await updatePanelKey('llm.extraBody', EXTRA_BODY_TEMPLATE_QWEN, this.scope);
        }
        await this.postState();
        break;
      case 'testConnection': {
        const res = await this.llm.testConnection();
        const strings = this.stringsForTarget(this.config.get().targetLanguage);
        if (res.ok) {
          const line = (strings['panel.testConnection.success'] ?? 'OK ({0} ms)').replace(
            '{0}',
            String(res.latencyMs ?? 0),
          );
          const modelSuffix = res.model ? ` · ${res.model}` : '';
          this.panel.webview.postMessage({ type: 'testResult', ok: true, message: line + modelSuffix });
        } else {
          const err = sanitizeConnectionError(res.message);
          this.panel.webview.postMessage({
            type: 'testResult',
            ok: false,
            message: (strings['panel.testConnection.fail'] ?? 'Failed: {0}').replace('{0}', err),
          });
        }
        break;
      }
      case 'clearCache': {
        const strings = this.stringsForTarget(this.config.get().targetLanguage);
        const confirm = strings['panel.cache.clearConfirm'] ?? 'Clear all translation cache?';
        const yes = strings['panel.cache.clearYes'] ?? 'Clear';
        const pick = await vscode.window.showWarningMessage(confirm, { modal: true }, yes);
        if (pick === yes) {
          await this.cache.clear();
          this.panel.webview.postMessage({ type: 'cacheCleared' });
          await this.postInit();
        }
        break;
      }
      case 'openNativeSettings':
        await vscode.commands.executeCommand(
          'workbench.action.openSettings',
          '@ext:cursor-ai-translate.cursor-ai-translate',
        );
        break;
      case 'openSetApiKey':
        await vscode.commands.executeCommand('aiTranslate.setApiKey');
        await this.postInit();
        break;
    }
  }
}
