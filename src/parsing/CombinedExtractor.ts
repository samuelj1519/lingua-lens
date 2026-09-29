import type { DocumentSnapshot, TextUnit } from '../types';
import { DocumentHoverExtractor } from '../document/DocumentHoverExtractor';
import type { AppLogger } from '../util/logger';
import type { ParserService } from './ParserService';
import { extractConfigKeyAt, extractYamlHoverAt } from './ConfigRegexHover';
import { RegexExtractor } from './RegexExtractor';
import { TreeSitterExtractor } from './TreeSitterExtractor';

export class CombinedExtractor {
  private readonly tree: TreeSitterExtractor;
  private readonly regex = new RegexExtractor();
  private readonly document: DocumentHoverExtractor;

  constructor(
    private readonly parser: ParserService,
    private readonly log: AppLogger,
  ) {
    this.tree = new TreeSitterExtractor(parser);
    this.document = new DocumentHoverExtractor(log);
  }

  async extractAt(
    doc: DocumentSnapshot,
    offset: number,
    options?: { documentHover?: boolean; configKeys?: boolean },
  ): Promise<TextUnit | null> {
    if (this.parser.supports(doc.languageId)) {
      try {
        const fromTree = await this.tree.extractAt(doc, offset, {
          configKeys: options?.configKeys,
        });
        if (fromTree) {
          this.log.debug(
            `extract: tree-sitter ${fromTree.kind} (${doc.languageId}) offsets ${fromTree.range.start}-${fromTree.range.end}`,
          );
          return fromTree;
        }
        this.log.debug(`extract: tree-sitter found no unit at offset ${offset} (${doc.languageId})`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.log.warn(
          `extract: tree-sitter threw for ${doc.languageId} at offset ${offset}: ${msg}; trying regex fallback`,
        );
      }
    }
    const fromRegex = this.regex.extractAt(doc, offset);
    if (fromRegex) {
      this.log.debug(
        `extract: regex ${fromRegex.kind} (${doc.languageId}) offsets ${fromRegex.range.start}-${fromRegex.range.end}`,
      );
      return fromRegex;
    }

    if (doc.languageId === 'yaml') {
      const fromYaml = extractYamlHoverAt(doc, offset, options?.configKeys ?? false);
      if (fromYaml) {
        this.log.debug(
          `extract: yaml regex ${fromYaml.kind} offsets ${fromYaml.range.start}-${fromYaml.range.end}`,
        );
        return fromYaml;
      }
    }

    if (options?.configKeys) {
      const fromKey = extractConfigKeyAt(doc, offset);
      if (fromKey) {
        this.log.debug(
          `extract: config key (${doc.languageId}) offsets ${fromKey.range.start}-${fromKey.range.end}`,
        );
        return fromKey;
      }
    }

    if (options?.documentHover) {
      const fromDoc = this.document.extractAt(doc, offset);
      if (fromDoc) return fromDoc;
    }

    this.log.debug(`extract: no unit at offset ${offset} (${doc.languageId})`);
    return null;
  }
}
