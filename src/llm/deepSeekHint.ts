import * as vscode from 'vscode';
import { t } from '../l10n/uiL10n';
import { applyDeepSeekThinkingDisabledPreset } from './extraBodyActions';
import type { TranslateConfig } from '../config/types';
import { shouldOfferDeepSeekThinkingHint } from './thinkingMode';

export const DEEPSEEK_THINKING_HINT_DISMISSED_KEY = 'linguaLens.deepSeekThinkingHint.dismissed';

export { shouldOfferDeepSeekThinkingHint };

export async function maybeShowDeepSeekThinkingHint(
  context: vscode.ExtensionContext,
  cfg: TranslateConfig,
): Promise<void> {
  if (context.globalState.get(DEEPSEEK_THINKING_HINT_DISMISSED_KEY)) return;
  if (!shouldOfferDeepSeekThinkingHint(cfg)) return;

  const applyLabel = t('deepSeek.hint.apply');
  const dismissLabel = t('deepSeek.hint.dismiss');
  const choice = await vscode.window.showInformationMessage(t('deepSeek.hint.message'), applyLabel, dismissLabel);
  if (choice === applyLabel) {
    await applyDeepSeekThinkingDisabledPreset();
  } else if (choice === dismissLabel) {
    await context.globalState.update(DEEPSEEK_THINKING_HINT_DISMISSED_KEY, true);
  }
}
