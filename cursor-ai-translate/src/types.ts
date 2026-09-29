export type TargetLang = 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'ru';
export type LangFamily = 'zh' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'ru' | 'other';

export type UnitKind =
  | 'lineComment'
  | 'blockComment'
  | 'docComment'
  | 'docstring'
  | 'string'
  | 'templateString'
  | 'rawString';

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
  source: 'tree-sitter' | 'regex' | 'selection';
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
  | 'secret'
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
  kind: 'heading' | 'paragraph' | 'table' | 'preserved';
  range: OffsetRange;
  sourceText: string;
  placeholders: Placeholder[];
  hash: string;
  linePrefix: string;
  headingDepth?: number;
  table?: { align: string; cells: { id: string; text: string; placeholders: Placeholder[] }[][] };
}

export interface GlossaryTerm {
  source: string;
  target?: string;
  doNotTranslate: boolean;
  caseSensitive: boolean;
  note?: string;
}
