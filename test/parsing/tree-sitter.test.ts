import { describe, expect, it } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { ParserService } from '../../src/parsing/ParserService';
import { TreeSitterExtractor } from '../../src/parsing/TreeSitterExtractor';

const wasmDir = join(__dirname, '../../dist/wasm');

describe('TreeSitterExtractor', () => {
  it('parses TypeScript comment when wasm present', async () => {
    if (!existsSync(join(wasmDir, 'tree-sitter.wasm'))) {
      console.warn('Skipping: wasm not built');
      return;
    }
    const noopLog = { trace: () => {}, debug: () => {}, info: () => {}, warn: () => {}, error: () => {}, show: () => {} };
    const parser = new ParserService(wasmDir, 1024, noopLog);
    const extractor = new TreeSitterExtractor(parser);
    const src = '// line one\n// line two\nconst a = "hi";\n';
    const doc = {
      uri: 'file:///t.ts',
      version: 1,
      languageId: 'typescript',
      getText: () => src,
    };
    const atComment = await extractor.extractAt(doc, 3);
    expect(atComment?.kind).toBe('lineComment');
    const atString = await extractor.extractAt(doc, src.indexOf('hi') + 1);
    expect(atString?.kind).toBe('string');
    parser.dispose();
  });
});
