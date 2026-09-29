import { redactForUserFacingText } from '../secrets/redactBinding';
import type { AppLogger } from './logger';

export function wrapRedactingLogger(inner: AppLogger): AppLogger {
  const r = (m: string) => redactForUserFacingText(m);
  return {
    trace: (m) => inner.trace(r(m)),
    debug: (m) => inner.debug(r(m)),
    info: (m) => inner.info(r(m)),
    warn: (m) => inner.warn(r(m)),
    error: (m) => inner.error(r(m)),
    show: () => inner.show(),
  };
}
