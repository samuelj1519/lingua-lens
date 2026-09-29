import * as vscode from 'vscode';
import type { ConfigService } from '../config/ConfigService';
import type { CacheService } from '../cache/CacheService';
import type { ApiKeyStore } from '../secrets/ApiKeyStore';
import type { LlmClient } from '../llm/LlmClient';
import { getUiStringsForRawTarget } from '../l10n/uiL10n';
import {
  BUILTIN_TARGET_LANGUAGES,
  isBuiltinTargetLanguage,
  TARGET_LANGUAGE_NATIVE_LABELS,
} from '../l10n/targetLanguage';
import { consumeCursorUiBootstrapHint } from '../l10n/targetLanguageBootstrap';
import {
  EXTRA_BODY_TEMPLATE_DEEPSEEK,
  EXTRA_BODY_TEMPLATE_QWEN,
  parseExtraBodyJson,
} from './extraBody';
import { readOverrides, readPanelValues, updatePanelKey } from './configState';
import { getSettingsPanelHtml } from './panelHtml';
import type { LanguageOption, SettingsPanelMessageFromWebview, SettingsScope } from './protocol';
import { redactForUserFacingText } from '../secrets/redactBinding';
import { EXTENSION_SETTINGS_FILTER } from '../constants/extensionId';

export class SettingsPanelController {
  private panel: vscode.WebviewPanel | undefined;
  private scope: SettingsScope = 'global';
  private readonly totalNativeSettings: number;
  private webviewReady = false;
  private showLocaleBootstrapHint = false;

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
        if (e.affectsConfiguration('linguaLens') && this.panel) {
          void this.postState();
          if (e.affectsConfiguration('linguaLens.targetLanguage')) {
            void this.postLocaleUpdate();
          }
        }
      }),
    );
  }

  reveal(): void {
    if (this.showLocaleBootstrapHint === false) {
      this.showLocaleBootstrapHint = consumeCursorUiBootstrapHint(this.context);
    }
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      void this.postLocaleUpdate();
      return;
    }
    this.panel = vscode.window.createWebviewPanel(
      'linguaLens.settingsPanel',
      'LinguaLens',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [this.context.extensionUri] },
    );
    this.panel.onDidDispose(() => {
      this.panel = undefined;
      this.webviewReady = false;
    });
    this.panel.webview.onDidReceiveMessage((msg: SettingsPanelMessageFromWebview) => {
      void this.onMessage(msg);
    });
    void this.render();
  }

  private rawTargetLanguage(): string {
    const values = readPanelValues(this.scope);
    const v = values['targetLanguage'];
    return typeof v === 'string' ? v : this.config.get().targetLanguage;
  }

  private stringsForPanel(rawTarget: string): Record<string, string> {
    return getUiStringsForRawTarget(rawTarget);
  }

  private languageOptions(): LanguageOption[] {
    return BUILTIN_TARGET_LANGUAGES.map((value) => ({
      value,
      label: TARGET_LANGUAGE_NATIVE_LABELS[value],
    }));
  }

  private async render(): Promise<void> {
    if (!this.panel) return;
    const nonce = String(Date.now());
    const scriptUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'settings-panel-webview.js'),
    );
    this.panel.webview.html = getSettingsPanelHtml(scriptUri.toString(), nonce);
    this.webviewReady = false;
    await this.postInit();
  }

  private localePayload(raw: string) {
    const strings = this.stringsForPanel(raw);
    return {
      strings,
      targetLanguage: raw,
      targetLanguageIsCustom: !isBuiltinTargetLanguage(raw),
      languageOptions: this.languageOptions(),
      showLocaleBootstrapHint: this.showLocaleBootstrapHint,
    };
  }

  private applyPanelTitle(strings: Record<string, string>): void {
    if (!this.panel) return;
    this.panel.title = strings['panel.title'] ?? 'LinguaLens Settings';
  }

  private async postInit(): Promise<void> {
    if (!this.panel) return;
    const raw = this.rawTargetLanguage();
    const { strings, ...locale } = this.localePayload(raw);
    this.applyPanelTitle(strings);
    const baseUrl = this.config.get().llm.baseUrl;
    const apiKeyConfigured = this.apiKeys.isConfigured(baseUrl);
    this.panel.webview.postMessage({
      type: 'init',
      strings,
      ...locale,
      scope: this.scope,
      values: readPanelValues(this.scope),
      overrides: readOverrides(),
      apiKeyConfigured,
      cacheStats: this.cache.stats(),
      totalNativeSettings: this.totalNativeSettings,
    });
  }

  private async postLocaleUpdate(): Promise<void> {
    if (!this.panel) return;
    const raw = this.rawTargetLanguage();
    const { strings, ...locale } = this.localePayload(raw);
    this.applyPanelTitle(strings);
    if (!this.webviewReady) {
      await this.postInit();
      return;
    }
    this.panel.webview.postMessage({
      type: 'localeUpdate',
      strings,
      ...locale,
    });
  }

  private async postState(): Promise<void> {
    if (!this.panel) return;
    const baseUrl = this.config.get().llm.baseUrl;
    const apiKeyConfigured = this.apiKeys.isConfigured(baseUrl);
    this.panel.webview.postMessage({
      type: 'state',
      values: readPanelValues(this.scope),
      overrides: readOverrides(),
      cacheStats: this.cache.stats(),
      apiKeyConfigured,
    });
  }

  private async onMessage(msg: SettingsPanelMessageFromWebview): Promise<void> {
    if (!this.panel) return;
    switch (msg.type) {
      case 'ready':
        this.webviewReady = true;
        await this.postInit();
        break;
      case 'setScope':
        this.scope = msg.scope;
        await this.postLocaleUpdate();
        await this.postState();
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
        if (msg.key === 'targetLanguage') {
          this.showLocaleBootstrapHint = false;
        }
        await this.postState();
        if (msg.key === 'targetLanguage') await this.postLocaleUpdate();
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
        const strings = this.stringsForPanel(this.rawTargetLanguage());
        if (res.ok) {
          const line = (strings['panel.testConnection.success'] ?? 'OK ({0} ms)').replace(
            '{0}',
            String(res.latencyMs ?? 0),
          );
          const modelSuffix = res.model ? ` · ${res.model}` : '';
          this.panel.webview.postMessage({ type: 'testResult', ok: true, message: line + modelSuffix });
        } else {
          const err = redactForUserFacingText(res.message);
          this.panel.webview.postMessage({
            type: 'testResult',
            ok: false,
            message: (strings['panel.testConnection.fail'] ?? 'Failed: {0}').replace('{0}', err),
          });
        }
        break;
      }
      case 'clearCache': {
        const strings = this.stringsForPanel(this.rawTargetLanguage());
        const confirm = strings['panel.cache.clearConfirm'] ?? 'Clear all translation cache?';
        const yes = strings['panel.cache.clearYes'] ?? 'Clear';
        const pick = await vscode.window.showWarningMessage(confirm, { modal: true }, yes);
        if (pick === yes) {
          await this.cache.clear();
          await this.postState();
        }
        break;
      }
      case 'openNativeSettings':
        await vscode.commands.executeCommand(
          'workbench.action.openSettings',
          EXTENSION_SETTINGS_FILTER,
        );
        break;
      case 'openSetApiKey':
        await vscode.commands.executeCommand('linguaLens.setApiKey');
        await this.postState();
        break;
    }
  }
}
