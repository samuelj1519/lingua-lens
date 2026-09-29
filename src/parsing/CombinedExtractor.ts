import type { DocumentSnapshot, TextUnit } from '../types';
import type { AppLogger } from '../util/logger';
import type { ParserService } from './ParserService';
import { RegexExtractor } from './RegexExtractor';
import { TreeSitterExtractor } from './TreeSitterExtractor';

export class CombinedExtractor {
  private readonly tree: TreeSitterExtractor;
  private readonly regex = new RegexExtractor();

  constructor(
    private readonly parser: ParserService,
    private readonly log: AppLogger,
  ) {
    this.tree = new TreeSitterExtractor(parser);
  }

  async extractAt(doc: DocumentSnapshot, offset: number): Promise<TextUnit | null> {
    if (this.parser.supports(doc.languageId)) {
      try {
        const fromTree = await this.tree.extractAt(doc, offset);
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
    } else {
      this.log.debug(`extract: no unit at offset ${offset} (${doc.languageId})`);
    }
    return fromRegex;
  }
}
