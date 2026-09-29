import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = join(root, 'package.json');
const cfgPath = join(root, 'contributes', 'configuration.json');

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const configuration = JSON.parse(readFileSync(cfgPath, 'utf8'));
pkg.contributes.configuration = configuration;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
