import { describe, expect, it } from 'vitest';
import { MarkdownSegmenter } from '../../src/document/MarkdownSegmenter';

describe('MarkdownSegmenter', () => {
  const seg = new MarkdownSegmenter();

  it('preserves code blocks', () => {
    const md = '# Title\n\n```js\nconst x = 1;\n```\n\nHello world.';
    const segments = seg.segment(md);
    const preserved = segments.filter((s) => s.kind === 'preserved');
    expect(preserved.length).toBeGreaterThan(0);
    expect(preserved[0].sourceText).toContain('const x = 1');
  });

  it('creates translatable paragraphs', () => {
    const md = '## Install\n\nRun npm install.';
    const segments = seg.segment(md);
    const headings = segments.filter((s) => s.kind === 'heading');
    const paras = segments.filter((s) => s.kind === 'paragraph');
    expect(headings.length).toBe(1);
    expect(paras.length).toBe(1);
  });
});
