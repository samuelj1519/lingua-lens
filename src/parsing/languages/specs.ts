export interface LanguageSpec {
  grammar: string;
  commentTypes: ReadonlySet<string>;
  stringTypes: ReadonlySet<string>;
  /** Mapping / pair node types for config key detection (uses `key` field when present). */
  pairTypes?: ReadonlySet<string>;
  propertyKeyTypes?: ReadonlySet<string>;
  templateTypes?: ReadonlySet<string>;
  interpolationTypes?: ReadonlySet<string>;
  concatTypes?: ReadonlySet<string>;
  classifyComment(text: string): 'line' | 'block' | 'doc';
  lineCommentPrefixForInsert: string;
}

export const LANGUAGE_SPECS: Record<string, LanguageSpec> = {
  typescript: {
    grammar: 'tree-sitter-typescript.wasm',
    commentTypes: new Set(['comment']),
    stringTypes: new Set(['string']),
    templateTypes: new Set(['template_string']),
    interpolationTypes: new Set(['template_substitution']),
    classifyComment: (t) => (t.trimStart().startsWith('/**') ? 'doc' : t.includes('/*') ? 'block' : 'line'),
    lineCommentPrefixForInsert: '//',
  },
  typescriptreact: {
    grammar: 'tree-sitter-tsx.wasm',
    commentTypes: new Set(['comment']),
    stringTypes: new Set(['string']),
    templateTypes: new Set(['template_string']),
    interpolationTypes: new Set(['template_substitution']),
    classifyComment: (t) => (t.trimStart().startsWith('/**') ? 'doc' : t.includes('/*') ? 'block' : 'line'),
    lineCommentPrefixForInsert: '//',
  },
  javascript: {
    grammar: 'tree-sitter-javascript.wasm',
    commentTypes: new Set(['comment']),
    stringTypes: new Set(['string']),
    templateTypes: new Set(['template_string']),
    interpolationTypes: new Set(['template_substitution']),
    classifyComment: (t) => (t.trimStart().startsWith('/**') ? 'doc' : t.includes('/*') ? 'block' : 'line'),
    lineCommentPrefixForInsert: '//',
  },
  javascriptreact: {
    grammar: 'tree-sitter-javascript.wasm',
    commentTypes: new Set(['comment']),
    stringTypes: new Set(['string']),
    templateTypes: new Set(['template_string']),
    interpolationTypes: new Set(['template_substitution']),
    classifyComment: (t) => (t.trimStart().startsWith('/**') ? 'doc' : t.includes('/*') ? 'block' : 'line'),
    lineCommentPrefixForInsert: '//',
  },
  python: {
    grammar: 'tree-sitter-python.wasm',
    commentTypes: new Set(['comment']),
    stringTypes: new Set(['string']),
    concatTypes: new Set(['concatenated_string']),
    interpolationTypes: new Set(['interpolation']),
    classifyComment: () => 'line',
    lineCommentPrefixForInsert: '#',
  },
  rust: {
    grammar: 'tree-sitter-rust.wasm',
    commentTypes: new Set(['line_comment', 'block_comment']),
    stringTypes: new Set(['string_literal', 'raw_string_literal']),
    classifyComment: (t) => {
      const s = t.trimStart();
      if (s.startsWith('///') || s.startsWith('//!')) return 'doc';
      if (s.startsWith('/*')) return 'block';
      return 'line';
    },
    lineCommentPrefixForInsert: '//',
  },
  go: {
    grammar: 'tree-sitter-go.wasm',
    commentTypes: new Set(['comment']),
    stringTypes: new Set(['interpreted_string_literal', 'raw_string_literal']),
    classifyComment: (t) => (t.includes('/*') ? 'block' : 'line'),
    lineCommentPrefixForInsert: '//',
  },
  java: {
    grammar: 'tree-sitter-java.wasm',
    commentTypes: new Set(['line_comment', 'block_comment']),
    stringTypes: new Set(['string_literal', 'text_block']),
    classifyComment: (t) => (t.trimStart().startsWith('/**') ? 'doc' : t.includes('/*') ? 'block' : 'line'),
    lineCommentPrefixForInsert: '//',
  },
  c: {
    grammar: 'tree-sitter-c.wasm',
    commentTypes: new Set(['comment']),
    stringTypes: new Set(['string_literal', 'concatenated_string']),
    classifyComment: (t) => (t.includes('/*') ? 'block' : 'line'),
    lineCommentPrefixForInsert: '//',
  },
  cpp: {
    grammar: 'tree-sitter-cpp.wasm',
    commentTypes: new Set(['comment']),
    stringTypes: new Set(['string_literal', 'raw_string_literal', 'concatenated_string']),
    classifyComment: (t) => (t.includes('/*') ? 'block' : 'line'),
    lineCommentPrefixForInsert: '//',
  },
  'cuda-cpp': {
    grammar: 'tree-sitter-cpp.wasm',
    commentTypes: new Set(['comment']),
    stringTypes: new Set(['string_literal', 'raw_string_literal', 'concatenated_string']),
    classifyComment: (t) => (t.includes('/*') ? 'block' : 'line'),
    lineCommentPrefixForInsert: '//',
  },
  yaml: {
    grammar: 'tree-sitter-yaml.wasm',
    commentTypes: new Set(['comment']),
    stringTypes: new Set([
      'plain_scalar',
      'double_quoted_scalar',
      'single_quoted_scalar',
      'block_scalar',
      'string_scalar',
    ]),
    pairTypes: new Set(['block_mapping_pair', 'flow_pair']),
    propertyKeyTypes: new Set(['tag', 'anchor', 'alias']),
    classifyComment: () => 'line',
    lineCommentPrefixForInsert: '#',
  },
  toml: {
    grammar: 'tree-sitter-toml.wasm',
    commentTypes: new Set(['comment']),
    stringTypes: new Set(['string', 'quoted_string', 'multiline_string', 'multiline_basic_string']),
    pairTypes: new Set(['pair']),
    propertyKeyTypes: new Set(['bare_key', 'quoted_key']),
    classifyComment: () => 'line',
    lineCommentPrefixForInsert: '#',
  },
  json: {
    grammar: 'tree-sitter-json.wasm',
    commentTypes: new Set(),
    stringTypes: new Set(['string']),
    pairTypes: new Set(['pair']),
    classifyComment: () => 'line',
    lineCommentPrefixForInsert: '//',
  },
  jsonc: {
    grammar: 'tree-sitter-json.wasm',
    commentTypes: new Set(),
    stringTypes: new Set(['string']),
    pairTypes: new Set(['pair']),
    classifyComment: () => 'line',
    lineCommentPrefixForInsert: '//',
  },
  json5: {
    grammar: 'tree-sitter-json.wasm',
    commentTypes: new Set(),
    stringTypes: new Set(['string']),
    pairTypes: new Set(['pair']),
    classifyComment: () => 'line',
    lineCommentPrefixForInsert: '//',
  },
};

export function getSpec(languageId: string): LanguageSpec | undefined {
  return LANGUAGE_SPECS[languageId];
}
