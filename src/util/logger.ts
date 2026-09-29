import * as vscode from 'vscode';
import type { LogLevel } from './logLevel';
import { shouldLog } from './logLevel';

export interface AppLogger {
  trace(message: string): void;
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  show(): void;
}

export class Logger implements AppLogger {
  private readonly channel: vscode.LogOutputChannel;
  private getLevel: () => LogLevel;

  constructor(getLevel: () => LogLevel = () => 'info') {
    this.channel = vscode.window.createOutputChannel('LinguaLens', { log: true });
    this.getLevel = getLevel;
  }

  setLevelProvider(getLevel: () => LogLevel): void {
    this.getLevel = getLevel;
  }

  show(): void {
    this.channel.show();
  }

  trace(message: string): void {
    if (shouldLog(this.getLevel(), 'trace')) this.channel.trace(message);
  }

  debug(message: string): void {
    if (shouldLog(this.getLevel(), 'debug')) this.channel.debug(message);
  }

  info(message: string): void {
    if (shouldLog(this.getLevel(), 'info')) this.channel.info(message);
  }

  warn(message: string): void {
    if (shouldLog(this.getLevel(), 'warn')) this.channel.warn(message);
  }

  error(message: string): void {
    if (shouldLog(this.getLevel(), 'error')) this.channel.error(message);
  }

  dispose(): void {
    this.channel.dispose();
  }
}
