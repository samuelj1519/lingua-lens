import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import Parser from 'web-tree-sitter';
import { ParserService } from '../../src/parsing/ParserService';
import { CombinedExtractor } from '../../src/parsing/CombinedExtractor';

const noopLog = {
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  show: () => {},
};

/** Mirrors extension host: extensionPath/dist/wasm */
const wasmDir = join(process.cwd(), 'dist', 'wasm');

describe('packaged wasm layout (extension host)', () => {
  it('loads runtime and TypeScript grammar from dist/wasm', async () => {
    if (!existsSync(join(wasmDir, 'tree-sitter.wasm'))) {
      console.warn('skip: run npm run build first');
      return;
    }
    const parser = new ParserService(wasmDir, 1024, noopLog);
    const src = '// English comment for hover test\nconst x = 1;\n';
    const doc = { uri: 'file:///sample.ts', version: 1, languageId: 'typescript', getText: () => src };
    const tree = await parser.getTree(doc);
    expect(tree).toBeDefined();
    const extractor = new CombinedExtractor(parser, noopLog);
    const unit = await extractor.extractAt(doc, 3);
    expect(unit?.kind).toBe('lineComment');
    expect(unit?.text).toMatch(/English comment/);
    parser.dispose();
  });

  it('Parser.init locateFile resolves like extension', async () => {
    if (!existsSync(join(wasmDir, 'tree-sitter-javascript.wasm'))) return;
    await Parser.init({ locateFile: (f) => join(wasmDir, f) });
    const lang = await Parser.Language.load(readFileSync(join(wasmDir, 'tree-sitter-javascript.wasm')));
    expect(lang).toBeDefined();
  });
});
