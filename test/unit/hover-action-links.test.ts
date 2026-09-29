import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { hoverActionLinks } from '../../src/hover/hoverActionLinks';
import { initUiL10n, t } from '../../src/l10n/uiL10n';

const root = join(import.meta.dirname, '../..');

describe('hoverActionLinks', () => {
  beforeAll(() => {
    initUiL10n(root, () => 'zh-CN');
  });

  it('includes refresh alongside copy and replace', () => {
    const links = hoverActionLinks('abc123', {
      copy: true,
      replaceSelection: true,
      insertBelow: true,
      refresh: true,
    });
    expect(links).toContain(t('hover.action.refresh'));
    expect(links).toContain('linguaLens.hover.refresh');
    expect(links).toContain(t('hover.action.copy'));
    expect(links).toContain(t('hover.action.replaceSelection'));
    expect(links).toContain(t('hover.action.insertBelow'));
  });

  it('encodes action id in command args', () => {
    const links = hoverActionLinks('deadbeef', { refresh: true });
    expect(links).toContain(encodeURIComponent(JSON.stringify(['deadbeef'])));
  });
});
