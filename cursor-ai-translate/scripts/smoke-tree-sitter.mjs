import Parser from 'web-tree-sitter';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wasmDir = join(root, 'dist', 'wasm');

await Parser.init({
  locateFile: (file) => join(wasmDir, file),
});

const jsWasm = join(wasmDir, 'tree-sitter-javascript.wasm');
if (!existsSync(jsWasm)) {
  console.error('tree-sitter-javascript.wasm not found');
  process.exit(1);
}

const lang = await Parser.Language.load(readFileSync(jsWasm));
const parser = new Parser();
parser.setLanguage(lang);
const tree = parser.parse('// hello\nconst x = "world";');
const rootNode = tree.rootNode;
console.log('parse ok, child count:', rootNode.childCount);
tree.delete();
console.log('smoke test passed');
