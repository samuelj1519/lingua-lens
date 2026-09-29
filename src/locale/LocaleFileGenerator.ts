import * as vscode from 'vscode';
import type { ConfigService } from '../config/ConfigService';
import type { PrivacyGuard } from '../privacy/PrivacyGuard';
import type { TranslationService } from '../translation/TranslationService';
import type { TargetLang } from '../types';
import { sha256HexPrefix } from '../util/hash';

type LocaleMap = Record<string, string>;

export async function generateLocaleFile(
  uri: vscode.Uri,
  config: ConfigService,
  guard: PrivacyGuard,
  translation: TranslationService,
): Promise<void> {
  if (!(await guard.ensureAcknowledged(true))) return;
  const cfg = config.get(uri);
  const target = cfg.targetLanguage;
  const raw = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
  const ext = uri.fsPath.toLowerCase();
  let flat: LocaleMap;
  if (ext.endsWith('.json') || ext.endsWith('.jsonc')) {
    flat = flattenJson(JSON.parse(stripJsonc(raw)));
  } else if (ext.endsWith('.yaml') || ext.endsWith('.yml')) {
    flat = flattenYamlSimple(raw);
  } else if (ext.endsWith('.properties')) {
    flat = parseProperties(raw);
  } else {
    void vscode.window.showWarningMessage('仅支持 JSON/YAML/properties 语言包');
    return;
  }

  const outUri = vscode.Uri.file(suggestLocaleName(uri.fsPath, target));
  let existing: LocaleMap = {};
  try {
    const prev = Buffer.from(await vscode.workspace.fs.readFile(outUri)).toString('utf8');
    existing = flattenJson(JSON.parse(prev));
  } catch {
    /* new file */
  }

  const toTranslate: { id: string; text: string }[] = [];
  for (const [k, v] of Object.entries(flat)) {
    const hash = sha256HexPrefix(v, 8);
    const prev = existing[k];
    if (prev && !prev.startsWith('__needs_update__') && sha256HexPrefix(prev, 8) === hash) continue;
    toTranslate.push({ id: k, text: v });
  }

  if (!toTranslate.length) {
    void vscode.window.showInformationMessage('语言包已是最新，无需更新');
    return;
  }

  const ac = new AbortController();
  const batch = await translation.translateBatch(
    toTranslate.map((t) => ({ id: t.id, text: t.text, placeholders: [] })),
    target,
    ac.signal,
    uri.fsPath,
    uri,
  );

  for (const [id, item] of batch) {
    if (item && typeof item === 'object' && 'text' in item) existing[id] = item.text;
  }
  const outJson = JSON.stringify(existing, null, 2);
  await vscode.workspace.fs.writeFile(outUri, Buffer.from(outJson, 'utf8'));
  void vscode.window.showInformationMessage(`已写入 ${outUri.fsPath}`);
}

function suggestLocaleName(path: string, target: TargetLang): string {
  return path.replace(/(\.[^.]+)$/, `.${target}$1`);
}

function stripJsonc(raw: string): string {
  return raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function flattenJson(obj: unknown, prefix = ''): LocaleMap {
  const out: LocaleMap = {};
  if (typeof obj !== 'object' || obj === null) return out;
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else Object.assign(out, flattenJson(v, key));
  }
  return out;
}

function flattenYamlSimple(raw: string): LocaleMap {
  const out: LocaleMap = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*:\s*(.+)$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

function parseProperties(raw: string): LocaleMap {
  const out: LocaleMap = {};
  for (const line of raw.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 0) continue;
    out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return out;
}
