import * as vscode from 'vscode';
import { LlmError } from '../llm/errors';
import { localizedLlmErrorMessage, showReasoningBudgetError } from '../llm/llmErrorUi';
import { redactForUserFacingText } from './redactBinding';

export function showRedactedError(message: string): void {
  void vscode.window.showErrorMessage(redactForUserFacingText(message));
}

export async function handleCommandLlmError(e: unknown): Promise<void> {
  if (e instanceof LlmError && e.kind === 'reasoningBudget') {
    await showReasoningBudgetError(e);
    return;
  }
  const raw =
    e instanceof LlmError ? localizedLlmErrorMessage(e) : e instanceof Error ? e.message : String(e);
  showRedactedError(raw);
}
