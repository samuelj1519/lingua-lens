import * as vscode from 'vscode';
import { t } from '../l10n/uiL10n';
import type { LlmError } from './errors';
import { applyDeepSeekThinkingDisabledPreset, openExtraBodySettings } from './extraBodyActions';
import { redactForUserFacingText } from '../secrets/redactBinding';

export function localizedLlmErrorMessage(e: LlmError): string {
  if (e.kind === 'reasoningBudget') return t('llm.error.reasoningBudget');
  return e.message;
}

export async function showReasoningBudgetError(e: LlmError): Promise<void> {
  if (e.kind !== 'reasoningBudget') {
    void vscode.window.showErrorMessage(redactForUserFacingText(localizedLlmErrorMessage(e)));
    return;
  }
  const applyLabel = t('llm.error.action.applyThinkingOff');
  const settingsLabel = t('llm.error.action.openExtraBodySettings');
  const choice = await vscode.window.showErrorMessage(
    redactForUserFacingText(localizedLlmErrorMessage(e)),
    applyLabel,
    settingsLabel,
  );
  if (choice === applyLabel) await applyDeepSeekThinkingDisabledPreset();
  else if (choice === settingsLabel) await openExtraBodySettings();
}

export function reasoningBudgetHoverLinks(): string {
  const apply = t('llm.error.action.applyThinkingOff');
  const settings = t('llm.error.action.openExtraBodySettings');
  return `[${apply}](command:linguaLens.applyDeepSeekExtraBodyPreset) · [${settings}](command:linguaLens.openExtraBodySettings)`;
}
