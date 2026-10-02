import type { StructuredFormatAdapter } from './types';
import { jsonAdapter } from './jsonAdapter';
import { tomlAdapter } from './tomlAdapter';
import { xmlAdapter } from './xmlAdapter';
import { yamlAdapter } from './yamlAdapter';

const ADAPTERS: StructuredFormatAdapter[] = [jsonAdapter, yamlAdapter, tomlAdapter, xmlAdapter];

export function adapterForFormatId(formatId: string): StructuredFormatAdapter | undefined {
  return ADAPTERS.find((a) => a.formatId === formatId);
}

export function adapterForDocument(languageId: string, filePath: string): StructuredFormatAdapter | undefined {
  const ext = filePath.toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';
  if (languageId === 'json' || languageId === 'jsonc' || ext === '.json' || ext === '.jsonc') {
    return jsonAdapter;
  }
  if (languageId === 'yaml' || ext === '.yaml' || ext === '.yml') return yamlAdapter;
  if (languageId === 'toml' || ext === '.toml') return tomlAdapter;
  if (languageId === 'xml' || ext === '.xml' || ext === '.plist') return xmlAdapter;
  return undefined;
}
