/** ALLOW_CJK_FIXTURE: intentional Chinese samples for detection, documents, or l10n assertions. */
import { describe, expect, it } from 'vitest';
import { locateSegmentAtOffset } from '../../src/document/DocumentSegmentLocator';
import { DocumentHoverExtractor } from '../../src/document/DocumentHoverExtractor';
import { decide } from '../../src/detection/LanguageDetector';

const noopLog = {
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  show: () => {},
};

const mdFixture = `# Title

This is an English paragraph for document hover testing.

\`\`\`javascript
const code = 'not hoverable';
\`\`\`

这是简体中文段落，不应触发翻译。
`;

describe('document paragraph hover', () => {
  it('locates English paragraph in markdown', () => {
    const idx = mdFixture.indexOf('English paragraph');
    const loc = locateSegmentAtOffset(mdFixture, 'markdown', idx);
    expect(loc?.text).toContain('English paragraph');
  });

  it('returns null inside fenced code block', () => {
    const idx = mdFixture.indexOf('not hoverable');
    expect(locateSegmentAtOffset(mdFixture, 'markdown', idx)).toBeNull();
  });

  it('skips Chinese paragraph via detection', () => {
    const idx = mdFixture.indexOf('简体中文');
    const loc = locateSegmentAtOffset(mdFixture, 'markdown', idx);
    expect(loc).not.toBeNull();
    const decision = decide(loc!.text, {
      target: 'zh-CN',
      minLength: 3,
      targetRatio: 0.6,
      reliableMinLength: 20,
      strictChineseVariant: false,
      userSkipPatterns: [],
      blockSecrets: true,
    });
    expect(decision.action).toBe('skip');
  });

  it('extracts plain text file paragraph', () => {
    const txt = 'Hello from a txt file.\n\n中文段落。\n';
    const ex = new DocumentHoverExtractor(noopLog);
    const doc = {
      uri: 'file:///readme.txt',
      version: 1,
      languageId: 'plaintext',
      getText: () => txt,
    };
    const unit = ex.extractAt(doc, txt.indexOf('Hello'));
    expect(unit?.source).toBe('document');
    expect(unit?.text).toContain('Hello');
  });
});
