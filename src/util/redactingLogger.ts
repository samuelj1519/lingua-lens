import { redactForUserFacingText } from '../secrets/redactBinding';
import type { AppLogger } from './logger';

export function wrapRedactingLogger(inner: AppLogger): AppLogger {
  const emit = (level: 'trace' | 'debug' | 'info' | 'warn' | 'error', m: string) => {
    void redactForUserFacingText(m).then((redacted) => {
      inner[level](redacted);
    });
  };
  return {
    trace: (m) => emit('trace', m),
    debug: (m) => emit('debug', m),
    info: (m) => emit('info', m),
    warn: (m) => emit('warn', m),
    error: (m) => emit('error', m),
    show: () => inner.show(),
  };
}
