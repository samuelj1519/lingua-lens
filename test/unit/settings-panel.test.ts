import { describe, expect, it } from 'vitest';
import {
  EXTRA_BODY_TEMPLATE_DEEPSEEK,
  EXTRA_BODY_TEMPLATE_QWEN,
  parseExtraBodyJson,
} from '../../src/settingsPanel/extraBody';
import { redactSecrets } from '../../src/secrets/redact';
import { loadBundleStrings, loadBundleStringsForPanel } from '../../src/l10n/bundleStrings';
import { PANEL_CONFIG_KEYS } from '../../src/settingsPanel/protocol';

describe('settings panel helpers', () => {
  it('validates extraBody JSON', () => {
    expect(parseExtraBodyJson('')).toEqual({ ok: true, value: {} });
    expect(parseExtraBodyJson('{"a":1}')).toEqual({ ok: true, value: { a: 1 } });
    expect(parseExtraBodyJson('[').ok).toBe(false);
    expect(parseExtraBodyJson('null').ok).toBe(false);
  });

  it('applies extraBody templates', () => {
    expect(EXTRA_BODY_TEMPLATE_DEEPSEEK).toEqual({ thinking: { type: 'disabled' } });
    expect(EXTRA_BODY_TEMPLATE_QWEN).toEqual({ enable_thinking: false });
  });

  it('redacts secrets from connection errors', () => {
    const secret = 'supersecretkeyvalue12345';
    const msg = `Auth failed: Bearer ${secret} api_key=${secret}`;
    const out = redactSecrets(msg, [secret]);
    expect(out).not.toContain(secret);
    expect(out).toContain('Bearer ***');
  });

  it('loadBundleStrings falls back to English', () => {
    const en = { 'panel.title': 'English' };
    const strings = loadBundleStrings((loc) => (loc === 'en' ? en : undefined), 'ja');
    expect(strings['panel.title']).toBe('English');
  });

  it('loadBundleStringsForPanel uses English-only UI for custom targets', () => {
    const strings = loadBundleStringsForPanel(
      (loc) => (loc === 'en' ? { 'panel.title': 'EN' } : { 'panel.title': 'JA' }),
      'custom-lang',
    );
    expect(strings['panel.title']).toBe('EN');
  });

  it('panel exposes expected config keys', () => {
    expect(PANEL_CONFIG_KEYS).toContain('llm.baseUrl');
    expect(PANEL_CONFIG_KEYS).toContain('document.forceTranslate');
  });
});
