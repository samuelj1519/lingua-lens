import * as vscode from 'vscode';
import type { ConfigService } from '../config/ConfigService';
import type { GlossaryTerm, TargetLang } from '../types';
import type { Logger } from '../util/logger';

interface GlossaryFile {
  version: number;
  terms: Array<{
    source: string;
    target?: string | Record<string, string>;
    doNotTranslate?: boolean;
    caseSensitive?: boolean;
    note?: string;
  }>;
}

export class GlossaryService implements vscode.Disposable {
  private readonly cache = new Map<string, GlossaryTerm[]>();
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChange = this.emitter.event;
  private watchers: vscode.FileSystemWatcher[] = [];

  constructor(
    private readonly config: ConfigService,
    private readonly logger: Logger,
  ) {
    this.refreshWatchers();
    vscode.workspace.onDidChangeWorkspaceFolders(() => this.refreshWatchers());
  }

  private refreshWatchers(): void {
    for (const w of this.watchers) w.dispose();
    this.watchers = [];
    const pattern = this.config.get().glossary.path;
    const watcher = vscode.workspace.createFileSystemWatcher(`**/${pattern}`);
    watcher.onDidChange(() => this.invalidate());
    watcher.onDidCreate(() => this.invalidate());
    watcher.onDidDelete(() => this.invalidate());
    this.watchers.push(watcher);
  }

  private invalidate(): void {
    this.cache.clear();
    this.emitter.fire();
  }

  async ensureLoaded(folder?: vscode.Uri): Promise<void> {
    const folders = folder ? [folder] : vscode.workspace.workspaceFolders?.map((f) => f.uri) ?? [];
    for (const f of folders) {
      if (!this.cache.has(f.toString())) {
        await this.loadSync(f);
      }
    }
  }

  match(text: string, folder: vscode.Uri | undefined, _target: TargetLang): GlossaryTerm[] {
    const key = folder?.toString() ?? vscode.workspace.workspaceFolders?.[0]?.uri.toString() ?? 'default';
    const terms = this.cache.get(key) ?? [];
    const cfg = this.config.get(folder);
    const max = cfg.glossary.maxTerms;
    const matched: GlossaryTerm[] = [];
    const sorted = [...terms].sort((a, b) => b.source.length - a.source.length);
    for (const t of sorted) {
      if (matched.length >= max) break;
      const re = t.caseSensitive
        ? new RegExp(`\\b${escapeRe(t.source)}\\b`)
        : new RegExp(`\\b${escapeRe(t.source)}\\b`, 'i');
      const cjk = /[\u4e00-\u9fff]/.test(t.source);
      const hit = cjk ? text.includes(t.source) : re.test(text);
      if (hit) matched.push(t);
    }
    return matched;
  }

  async loadSync(folder: vscode.Uri): Promise<GlossaryTerm[]> {
    const key = folder.toString();
    const rel = this.config.get(folder).glossary.path;
    const uri = vscode.Uri.joinPath(folder, rel);
    try {
      const buf = await vscode.workspace.fs.readFile(uri);
      if (buf.byteLength > 512 * 1024) {
        this.logger.warn('术语表超过 512KB，已忽略');
        return [];
      }
      const data = JSON.parse(Buffer.from(buf).toString('utf8')) as GlossaryFile;
      const terms = (data.terms ?? []).map((t) => parseTerm(t, this.config.get(folder).targetLanguage));
      this.cache.set(key, terms);
      return terms;
    } catch {
      return [];
    }
  }

  dispose(): void {
    for (const w of this.watchers) w.dispose();
    this.emitter.dispose();
  }
}

function parseTerm(
  item: GlossaryFile['terms'][0],
  defaultTarget: TargetLang,
): GlossaryTerm {
  let target: string | undefined;
  if (typeof item.target === 'string') target = item.target;
  else if (item.target && typeof item.target === 'object') {
    target = item.target[defaultTarget] ?? Object.values(item.target)[0];
  }
  return {
    source: item.source,
    target,
    doNotTranslate: item.doNotTranslate ?? false,
    caseSensitive: item.caseSensitive ?? false,
    note: item.note,
  };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
