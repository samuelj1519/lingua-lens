import { copyFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distWasm = join(root, 'dist', 'wasm');
mkdirSync(distWasm, { recursive: true });

const runtime = join(root, 'node_modules', 'web-tree-sitter', 'tree-sitter.wasm');
if (existsSync(runtime)) {
  copyFileSync(runtime, join(distWasm, 'tree-sitter.wasm'));
}

const wasmsPkg = join(root, 'node_modules', 'tree-sitter-wasms', 'out');
const wasmDir = join(root, 'wasm');
const GRAMMARS = [
  'tree-sitter-typescript.wasm',
  'tree-sitter-tsx.wasm',
  'tree-sitter-javascript.wasm',
  'tree-sitter-python.wasm',
  'tree-sitter-rust.wasm',
  'tree-sitter-go.wasm',
  'tree-sitter-java.wasm',
  'tree-sitter-c.wasm',
  'tree-sitter-cpp.wasm',
  'tree-sitter-yaml.wasm',
  'tree-sitter-toml.wasm',
  'tree-sitter-json.wasm',
];

if (existsSync(wasmsPkg)) {
  for (const f of GRAMMARS) {
    const src = join(wasmsPkg, f);
    if (existsSync(src)) copyFileSync(src, join(distWasm, f));
  }
} else if (existsSync(wasmDir)) {
  for (const f of readdirSync(wasmDir)) {
    if (f.endsWith('.wasm')) {
      copyFileSync(join(wasmDir, f), join(distWasm, f));
    }
  }
}

const needed = [
  'tree-sitter.wasm',
  'tree-sitter-typescript.wasm',
  'tree-sitter-tsx.wasm',
  'tree-sitter-javascript.wasm',
  'tree-sitter-python.wasm',
  'tree-sitter-rust.wasm',
  'tree-sitter-go.wasm',
  'tree-sitter-java.wasm',
  'tree-sitter-c.wasm',
  'tree-sitter-cpp.wasm',
  'tree-sitter-yaml.wasm',
  'tree-sitter-toml.wasm',
  'tree-sitter-json.wasm',
];

const missing = needed.filter((f) => !existsSync(join(distWasm, f)));
if (missing.length) {
  console.warn('Missing wasm files:', missing.join(', '));
  process.exitCode = missing.includes('tree-sitter.wasm') ? 1 : 0;
}
