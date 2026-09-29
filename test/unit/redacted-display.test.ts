import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const { showErrorMessage } = vi.hoisted(() => ({
  showErrorMessage: vi.fn(),
}));

vi.mock('vscode', () => ({
  window: { showErrorMessage },
}));

import { bindSecretRedaction } from '../../src/secrets/redactBinding';
import { showRedactedError } from '../../src/secrets/redactedDisplay';

const SECRET = 'leaked-secret-value-99';

class MockApiKeyStore {
  async getAllStoredValues(): Promise<string[]> {
    return [SECRET];
  }
}

describe('showRedactedError', () => {
  beforeEach(() => {
    showErrorMessage.mockClear();
    bindSecretRedaction(new MockApiKeyStore() as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('redacts known secrets before showing error toast', async () => {
    await showRedactedError(`Failed: ${SECRET}`);
    expect(showErrorMessage).toHaveBeenCalledOnce();
    const shown = String(showErrorMessage.mock.calls[0][0]);
    expect(shown).not.toContain(SECRET);
    expect(shown).toContain('***');
  });
});
