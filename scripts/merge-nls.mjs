import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** VS Code package.nls locale ids */
const PACKAGE_NLS_LOCALES = [
  { out: 'package.nls.json', commands: 'en', config: 'en' },
  { out: 'package.nls.zh-cn.json', commands: 'zh-cn', config: 'zh-cn' },
  { out: 'package.nls.zh-tw.json', commands: 'zh-tw', config: 'zh-tw' },
  { out: 'package.nls.ja.json', commands: 'ja', config: 'ja' },
  { out: 'package.nls.ko.json', commands: 'ko', config: 'ko' },
  { out: 'package.nls.fr.json', commands: 'fr', config: 'fr' },
  { out: 'package.nls.de.json', commands: 'de', config: 'de' },
  { out: 'package.nls.es.json', commands: 'es', config: 'es' },
  { out: 'package.nls.ru.json', commands: 'ru', config: 'ru' },
  { out: 'package.nls.pt-br.json', commands: 'pt-br', config: 'pt-br' },
];

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function mergeLocale(commandsLocale, configLocale) {
  const commandsPath = join(root, `package.nls.commands.${commandsLocale}.json`);
  const configPath = join(root, `package.nls.config.${configLocale}.json`);
  const commands = loadJson(commandsPath);
  const config = loadJson(configPath);
  const merged = { ...commands, ...config };
  const keys = Object.keys(merged).sort();
  const out = {};
  for (const k of keys) out[k] = merged[k];
  return out;
}

for (const { out, commands, config } of PACKAGE_NLS_LOCALES) {
  const outPath = join(root, out);
  writeFileSync(outPath, `${JSON.stringify(mergeLocale(commands, config), null, 2)}\n`);
}

// Sync runtime bundle base from English panel strings if bundle.l10n.json exists
const bundlePath = join(root, 'bundle.l10n.json');
if (existsSync(bundlePath)) {
  const legacyL10n = join(root, 'package.l10n.json');
  if (existsSync(legacyL10n)) {
    const bundle = loadJson(bundlePath);
    const legacy = loadJson(legacyL10n);
    const merged = { ...legacy, ...bundle };
    writeFileSync(bundlePath, `${JSON.stringify(merged, null, 2)}\n`);
  }
}

console.log(`Merged ${PACKAGE_NLS_LOCALES.length} package.nls locales`);
