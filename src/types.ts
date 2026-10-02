export type TargetLang = 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'ru';
export type LangFamily = 'zh' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'ru' | 'other';

export type UnitKind =
  | 'lineComment'
  | 'blockComment'
  | 'docComment'
  | 'docstring'
  | 'string'
  | 'templateString'
  | 'rawString'
  | 'documentParagraph'
  | 'documentHeading'
  | 'documentTableCell'
  | 'configKey'
  | 'diagnostic'
  | 'symbolDoc'
  | 'frontmatter';

export interface OffsetRange {
  start: number;
  end: number;
}

export interface Placeholder {
  token: string;
  original: string;
}

export interface TextUnit {
  kind: UnitKind;
  range: OffsetRange;
  rawText: string;
  text: string;
  placeholders: Placeholder[];
  languageId: string;
  source: 'tree-sitter' | 'regex' | 'selection' | 'document';
}

export type Decision =
  | { action: 'skip'; reason: SkipReason; detected?: LangFamily }
  | { action: 'translate'; detected: LangFamily | 'unknown'; confidence: number };

export type SkipReason =
  | 'tooShort'
  | 'identifier'
  | 'url'
  | 'path'
  | 'placeholderOnly'
  | 'i18nKey'
  | 'number'
  | 'hexOrUuid'
  | 'regexLike'
  | 'noLetters'
  | 'targetRatio'
  | 'sameFamily'
  | 'userPattern'
  | 'unreliableShort';

export interface DocumentSnapshot {
  uri: string;
  version: number;
  languageId: string;
  getText(): string;
}

export interface Segment {
  id: string;
  kind: 'heading' | 'paragraph' | 'table' | 'list' | 'blockquote' | 'frontmatter' | 'preserved' | 'structured';
  range: OffsetRange;
  sourceText: string;
  placeholders: Placeholder[];
  hash: string;
  linePrefix: string;
  headingDepth?: number;
  /** Whole-block markdown (lists/tables/blockquotes) sent to the model. */
  containerKind?: 'list' | 'table' | 'blockquote';
  /** Per-line fallback when whole-block validation fails (lists only). */
  frontmatterMeta?: {
    fieldKey: string;
    insertAfter: number;
    blockEnd: number;
  };
  listFallbackItems?: {
    id: string;
    lineIndex: number;
    prefix: string;
    text: string;
    placeholders: Placeholder[];
  }[];
  structuredMeta?: {
    valueStart: number;
    valueEnd: number;
    sourceLiteral: string;
    decoded: string;
    escape: import('./document/structured/types').StructuredEscapeKind;
    formatId: string;
    yamlBlock?: import('./document/structured/types').YamlBlockMeta;
    xmlAttrQuote?: "'" | '"';
  };
}

export interface GlossaryTerm {
  source: string;
  target?: string;
  doNotTranslate: boolean;
  caseSensitive: boolean;
  note?: string;
}
