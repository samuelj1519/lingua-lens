import * as vscode from 'vscode';

export class Logger {
  private readonly channel: vscode.LogOutputChannel;

  constructor() {
    this.channel = vscode.window.createOutputChannel('AI Translate', { log: true });
  }

  show(): void {
    this.channel.show();
  }

  info(message: string): void {
    this.channel.info(message);
  }

  warn(message: string): void {
    this.channel.warn(message);
  }

  error(message: string): void {
    this.channel.error(message);
  }

  trace(message: string): void {
    this.channel.trace(message);
  }

  dispose(): void {
    this.channel.dispose();
  }
}
