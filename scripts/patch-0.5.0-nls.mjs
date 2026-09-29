import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const titles = {
  en: 'Open Settings Panel',
  'zh-cn': '打开设置面板',
  'zh-tw': '開啟設定面板',
  ja: '設定パネルを開く',
  ko: '설정 패널 열기',
  fr: 'Ouvrir le panneau des paramètres',
  de: 'Einstellungsbereich öffnen',
  es: 'Abrir panel de configuración',
  ru: 'Открыть панель настроек',
  'pt-br': 'Abrir painel de configurações',
};

for (const [loc, title] of Object.entries(titles)) {
  const f = join('package.nls.commands.' + loc + '.json');
  if (!existsSync(f)) continue;
  const j = JSON.parse(readFileSync(f, 'utf8'));
  j['command.openSettingsPanel'] = title;
  writeFileSync(f, `${JSON.stringify(j, null, 2)}\n`);
}

const extraEn = {
  'panel.section.target': 'Target & detection',
  'panel.field.stream': 'Stream interactive requests (SSE)',
  'panel.field.extraBody': 'Extra request body (JSON)',
  'panel.hover.extraDelayMs': 'Hover delay (ms)',
  'panel.cache.stats': 'Cache usage',
  'panel.cache.clear': 'Clear cache',
  'panel.cache.clearConfirm': 'Clear all cached translations?',
  'panel.cache.clearYes': 'Clear',
  'panel.openNativeSettings': 'View all {0} settings in VS Code',
};

const locales = ['', 'zh-cn', 'zh-tw', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'pt-br'];
for (const loc of locales) {
  const file = loc ? `bundle.l10n.${loc}.json` : 'bundle.l10n.json';
  const j = JSON.parse(readFileSync(file, 'utf8'));
  Object.assign(j, extraEn);
  writeFileSync(file, `${JSON.stringify(j, null, 2)}\n`);
}
