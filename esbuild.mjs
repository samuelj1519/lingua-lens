import * as esbuild from 'esbuild';
import { mkdirSync } from 'fs';

const watch = process.argv.includes('--watch');

mkdirSync('dist', { recursive: true });

const shared = {
  bundle: true,
  sourcemap: true,
  logLevel: 'info',
};

const ctx = await esbuild.context({
  ...shared,
  entryPoints: ['src/extension.ts'],
  outfile: 'dist/extension.js',
  platform: 'node',
  format: 'cjs',
  external: ['vscode'],
  target: 'node18',
  mainFields: ['module', 'main'],
});

const webviewCtx = await esbuild.context({
  ...shared,
  entryPoints: ['src/settingsPanel/webview/main.ts'],
  outfile: 'dist/settings-panel-webview.js',
  platform: 'browser',
  format: 'iife',
  target: 'es2020',
});

if (watch) {
  await ctx.watch();
  await webviewCtx.watch();
  console.log('watching...');
} else {
  await ctx.rebuild();
  await webviewCtx.rebuild();
  await ctx.dispose();
  await webviewCtx.dispose();
}
