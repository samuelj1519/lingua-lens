import * as vscode from 'vscode';
import { EXTRA_BODY_TEMPLATE_DEEPSEEK } from '../settingsPanel/extraBody';

export async function applyDeepSeekThinkingDisabledPreset(
  target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global,
): Promise<void> {
  await vscode.workspace
    .getConfiguration('linguaLens')
    .update('llm.extraBody', EXTRA_BODY_TEMPLATE_DEEPSEEK, target);
}

export async function openExtraBodySettings(): Promise<void> {
  await vscode.commands.executeCommand(
    'workbench.action.openSettings',
    '@ext:samuel-j.lingua-lens linguaLens.llm.extraBody',
  );
}
