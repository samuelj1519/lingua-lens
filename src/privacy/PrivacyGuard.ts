import picomatch from 'picomatch';
import * as vscode from 'vscode';
import type { ConfigService } from '../config/ConfigService';
import { containsSecret } from '../detection/secrets';
import { t } from '../l10n/uiL10n';

export type BlockReason = 'disabled' | 'workspaceDisabled' | 'excluded' | 'scheme' | 'untrusted' | 'noAck';

export class PrivacyGuard {
  constructor(
    private readonly config: ConfigService,
    private readonly context: vscode.ExtensionContext,
  ) {}

  check(doc: { uri: vscode.Uri }): BlockReason | null {
    const cfg = this.config.get(doc.uri);
    if (!cfg.enabled) return 'disabled';
    if (!cfg.privacy.allowedSchemes.includes(doc.uri.scheme)) return 'scheme';
    if (this.isExcluded(doc.uri, cfg.privacy.exclude)) return 'excluded';
    if (vscode.workspace.isTrusted === false) return 'untrusted';
    const origin = this.originOf(cfg.llm.baseUrl);
    if (!this.context.globalState.get<boolean>(`linguaLens.ack:${origin}`)) {
      return 'noAck';
    }
    return null;
  }

  containsSecret(text: string): boolean {
    const cfg = this.config.get();
    return cfg.privacy.blockSecrets && containsSecret(text);
  }

  async ensureAcknowledged(interactive: boolean): Promise<boolean> {
    const cfg = this.config.get();
    const origin = this.originOf(cfg.llm.baseUrl);
    const key = `linguaLens.ack:${origin}`;
    if (this.context.globalState.get<boolean>(key)) return true;
    if (!interactive) return false;
    const host = origin;
    const continueLabel = t('privacy.continue');
    const disableWs = t('privacy.disableWorkspace');
    const openSettings = t('privacy.openSettings');
    const choice = await vscode.window.showInformationMessage(
      t('privacy.prompt', host),
      { modal: true },
      continueLabel,
      disableWs,
      openSettings,
    );
    if (choice === continueLabel) {
      await this.context.globalState.update(key, true);
      return true;
    }
    if (choice === disableWs) {
      await this.config.setEnabled(false, vscode.workspace.workspaceFolders?.[0]?.uri);
      return false;
    }
    if (choice === openSettings) {
      await vscode.commands.executeCommand('linguaLens.openSettings');
    }
    return false;
  }

  async acknowledgeOrigin(origin?: string): Promise<void> {
    const cfg = this.config.get();
    const o = origin ?? this.originOf(cfg.llm.baseUrl);
    await this.context.globalState.update(`linguaLens.ack:${o}`, true);
  }

  private originOf(baseUrl: string): string {
    try {
      return new URL(baseUrl).origin;
    } catch {
      return baseUrl;
    }
  }

  private isExcluded(uri: vscode.Uri, patterns: string[]): boolean {
    if (uri.scheme !== 'file') return false;
    const rel = vscode.workspace.asRelativePath(uri, false);
    const abs = uri.fsPath.replace(/\\/g, '/');
    const matcher = picomatch(patterns, { dot: true });
    return matcher(rel) || matcher(abs);
  }
}
