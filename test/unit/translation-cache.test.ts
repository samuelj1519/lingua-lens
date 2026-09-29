/** ALLOW_CJK_FIXTURE: intentional Chinese samples for detection, documents, or l10n assertions. */
import { describe, expect, it } from 'vitest';
import { isCacheableTranslation } from '../../src/translation/cacheable';
import { sha256Hex } from '../../src/util/hash';
import { appendStreamDelta, parseSseDataLine } from '../../src/llm/sseContent';

describe('isCacheableTranslation', () => {
  it('rejects empty and whitespace', () => {
    expect(isCacheableTranslation('')).toBe(false);
    expect(isCacheableTranslation('   \n\t')).toBe(false);
  });

  it('accepts normal text', () => {
    expect(isCacheableTranslation('你好 world')).toBe(true);
  });
});

describe('cache key dimensions', () => {
  function key(parts: {
    text: string;
    targetLang: string;
    model: string;
    promptVersion: string;
    baseUrl: string;
    extraBodyHash: string;
  }): string {
    const raw = [
      parts.text,
      parts.targetLang,
      parts.model,
      parts.promptVersion,
      parts.baseUrl,
      parts.extraBodyHash,
    ].join('\u0000');
    return sha256Hex(raw);
  }

  it('changes when baseUrl changes', () => {
    const base = {
      text: 'hello',
      targetLang: 'zh-CN',
      model: 'm',
      promptVersion: 'hover.v1',
      extraBodyHash: 'ab',
    };
    const a = key({ ...base, baseUrl: 'https://a.com/v1' });
    const b = key({ ...base, baseUrl: 'https://b.com/v1' });
    expect(a).not.toBe(b);
  });

  it('changes when extraBody hash changes', () => {
    const base = {
      text: 'hello',
      targetLang: 'zh-CN',
      model: 'm',
      promptVersion: 'hover.v1',
      baseUrl: 'https://api.openai.com/v1',
    };
    const a = key({ ...base, extraBodyHash: 'aa' });
    const b = key({ ...base, extraBodyHash: 'bb' });
    expect(a).not.toBe(b);
  });

  it('selection vs hover prompt versions differ', () => {
    const base = {
      text: 'hello',
      targetLang: 'zh-CN',
      model: 'm',
      baseUrl: 'https://api.openai.com/v1',
      extraBodyHash: 'x',
    };
    const hover = key({ ...base, promptVersion: 'hover-template' });
    const selection = key({ ...base, promptVersion: 'selection-template' });
    expect(hover).not.toBe(selection);
  });
});

describe('streaming assembly', () => {
  it('accumulates content deltas', () => {
    let c = '';
    c = appendStreamDelta(c, { content: 'Hel' });
    c = appendStreamDelta(c, { content: 'lo' });
    expect(c).toBe('Hello');
  });

  it('parses SSE data lines', () => {
    const json = parseSseDataLine('data: {"choices":[{"delta":{"content":"x"}}]}');
    expect(json).toBeTruthy();
    const choices = json!.choices as { delta: { content: string } }[];
    expect(choices[0].delta.content).toBe('x');
  });
});

describe('empty cached entry handling', () => {
  it('treats empty restored text as non-cacheable', () => {
    expect(isCacheableTranslation('')).toBe(false);
    expect(isCacheableTranslation('   ')).toBe(false);
  });
});

describe('selection cache key alignment', () => {
  it('uses distinct keys for hover vs selection prompt versions', () => {
    const text = 'same text';
    const hoverKey = sha256Hex(
      [text, 'zh-CN', 'm', 'hover-pv', 'https://x/v1', 'eb'].join('\u0000'),
    );
    const selectionKey = sha256Hex(
      [text, 'zh-CN', 'm', 'selection-pv', 'https://x/v1', 'eb'].join('\u0000'),
    );
    expect(hoverKey).not.toBe(selectionKey);
    const selectionHit = sha256Hex(
      [text, 'zh-CN', 'm', 'selection-pv', 'https://x/v1', 'eb'].join('\u0000'),
    );
    expect(selectionKey).toBe(selectionHit);
  });
});
