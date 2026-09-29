import { describe, expect, it } from 'vitest';
import { redactSecrets } from '../../src/secrets/redact';

describe('redactSecrets', () => {
  const known = ['supersecretkeyvalue12345'];

  it('redacts exact known values and URL-encoded forms', () => {
    const raw = `failed: ${known[0]} and ${encodeURIComponent(known[0])}`;
    const out = redactSecrets(raw, known);
    expect(out).not.toContain(known[0]);
    expect(out).toContain('***');
  });

  it('does not redact known values shorter than 8 characters', () => {
    const out = redactSecrets('shortkey', ['short']);
    expect(out).toBe('shortkey');
  });

  it('redacts Bearer and credential key assignments', () => {
    const out = redactSecrets('Auth Bearer abcdef1234567890 and api_key=realvaluehere123', []);
    expect(out).toContain('Bearer ***');
    expect(out).toContain('api_key=***');
    expect(out).not.toContain('realvaluehere123');
  });

  it('does not break desk-top-application via sk- prefix rules', () => {
    const out = redactSecrets('Error in desk-top-application module', known);
    expect(out).toBe('Error in desk-top-application module');
  });

  it('redacts emails', () => {
    const out = redactSecrets('Contact user@example.com', []);
    expect(out).toContain('***@***');
  });
});
