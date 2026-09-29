import * as vscode from 'vscode';
import { LlmError } from './errors';
import { localizedLlmErrorMessage, showReasoningBudgetError } from './llmErrorUi';

export async function handleCommandLlmError(e: unknown): Promise<void> {
  if (e instanceof LlmError && e.kind === 'reasoningBudget') {
    await showReasoningBudgetError(e);
    return;
  }
  const message =
    e instanceof LlmError ? localizedLlmErrorMessage(e) : e instanceof Error ? e.message : String(e);
  void vscode.window.showErrorMessage(message);
}
