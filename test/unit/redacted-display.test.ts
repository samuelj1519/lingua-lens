import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const { showErrorMessage } = vi.hoisted(() => ({
  showErrorMessage: vi.fn(),
}));

vi.mock('vscode', () => ({
  window: { showErrorMessage },
}));

import { showRedactedError } from '../../src/secrets/redactedDisplay';

describe('showRedactedError', () => {
  beforeEach(() => {
    showErrorMessage.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('redacts Bearer tokens without reading SecretStorage', () => {
    const token = 'leaked-bearer-token-value-99';
    showRedactedError(`Failed: Bearer ${token}`);
    expect(showErrorMessage).toHaveBeenCalledOnce();
    const shown = String(showErrorMessage.mock.calls[0][0]);
    expect(shown).not.toContain(token);
    expect(shown).toContain('***');
  });
});
