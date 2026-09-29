import Parser from 'web-tree-sitter';
import type { DocumentSnapshot } from '../types';
import { getSpec, LANGUAGE_SPECS } from './languages/specs';

export interface ParsedTree {
  version: number;
  tree: Parser.Tree;
  languageId: string;
}

interface CacheEntry {
  version: number;
  tree: Parser.Tree;
  dirty: boolean;
  languageId: string;
  text: string;
}

export class ParserService {
  private initialized = false;
  private readonly languages = new Map<string, Promise<Parser.Language>>();
  private readonly trees = new Map<string, CacheEntry>();
  private readonly lru: string[] = [];
  private readonly maxDocs = 20;

  constructor(
    private readonly wasmDir: string,
    private readonly maxFileSizeKB: number,
  ) {}

  supports(languageId: string): boolean {
    return languageId in LANGUAGE_SPECS;
  }

  private async ensureInit(): Promise<void> {
    if (this.initialized) return;
    await Parser.init({
      locateFile: (file: string) => `${this.wasmDir}/${file}`,
    });
    this.initialized = true;
  }

  private async loadLanguage(languageId: string): Promise<Parser.Language | undefined> {
    const spec = getSpec(languageId);
    if (!spec) return undefined;
    let pending = this.languages.get(languageId);
    if (!pending) {
      pending = (async () => {
        await this.ensureInit();
        const { readFile } = await import('fs/promises');
        const bytes = await readFile(`${this.wasmDir}/${spec.grammar}`);
        return await Parser.Language.load(bytes);
      })();
      this.languages.set(languageId, pending);
    }
    return pending;
  }

  async getTree(doc: DocumentSnapshot): Promise<ParsedTree | undefined> {
    if (!this.supports(doc.languageId)) return undefined;
    const text = doc.getText();
    if (Buffer.byteLength(text, 'utf8') > this.maxFileSizeKB * 1024) return undefined;

    const lang = await this.loadLanguage(doc.languageId);
    if (!lang) return undefined;

    const cached = this.trees.get(doc.uri);
    if (cached && cached.version === doc.version && !cached.dirty) {
      return { version: cached.version, tree: cached.tree, languageId: doc.languageId };
    }

    const parser = new Parser();
    parser.setLanguage(lang);
    const oldTree = cached?.tree;
    const tree = oldTree && cached?.dirty ? parser.parse(text, oldTree) : parser.parse(text);
    if (oldTree && oldTree !== tree) oldTree.delete();

    this.trees.set(doc.uri, {
      version: doc.version,
      tree,
      dirty: false,
      languageId: doc.languageId,
      text,
    });
    this.touchLru(doc.uri);
    return { version: doc.version, tree, languageId: doc.languageId };
  }

  applyChanges(uri: string, _changes: readonly unknown[], newVersion: number): void {
    const entry = this.trees.get(uri);
    if (entry) {
      entry.dirty = true;
      entry.version = newVersion;
    }
  }

  release(uri: string): void {
    const entry = this.trees.get(uri);
    if (entry) {
      entry.tree.delete();
      this.trees.delete(uri);
      const idx = this.lru.indexOf(uri);
      if (idx >= 0) this.lru.splice(idx, 1);
    }
  }

  dispose(): void {
    for (const entry of this.trees.values()) {
      entry.tree.delete();
    }
    this.trees.clear();
  }

  private touchLru(uri: string): void {
    const idx = this.lru.indexOf(uri);
    if (idx >= 0) this.lru.splice(idx, 1);
    this.lru.push(uri);
    while (this.lru.length > this.maxDocs) {
      const ev = this.lru.shift()!;
      this.release(ev);
    }
  }
}
