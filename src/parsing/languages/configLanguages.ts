/** VS Code language IDs for structured config hover. */
export const CONFIG_HOVER_LANGUAGE_IDS = new Set([
  'yaml',
  'toml',
  'json',
  'jsonc',
  'json5',
  'ini',
  'properties',
  'xml',
  'editorconfig',
]);

const CONFIG_EXT =
  /\.(json5|jsonc|json|ya?ml|toml|ini|cfg|conf|properties|props|xml|editorconfig)$/i;

export type ConfigFormat = 'yaml' | 'toml' | 'json' | 'ini' | 'properties' | 'xml' | 'generic';

export function configFilePath(doc: { uri: string }): string {
  return doc.uri.replace(/^file:\/\//, '');
}

export function isConfigHoverLanguage(languageId: string, filePath?: string): boolean {
  if (languageId === 'json' || languageId === 'jsonc' || languageId === 'json5') return true;
  if (CONFIG_HOVER_LANGUAGE_IDS.has(languageId)) return true;
  const lower = (filePath ?? '').toLowerCase();
  if (CONFIG_EXT.test(lower)) return true;
  if (lower.endsWith('.env.example')) return true;
  return false;
}

export function resolveConfigFormat(languageId: string, filePath?: string): ConfigFormat {
  const lower = (filePath ?? '').toLowerCase();
  if (languageId === 'yaml' || /\.(ya?ml)$/.test(lower)) return 'yaml';
  if (languageId === 'toml' || lower.endsWith('.toml')) return 'toml';
  if (
    languageId === 'json' ||
    languageId === 'jsonc' ||
    languageId === 'json5' ||
    /\.(json5?|jsonc)$/.test(lower)
  ) {
    return 'json';
  }
  if (languageId === 'xml' || lower.endsWith('.xml')) return 'xml';
  if (languageId === 'properties' || /\.(properties|props)$/.test(lower)) return 'properties';
  if (languageId === 'ini' || /\.(ini|cfg|conf)$/.test(lower)) return 'ini';
  return 'generic';
}
