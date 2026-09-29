import * as fs from 'node:fs';
import * as path from 'node:path';

export function countConfigurationProperties(extensionPath: string): number {
  const p = path.join(extensionPath, 'contributes', 'configuration.json');
  const sections = JSON.parse(fs.readFileSync(p, 'utf8')) as { properties: Record<string, unknown> }[];
  let n = 0;
  for (const s of sections) n += Object.keys(s.properties).length;
  return n;
}
