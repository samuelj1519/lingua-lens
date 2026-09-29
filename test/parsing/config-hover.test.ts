import { describe, expect, it } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { CombinedExtractor } from '../../src/parsing/CombinedExtractor';
import { ParserService } from '../../src/parsing/ParserService';
import { decide } from '../../src/detection/LanguageDetector';

const wasmDir = join(__dirname, '../../dist/wasm');
const noopLog = {
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  show: () => {},
};

const detOpts = {
  target: 'zh-CN' as const,
  minLength: 3,
  targetRatio: 0.6,
  reliableMinLength: 20,
  strictChineseVariant: false,
  userSkipPatterns: [],
  blockSecrets: true,
};

describe('config file hover extraction', () => {
  it('yaml: comment, value, key; skips Chinese value', async () => {
    if (!existsSync(join(wasmDir, 'tree-sitter-yaml.wasm'))) return;
    const src = `# English config comment\nmax_retry_count: Hello from yaml\nchinese_key: 简体中文说明\n`;
    const doc = { uri: 'file:///app.yaml', version: 1, languageId: 'yaml', getText: () => src };
    const parser = new ParserService(wasmDir, 1024, noopLog);
    const ex = new CombinedExtractor(parser, noopLog);

    const comment = await ex.extractAt(doc, src.indexOf('English config') + 2, { configKeys: true });
    expect(comment?.kind).toMatch(/Comment/);

    const value = await ex.extractAt(doc, src.indexOf('Hello from yaml') + 2, { configKeys: true });
    expect(value?.kind).toBe('string');
    expect(value?.text).toContain('Hello');

    const key = await ex.extractAt(doc, src.indexOf('max_retry') + 3, { configKeys: true });
    expect(key?.kind).toBe('configKey');
    expect(key?.text).toContain('retry');

    const zh = await ex.extractAt(doc, src.indexOf('简体中文') + 1, { configKeys: true });
    expect(zh?.kind).toBe('string');
    expect(decide(zh!.text, detOpts).action).toBe('skip');

    parser.dispose();
  });

  it('toml: comment, value, key', async () => {
    if (!existsSync(join(wasmDir, 'tree-sitter-toml.wasm'))) return;
    const src = `# English toml comment\nmax_retry_count = "Hello from toml"\n`;
    const doc = { uri: 'file:///app.toml', version: 1, languageId: 'toml', getText: () => src };
    const parser = new ParserService(wasmDir, 1024, noopLog);
    const ex = new CombinedExtractor(parser, noopLog);

    const comment = await ex.extractAt(doc, src.indexOf('English toml') + 2, { configKeys: true });
    expect(comment?.kind).toMatch(/Comment/);

    const value = await ex.extractAt(doc, src.indexOf('Hello from toml') + 2, { configKeys: true });
    expect(value?.kind).toBe('string');

    const key = await ex.extractAt(doc, src.indexOf('max_retry') + 4, { configKeys: true });
    expect(key?.kind).toBe('configKey');

    parser.dispose();
  });
});
