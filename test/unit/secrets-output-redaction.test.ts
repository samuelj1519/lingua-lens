import { describe, expect, it, vi, beforeEach } from 'vitest';
import { redactSecrets } from '../../src/secrets/redact';
import { bindSecretRedaction, redactForUserFacingText } from '../../src/secrets/redactBinding';
import { formatLlmFailureLogLine } from '../../src/llm/requestFailureLog';
import { LlmError } from '../../src/llm/errors';
import { decide } from '../../src/detection/LanguageDetector';

const SECRET = 'sk-test-redact-key-abcdefghijklmnop';

class MockApiKeyStore {
  async getAllStoredValues(): Promise<string[]> {
    return [SECRET];
  }
}

describe('output redaction', () => {
  beforeEach(() => {
    bindSecretRedaction(new MockApiKeyStore() as never);
  });

  const cases = [
    ['raw key', `Error: ${SECRET}`],
    ['url-encoded key', `failed ${encodeURIComponent(SECRET)}`],
    ['Authorization header', `Authorization: Bearer ${SECRET}`],
    ['credential assignment', `api_key=${SECRET}`],
  ] as const;

  it.each(cases)('redactSecrets masks %s', (_label, input) => {
    const out = redactSecrets(input, [SECRET]);
    expect(out).not.toContain(SECRET);
    expect(out).toContain('***');
  });

  it('redactForUserFacingText loads keys from SecretStorage binding', async () => {
    const out = await redactForUserFacingText(`Bearer ${SECRET} leaked`);
    expect(out).not.toContain(SECRET);
  });

  it('LLM failure log line never includes Authorization or key material', () => {
    const line = formatLlmFailureLogLine({
      feature: 'hover',
      model: 'gpt-4',
      baseUrl: 'https://api.example.com/v1',
      httpStatus: 401,
      error: new LlmError('auth', `Invalid key ${SECRET}`, 401),
    });
    expect(line).not.toContain(SECRET);
    expect(line).not.toMatch(/Bearer/i);
    expect(line).toContain('error=auth');
  });
});

describe('no content secret detection', () => {
  const baseOpts = {
    target: 'zh-CN' as const,
    minLength: 3,
    targetRatio: 0.6,
    reliableMinLength: 20,
    strictChineseVariant: false,
    userSkipPatterns: [] as RegExp[],
  };

  it('does not skip translation for sk- style strings in body text', () => {
    const text = 'const x = "sk-proj-' + 'a'.repeat(24) + '";';
    expect(decide(text, baseOpts).action).toBe('translate');
  });
});
