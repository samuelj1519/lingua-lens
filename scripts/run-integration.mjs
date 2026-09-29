import { createRequire } from 'module';
import { mkdirSync } from 'fs';
import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'out', 'test', 'integration');
mkdirSync(outDir, { recursive: true });

await esbuild.build({
  entryPoints: [path.join(root, 'test/integration/index.ts')],
  outfile: path.join(outDir, 'index.js'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['vscode'],
  sourcemap: true,
});

const { runTests } = require('@vscode/test-electron');
const vscodeExecutablePath = await require('@vscode/test-electron').downloadAndUnzipVSCode('stable');

await runTests({
  vscodeExecutablePath,
  extensionDevelopmentPath: root,
  extensionTestsPath: path.join(outDir, 'index.js'),
  launchArgs: ['--disable-extensions', '--no-sandbox'],
});
