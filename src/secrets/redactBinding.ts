import type { ApiKeyStore } from './ApiKeyStore';
import { redactSecrets } from './redact';

let store: ApiKeyStore | undefined;

/** Called once at activation so user-facing output can redact stored keys on demand. */
export function bindSecretRedaction(apiKeyStore: ApiKeyStore): void {
  store = apiKeyStore;
}

export async function redactForUserFacingText(text: string): Promise<string> {
  if (!store) return redactSecrets(text, []);
  const known = await store.getAllStoredValues();
  return redactSecrets(text, known);
}
