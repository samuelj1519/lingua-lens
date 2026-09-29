import type * as vscode from 'vscode';

export function cancellableDelay(ms: number, token: vscode.CancellationToken): Promise<boolean> {
  if (token.isCancellationRequested) {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      dispose();
      resolve(!token.isCancellationRequested);
    }, ms);
    const sub = token.onCancellationRequested(() => {
      dispose();
      resolve(false);
    });
    function dispose() {
      clearTimeout(timer);
      sub.dispose();
    }
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
