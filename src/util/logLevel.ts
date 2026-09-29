export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'off';

const ORDER: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'off'];

export function shouldLog(configured: LogLevel, messageLevel: LogLevel): boolean {
  if (configured === 'off') return false;
  return ORDER.indexOf(messageLevel) >= ORDER.indexOf(configured);
}
