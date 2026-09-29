import * as vscode from 'vscode';
import {
  CURSOR_UI_BOOTSTRAP_HINT_KEY,
  CURSOR_UI_BOOTSTRAP_STATE_KEY,
  isTargetLanguageUnset,
  mapVscodeUiLanguageToTarget,
} from './targetLanguage';
import type { TargetLang } from '../types';

export type TargetLanguageBootstrapResult = {
  applied: boolean;
  target?: TargetLang;
};

/**
 * On first activation, if targetLanguage was never explicitly set, align it with Cursor UI language once.
 */
export async function applyTargetLanguageCursorUiBootstrap(
  context: vscode.ExtensionContext,
): Promise<TargetLanguageBootstrapResult> {
  if (context.globalState.get<boolean>(CURSOR_UI_BOOTSTRAP_STATE_KEY)) {
    return { applied: false };
  }

  const cfg = vscode.workspace.getConfiguration('linguaLens');
  const inspect = cfg.inspect<string>('targetLanguage');

  await context.globalState.update(CURSOR_UI_BOOTSTRAP_STATE_KEY, true);

  if (!isTargetLanguageUnset(inspect)) {
    return { applied: false };
  }

  const target = mapVscodeUiLanguageToTarget(vscode.env.language);
  await cfg.update('targetLanguage', target, vscode.ConfigurationTarget.Global);
  await context.globalState.update(CURSOR_UI_BOOTSTRAP_HINT_KEY, true);
  return { applied: true, target };
}

export function consumeCursorUiBootstrapHint(context: vscode.ExtensionContext): boolean {
  if (!context.globalState.get<boolean>(CURSOR_UI_BOOTSTRAP_HINT_KEY)) return false;
  void context.globalState.update(CURSOR_UI_BOOTSTRAP_HINT_KEY, undefined);
  return true;
}
