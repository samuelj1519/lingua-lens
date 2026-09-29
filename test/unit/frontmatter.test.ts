import { describe, expect, it } from 'vitest';
import {
  detectFrontmatterBlock,
  formatFrontmatterYamlComments,
  isNonNaturalLanguageValue,
  parseFrontmatterFields,
  shouldTranslateFrontmatterField,
} from '../../src/document/frontmatterParse';
import { buildFrontmatterSegments } from '../../src/document/frontmatterSegments';
import { MarkdownSegmenter } from '../../src/document/MarkdownSegmenter';
import { assembleDocument } from '../../src/document/DocumentAssembler';
import type { DocSession } from '../../src/document/DocTranslationService';
import { defaultMarkdownSegmentConfig } from '../../src/document/markdownSegmentConfig';
import { locateSegmentAtOffset } from '../../src/document/DocumentSegmentLocator';

const cfg = defaultMarkdownSegmentConfig();

describe('frontmatter parse', () => {
  it('detects --- yaml block', () => {
    const src = '---\nname: grilling\ndescription: Grill the user.\n---\n\nBody';
    const block = detectFrontmatterBlock(src);
    expect(block).not.toBeNull();
    expect(block!.fence).toBe('---');
    expect(block!.end).toBeLessThan(src.indexOf('Body'));
  });

  it('parses quoted and plain scalars', () => {
    const src = '---\ndescription: "Hello world"\ntitle: Plain title\n---\n';
    const block = detectFrontmatterBlock(src)!;
    const fields = parseFrontmatterFields(src, block);
    expect(fields.find((f) => f.key === 'description')?.valueText).toBe('Hello world');
    expect(fields.find((f) => f.key === 'title')?.valueText).toBe('Plain title');
  });

  it('parses block scalar', () => {
    const src = '---\ndescription: |\n  Line one\n  Line two\nname: x\n---\n';
    const block = detectFrontmatterBlock(src)!;
    const fields = parseFrontmatterFields(src, block);
    const d = fields.find((f) => f.key === 'description');
    expect(d?.valueText).toBe('Line one\nLine two');
  });

  it('skips non-whitelist and identifier values', () => {
    expect(isNonNaturalLanguageValue('grilling', 'name')).toBe(true);
    const src = '---\nname: grilling\ncustom: Should not translate by default\n---\n';
    const block = detectFrontmatterBlock(src)!;
    const fields = parseFrontmatterFields(src, block);
    const custom = fields.find((f) => f.key === 'custom')!;
    expect(shouldTranslateFrontmatterField(custom, cfg.markdown.frontmatterFields, cfg)).toBe(false);
  });

  it('does not translate simplified Chinese description', () => {
    const src = '---\ndescription: 这是简体中文说明\n---\n';
    const block = detectFrontmatterBlock(src)!;
    const field = parseFrontmatterFields(src, block)[0];
    expect(shouldTranslateFrontmatterField(field, cfg.markdown.frontmatterFields, cfg)).toBe(false);
  });
});

describe('frontmatter segments & preview', () => {
  const skillFixture = `---
name: grilling
description: Grill the user relentlessly about a plan.
---

Interview the user.
`;

  it('creates frontmatter segment for description only', () => {
    const segs = new MarkdownSegmenter().segment(skillFixture, cfg);
    const fm = segs.filter((s) => s.kind === 'frontmatter');
    expect(fm).toHaveLength(1);
    expect(fm[0].sourceText).toContain('Grill the user');
    expect(fm[0].frontmatterMeta?.fieldKey).toBe('description');
  });

  it('interleaved preview inserts valid YAML comments', () => {
    const segs = new MarkdownSegmenter().segment(skillFixture, cfg);
    const fm = segs.find((s) => s.kind === 'frontmatter')!;
    const session: DocSession = {
      sourceUri: { scheme: 'file', path: '/x/SKILL.md' } as import('vscode').Uri,
      previewUri: { scheme: 'aitranslate', path: '/x.preview.md' } as import('vscode').Uri,
      target: 'zh-CN',
      sourceVersion: 1,
      sourceLabel: 'SKILL.md',
      segments: segs,
      results: new Map([[fm.id, { status: 'done', text: '无情拷问用户的计划。' }]]),
      cts: { token: { isCancellationRequested: false }, cancel: () => {} } as import('vscode').CancellationTokenSource,
      doneCount: 1,
      totalTranslatable: 1,
      sourceText: skillFixture,
    };
    const out = assembleDocument(skillFixture, session, 'interleaved');
    const body = out.split('\n\n').slice(1).join('\n\n');
    expect(body).toContain('description: Grill the user relentlessly');
    expect(body).toMatch(/# 描述：无情拷问用户的计划。/);
    expect(body).toContain('---');
    const fmBlock = body.slice(0, body.indexOf('---', 4));
    expect(fmBlock).not.toMatch(/\n[^#\n-].*无情拷问/);
  });

  it('hover locates description value', () => {
    const idx = skillFixture.indexOf('Grill the user') + 2;
    const loc = locateSegmentAtOffset(skillFixture, 'markdown', idx);
    expect(loc?.segment.kind).toBe('frontmatter');
  });

  it('formatFrontmatterYamlComments handles multiline', () => {
    expect(formatFrontmatterYamlComments('description', 'a\nb')).toBe('# 描述：a\n# b');
  });

  it('empty whitelist disables frontmatter segments', () => {
    const segs = buildFrontmatterSegments(skillFixture, {
      ...cfg,
      markdown: { frontmatterFields: [] },
    }, 0);
    expect(segs.segments.every((s) => s.kind === 'preserved')).toBe(true);
  });
});
