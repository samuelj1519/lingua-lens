import type { DocumentSnapshot, TextUnit } from '../types';
import { splitConfigIdentifier } from './configKey';
import { configFilePath, resolveConfigFormat } from './languages/configLanguages';

/** If tree-sitter labeled a JSON property name as a string, promote to configKey. */
export function promoteConfigKeyUnit(
  doc: DocumentSnapshot,
  _offset: number,
  unit: TextUnit,
  configKeys: boolean,
): TextUnit {
  if (!configKeys || unit.kind !== 'string') return unit;
  const format = resolveConfigFormat(doc.languageId, configFilePath(doc));
  if (format !== 'json') return unit;

  const text = doc.getText();
  const after = skipWs(text, unit.range.end);
  if (text[after] !== ':') return unit;

  const body = unit.text.trim();
  const words = splitConfigIdentifier(body.replace(/^["']|["']$/g, ''));
  return {
    ...unit,
    kind: 'configKey',
    text: words || body,
    placeholders: [],
  };
}

function skipWs(text: string, i: number): number {
  while (i < text.length && /\s/.test(text[i])) i++;
  return i;
}
