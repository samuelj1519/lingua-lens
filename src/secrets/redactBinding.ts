import { redactSecrets } from './redact';

/** Redact user-facing text without reading SecretStorage (Bearer / credential patterns only). */
export function redactForUserFacingText(text: string): string {
  return redactSecrets(text, []);
}
