import type { DocumentSnapshot, TextUnit } from '../types';
import type { ParserService } from './ParserService';
import { RegexExtractor } from './RegexExtractor';
import { TreeSitterExtractor } from './TreeSitterExtractor';

export class CombinedExtractor {
  private readonly tree: TreeSitterExtractor;
  private readonly regex = new RegexExtractor();

  constructor(private readonly parser: ParserService) {
    this.tree = new TreeSitterExtractor(parser);
  }

  async extractAt(doc: DocumentSnapshot, offset: number): Promise<TextUnit | null> {
    if (this.parser.supports(doc.languageId)) {
      const fromTree = await this.tree.extractAt(doc, offset);
      if (fromTree) return fromTree;
    }
    return this.regex.extractAt(doc, offset);
  }
}
