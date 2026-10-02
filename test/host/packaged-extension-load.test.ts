import { describe, expect, it, beforeAll } from 'vitest';
import { join } from 'path';
import { createRequire } from 'module';
import { execSync } from 'child_process';

describe('packaged extension entry', () => {
  beforeAll(() => {
    execSync('npm run build', { cwd: process.cwd(), stdio: 'pipe' });
  });

  it('loads dist/extension.js without jsonc-parser UMD resolution errors', () => {
    const entry = join(process.cwd(), 'dist', 'extension.js');
    const req = createRequire(import.meta.url);
    const Module = req('module') as typeof import('module');
    const originalLoad = Module._load;
    const vscodeStub = {
      window: { createOutputChannel: () => ({ appendLine: () => {}, show: () => {} }) },
      workspace: {
        getConfiguration: () => ({ get: () => undefined, update: () => Promise.resolve() }),
        onDidChangeConfiguration: () => ({ dispose: () => {} }),
        onDidCloseTextDocument: () => ({ dispose: () => {} }),
        registerTextDocumentContentProvider: () => ({ dispose: () => {} }),
        fs: { readFile: () => Promise.resolve(new Uint8Array()) },
      },
      languages: {
        registerCodeLensProvider: () => ({ dispose: () => {} }),
        registerHoverProvider: () => ({ dispose: () => {} }),
      },
      commands: { registerCommand: () => ({ dispose: () => {} }) },
      Uri: { parse: (s: string) => ({ toString: () => s, fsPath: s }) },
      ExtensionMode: { Production: 1 },
      env: { language: 'en', machineId: 'test', sessionId: 'test' },
      StatusBarAlignment: { Left: 1 },
      ProgressLocation: { Notification: 15 },
      ViewColumn: { Beside: 2 },
      CancellationTokenSource: class {
        token = { isCancellationRequested: false };
        cancel() {
          this.token.isCancellationRequested = true;
        }
      },
    };
    Module._load = function (request: string, parent: NodeModule, isMain: boolean) {
      if (request === 'vscode') return vscodeStub;
      return originalLoad.call(this, request, parent, isMain);
    };
    try {
      const mod = req(entry);
      expect(mod).toBeDefined();
      expect(typeof mod.activate).toBe('function');
    } finally {
      Module._load = originalLoad;
    }
  });
});
