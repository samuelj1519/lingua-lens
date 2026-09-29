import type { GlossaryTerm, TargetLang, UnitKind } from '../types';
import type { LangFamily } from '../types';
import { TARGET_LANG_NAMES } from '../detection/families';
import { sha256HexPrefix } from '../util/hash';
import type { ChatMessage } from '../llm/LlmClient';
import { DOCUMENT_BATCH_VERSION, HOVER_TEMPLATE_VERSION, SELECTION_TEMPLATE_VERSION } from './templates';

export type PromptKind = 'hover' | 'selection' | 'documentBatch';

export interface PromptContext {
  kind: PromptKind;
  targetLang: TargetLang;
  sourceLangHint?: LangFamily | 'unknown';
  unitKind?: UnitKind;
  languageId?: string;
  glossary: GlossaryTerm[];
  customSystemPrompt?: string;
  fileName?: string;
}

const SYSTEM_SINGLE = `You are a professional technical translator embedded in a code editor.
Translate the user's text into {{targetLangName}}.

Rules:
1. Output ONLY the translation. No explanations, no notes, no quotes around the result, no "Translation:" prefix, no code fences unless the source contains them.
2. Preserve Markdown formatting exactly: headings, lists, emphasis, tables, line breaks between paragraphs.
3. Never translate or alter: code, inline code, identifiers, CLI commands, URLs, file paths, version numbers, JSDoc tags and parameter names.
4. Tokens of the form ⟦P0⟧, ⟦P1⟧ are placeholders. Keep every placeholder exactly as written.
5. Keep format specifiers unchanged.
6. If the text is already in {{targetLangName}}, return it unchanged.
{{customSystemPrompt}}`;

const SYSTEM_BATCH = `You are a professional technical translator. Translate document fragments into {{targetLangName}}.
Return JSON: {"items":[{"id":"...","translation":"..."}]}
Rules:
- One JSON entry per input id; never merge or split ids.
- Output ONLY the translated text for each fragment; no explanations.
- Preserve Markdown syntax exactly in each fragment: **bold**, *italic*, \`code\`, links, list markers, blockquote markers.
- Do not add or remove heading # characters unless they appear in the source fragment.
- Never translate URLs, code spans, or placeholder tokens ⟦Pn⟧.
- Valid JSON only.
{{customSystemPrompt}}`;

export class PromptBuilder {
  promptVersion(ctx: PromptContext): string {
    const base =
      ctx.kind === 'documentBatch'
        ? DOCUMENT_BATCH_VERSION
        : ctx.kind === 'selection'
          ? SELECTION_TEMPLATE_VERSION
          : HOVER_TEMPLATE_VERSION;
    const sp = sha256HexPrefix(ctx.customSystemPrompt ?? '');
    const gl = sha256HexPrefix(JSON.stringify(ctx.glossary.map((g) => g.source)));
    return `${base}+sp:${sp}+gl:${gl}`;
  }

  buildSingle(text: string, ctx: PromptContext): ChatMessage[] {
    const targetLangName = TARGET_LANG_NAMES[ctx.targetLang];
    let system = SYSTEM_SINGLE.replace(/\{\{targetLangName\}\}/g, targetLangName);
    const custom = ctx.customSystemPrompt?.trim();
    system = system.replace(
      '{{customSystemPrompt}}',
      custom ? `Additional instructions from the user:\n${custom}` : '',
    );
    const contentKind =
      ctx.kind === 'selection'
        ? 'selected text'
        : ctx.unitKind === 'documentHeading'
          ? 'Markdown heading'
          : ctx.unitKind === 'documentTableCell'
            ? 'Markdown table cell'
            : ctx.unitKind === 'documentParagraph'
              ? 'Markdown paragraph'
              : ctx.unitKind === 'configKey'
                ? 'configuration field name'
                : ctx.unitKind === 'diagnostic'
                  ? 'compiler/linter diagnostic message'
                  : ctx.unitKind === 'symbolDoc'
                    ? 'API documentation'
              : ctx.unitKind === 'string' || ctx.unitKind === 'templateString'
                ? 'string literal'
                : ctx.unitKind === 'docstring'
                  ? 'docstring'
                  : 'code comment';
    const glossaryBlock = formatGlossary(ctx.glossary, ctx.targetLang);
    const user = `Content type: ${contentKind} in a ${ctx.languageId ?? 'unknown'} file.
Source language: ${ctx.sourceLangHint ?? 'auto-detect'}.
${glossaryBlock}
Text to translate is between the markers.
<<<SOURCE
${text}
SOURCE>>>`;
    return [{ role: 'system', content: system }, { role: 'user', content: user }];
  }

  buildBatch(items: { id: string; text: string }[], ctx: PromptContext): ChatMessage[] {
    const targetLangName = TARGET_LANG_NAMES[ctx.targetLang];
    let system = SYSTEM_BATCH.replace(/\{\{targetLangName\}\}/g, targetLangName);
    const custom = ctx.customSystemPrompt?.trim();
    system = system.replace(
      '{{customSystemPrompt}}',
      custom ? `Additional instructions:\n${custom}` : '',
    );
    const glossaryBlock = formatGlossary(ctx.glossary, ctx.targetLang);
    const user = `Document: ${ctx.fileName ?? 'document'}.
${glossaryBlock}
Input:
${JSON.stringify({ items })}`;
    return [{ role: 'system', content: system }, { role: 'user', content: user }];
  }
}

function formatGlossary(terms: GlossaryTerm[], _target: TargetLang): string {
  if (!terms.length) return '';
  const lines = terms.map((t) => {
    if (t.doNotTranslate) return `- ${t.source} => keep`;
    const tr = t.target ?? '';
    const note = t.note ? ` (note: ${t.note.slice(0, 200)})` : '';
    return `- ${t.source} => ${tr}${note}`;
  });
  return `Glossary:\n${lines.join('\n')}\n`;
}

export function parseBatchResponse(content: string): Map<string, string> {
  const out = new Map<string, string>();
  let json = content.trim();
  try {
    JSON.parse(json);
  } catch {
    json = json.replace(/^```json?\s*/i, '').replace(/```\s*$/, '');
    const start = json.indexOf('{');
    const end = json.lastIndexOf('}');
    if (start >= 0 && end > start) json = json.slice(start, end + 1);
  }
  const data = JSON.parse(json) as { items?: { id: string; translation: string }[] };
  for (const item of data.items ?? []) {
    if (item.id && item.translation !== undefined && !out.has(item.id)) {
      out.set(item.id, item.translation);
    }
  }
  return out;
}

export function sanitizeModelOutput(text: string): string {
  let t = text.trim();
  t = t.replace(/^["']|["']$/g, '');
  t = t.replace(/^Translation:\s*/i, '');
  t = t.replace(/\[command:[^\]]+\]/g, '');
  t = t.replace(/```[\s\S]*?```/g, (m) => m);
  if (t.startsWith('```') && t.endsWith('```')) {
    t = t.replace(/^```\w*\n?/, '').replace(/```$/, '');
  }
  return t.trim();
}
