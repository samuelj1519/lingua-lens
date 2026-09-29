import { createRequire } from 'module';
import { mkdirSync } from 'fs';
import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'out', 'test', 'integration');
mkdirSync(outDir, { recursive: true });

const mockOut = path.join(outDir, 'mock-server.cjs');
await esbuild.build({
  entryPoints: [path.join(root, 'test/mock-server.ts')],
  outfile: mockOut,
  bundle: true,
  platform: 'node',
  format: 'cjs',
});

const { startMockServer } = require(mockOut);
const { server, port } = await startMockServer(0);

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

let exitCode = 1;
try {
  exitCode = await runTests({
    vscodeExecutablePath,
    extensionDevelopmentPath: root,
    extensionTestsPath: path.join(outDir, 'index.js'),
    launchArgs: ['--disable-extensions', '--no-sandbox'],
    extensionTestsEnv: {
      AITRANSLATE_INTEGRATION_TEST: '1',
      AITRANSLATE_MOCK_PORT: String(port),
    },
  });
} finally {
  server.close();
}
process.exit(exitCode);
