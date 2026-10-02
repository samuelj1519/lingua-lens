import type { OffsetRange } from '../../types';

/** How to re-encode translated text when writing back into the source file. */
export type StructuredEscapeKind =
  | 'json'
  | 'yaml-double'
  | 'yaml-single'
  | 'yaml-plain'
  | 'yaml-block'
  | 'toml-basic'
  | 'toml-literal'
  | 'toml-ml-basic'
  | 'toml-ml-literal'
  | 'toml-basic-full'
  | 'xml-text'
  | 'xml-attr-single'
  | 'xml-attr-double';

export type YamlBlockChomp = 'clip' | 'strip' | 'keep';

export interface YamlBlockMeta {
  bodyStart: number;
  bodyEnd: number;
  scalarStart: number;
  scalarEnd: number;
  contentIndent: string;
  chomp: YamlBlockChomp;
  folded: boolean;
  scalarEndsWithNewline: boolean;
}

export interface StructuredStringSpan {
  /** Source slice replaced when applying a translation (quotes / block body / inner JSON). */
  replaceRange: OffsetRange;
  /** Exact bytes at replaceRange when decoded matches (identity round-trip). */
  sourceLiteral: string;
  decoded: string;
  escape: StructuredEscapeKind;
  yamlBlock?: YamlBlockMeta;
  xmlAttrQuote?: "'" | '"';
}

export interface StructuredFormatAdapter {
  readonly formatId: string;
  extractSpans(source: string): StructuredStringSpan[];
}
