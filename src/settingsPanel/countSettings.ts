import * as fs from 'node:fs';
import * as path from 'node:path';

type ConfigSection = { properties?: Record<string, unknown> };

/** Count settings from merged `package.json` contributes (not shipped `contributes/` folder). */
export function countConfigurationProperties(extensionPath: string): number {
  const p = path.join(extensionPath, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(p, 'utf8')) as {
    contributes?: { configuration?: ConfigSection[] };
  };
  const sections = pkg.contributes?.configuration ?? [];
  let n = 0;
  for (const s of sections) {
    if (s.properties) n += Object.keys(s.properties).length;
  }
  return n;
}
