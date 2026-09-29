/** ALLOW_CJK_FIXTURE: intentional Chinese samples for detection, documents, or l10n assertions. */
import { describe, expect, it } from 'vitest';
import { parseBatchResponse, PromptBuilder, sanitizeModelOutput } from '../../src/prompts/PromptBuilder';

describe('PromptBuilder', () => {
  const pb = new PromptBuilder();

  it('builds single prompt with markers', () => {
    const msgs = pb.buildSingle('Hello world', {
      kind: 'hover',
      targetLang: 'zh-CN',
      glossary: [],
      languageId: 'typescript',
      unitKind: 'lineComment',
    });
    expect(msgs[1].content).toContain('<<<SOURCE');
    expect(msgs[1].content).toContain('Hello world');
  });

  it('parses batch JSON', () => {
    const map = parseBatchResponse('{"items":[{"id":"s0","translation":"你好"}]}');
    expect(map.get('s0')).toBe('你好');
  });

  it('parses fenced JSON', () => {
    const map = parseBatchResponse('```json\n{"items":[{"id":"s1","translation":"x"}]}\n```');
    expect(map.get('s1')).toBe('x');
  });

  it('sanitizes output', () => {
    expect(sanitizeModelOutput('"hello"')).toBe('hello');
    expect(sanitizeModelOutput('Translation: hi')).toBe('hi');
  });
});
