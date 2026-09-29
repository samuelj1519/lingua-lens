import * as vscode from 'vscode';
import type { ConfigService } from '../config/ConfigService';
import type { PrivacyGuard } from '../privacy/PrivacyGuard';
import type { LlmClient } from '../llm/LlmClient';

export async function suggestVariableNames(
  _config: ConfigService,
  guard: PrivacyGuard,
  llm: LlmClient,
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const desc =
    editor && !editor.selection.isEmpty
      ? editor.document.getText(editor.selection)
      : await vscode.window.showInputBox({ prompt: '输入中文或英文功能描述' });
  if (!desc?.trim()) return;
  if (!(await guard.ensureAcknowledged(true))) return;

  const messages = [
    {
      role: 'system' as const,
      content:
        'Suggest English programming identifiers for the user description. Return JSON: {"camelCase":"","snake_case":"","PascalCase":""}. Only valid identifiers, no explanation.',
    },
    { role: 'user' as const, content: desc.trim() },
  ];
  try {
    const res = await llm.chat({ messages, json: true, maxTokens: 256, priority: 'interactive' });
    const data = JSON.parse(res.content) as Record<string, string>;
    const pick = await vscode.window.showQuickPick(
      ['camelCase', 'snake_case', 'PascalCase'].map((k) => ({
        label: data[k] ?? k,
        description: k,
      })),
      { title: '选择要插入的命名风格' },
    );
    if (!pick) return;
    if (editor) {
      await editor.edit((eb) => {
        if (editor.selection.isEmpty) eb.insert(editor.selection.active, pick.label);
        else eb.replace(editor.selection, pick.label);
      });
    } else {
      await vscode.env.clipboard.writeText(pick.label);
      void vscode.window.showInformationMessage(`已复制: ${pick.label}`);
    }
  } catch (e) {
    void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
  }
}
