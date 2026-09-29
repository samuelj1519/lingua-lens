import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function merge(baseName, extraName) {
  const base = JSON.parse(readFileSync(join(root, baseName), 'utf8'));
  const extra = JSON.parse(readFileSync(join(root, extraName), 'utf8'));
  const merged = { ...base, ...extra };
  const keys = Object.keys(merged).sort();
  const out = {};
  for (const k of keys) out[k] = merged[k];
  writeFileSync(join(root, baseName), `${JSON.stringify(out, null, 2)}\n`);
}

merge('package.nls.json', 'package.nls.config.en.json');
merge('package.nls.zh-cn.json', 'package.nls.config.zh-cn.json');
