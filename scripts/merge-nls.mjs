import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const i18nCommands = join(root, 'i18n', 'commands');
const i18nConfig = join(root, 'i18n', 'config');
const i18nBundle = join(root, 'i18n', 'bundle');
const l10nDir = join(root, 'l10n');

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

const BUNDLE_LOCALES = ['zh-cn', 'zh-tw', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'pt-br'];

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function mergeLocale(commandsLocale, configLocale) {
  const commandsPath = join(i18nCommands, `${commandsLocale}.json`);
  const configPath = join(i18nConfig, `${configLocale}.json`);
  const commands = loadJson(commandsPath);
  const config = loadJson(configPath);
  const merged = { ...commands, ...config };
  const keys = Object.keys(merged).sort();
  const out = {};
  for (const k of keys) out[k] = merged[k];
  return out;
}

function syncBundles() {
  const enPath = join(i18nBundle, 'en.json');
  if (!existsSync(enPath)) return;
  writeFileSync(join(l10nDir, 'bundle.l10n.json'), `${JSON.stringify(loadJson(enPath), null, 2)}\n`);
  for (const loc of BUNDLE_LOCALES) {
    const src = join(i18nBundle, `${loc}.json`);
    if (existsSync(src)) {
      writeFileSync(
        join(l10nDir, `bundle.l10n.${loc}.json`),
        `${JSON.stringify(loadJson(src), null, 2)}\n`,
      );
    }
  }
}

for (const { out, commands, config } of PACKAGE_NLS_LOCALES) {
  const outPath = join(root, out);
  writeFileSync(outPath, `${JSON.stringify(mergeLocale(commands, config), null, 2)}\n`);
}

syncBundles();

// Legacy: merge package.l10n.json into bundle base if present
const bundlePath = join(l10nDir, 'bundle.l10n.json');
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
if (existsSync(i18nBundle)) {
  const bundleFiles = readdirSync(i18nBundle).filter((f) => f.endsWith('.json'));
  console.log(`Synced ${bundleFiles.length} bundle source files to l10n/`);
}
