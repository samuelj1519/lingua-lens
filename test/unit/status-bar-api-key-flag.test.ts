import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => {
  class EventEmitter<T> {
    event = () => ({ dispose: () => {} });
    fire(): void {}
  }
  class MarkdownString {
    value = '';
    isTrusted = false;
    appendMarkdown(s: string): void {
      this.value += s;
    }
  }
  const StatusBarAlignment = { Right: 1 };
  const createStatusBarItem = () => ({
    text: '',
    tooltip: undefined as unknown,
    command: '',
    show: () => {},
    hide: () => {},
    dispose: () => {},
  });
  return { EventEmitter, MarkdownString, StatusBarAlignment, window: { createStatusBarItem } };
});

import { StatusBarController } from '../../src/ui/StatusBarController';

describe('StatusBarController', () => {
  it('refresh does not call SecretStorage get for key presence', async () => {
    const getSpy = vi.fn();
    const apiKeys = {
      isConfigured: () => true,
      get: getSpy,
    };
    const config = {
      get: () => ({
        enabled: true,
        statusBar: { enabled: true },
        targetLanguage: 'zh-CN',
        llm: { baseUrl: 'https://api.example.com/v1', model: 'm' },
      }),
      onDidChange: () => ({ dispose: () => {} }),
    };
    const stats = {
      snapshot: () => ({
        apiCalls: 0,
        memoryHits: 0,
        diskHits: 0,
        skipped: 0,
        errors: 0,
        promptTokens: 0,
        completionTokens: 0,
      }),
      onDidChange: () => ({ dispose: () => {} }),
    };
    const bar = new StatusBarController(config as never, stats as never, apiKeys as never);
    await bar.refresh();
    expect(getSpy).not.toHaveBeenCalled();
    bar.dispose();
  });
});
