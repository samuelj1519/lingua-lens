import { describe, expect, it } from 'vitest';
import { hoverActionLinks } from '../../src/hover/hoverActionLinks';

describe('hoverActionLinks', () => {
  it('includes refresh alongside copy and replace', () => {
    const links = hoverActionLinks('abc123', {
      copy: true,
      replaceSelection: true,
      insertBelow: true,
      refresh: true,
    });
    expect(links).toContain('刷新');
    expect(links).toContain('aiTranslate.hover.refresh');
    expect(links).toContain('复制');
    expect(links).toContain('替换选区');
    expect(links).toContain('插入下方');
  });

  it('encodes action id in command args', () => {
    const links = hoverActionLinks('deadbeef', { refresh: true });
    expect(links).toContain(encodeURIComponent(JSON.stringify(['deadbeef'])));
  });
});
