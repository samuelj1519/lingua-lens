import * as vscode from 'vscode';

export interface SessionStats {
  apiCalls: number;
  memoryHits: number;
  diskHits: number;
  skipped: number;
  errors: number;
  promptTokens: number;
  completionTokens: number;
  startedAt: number;
}

export class StatsService {
  private stats: SessionStats = {
    apiCalls: 0,
    memoryHits: 0,
    diskHits: 0,
    skipped: 0,
    errors: 0,
    promptTokens: 0,
    completionTokens: 0,
    startedAt: Date.now(),
  };

  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChange = this.emitter.event;

  inc(field: keyof Omit<SessionStats, 'startedAt'>, by = 1): void {
    this.stats[field] += by;
    this.emitter.fire();
  }

  snapshot(): SessionStats {
    return { ...this.stats };
  }
}
