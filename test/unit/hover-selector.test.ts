import { describe, expect, it } from 'vitest';
import { buildHoverDocumentSelector } from '../../src/constants/hoverSelector';

describe('buildHoverDocumentSelector', () => {
  it('matches by scheme only (no language wildcard)', () => {
    const sel = buildHoverDocumentSelector(['file', 'untitled', 'vscode-remote']);
    expect(sel).toEqual([{ scheme: 'file' }, { scheme: 'untitled' }, { scheme: 'vscode-remote' }]);
    expect(JSON.stringify(sel)).not.toContain('"language"');
  });
});
