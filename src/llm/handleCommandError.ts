import { handleCommandLlmError as handleRedacted } from '../secrets/redactedDisplay';

export async function handleCommandLlmError(e: unknown): Promise<void> {
  await handleRedacted(e);
}
