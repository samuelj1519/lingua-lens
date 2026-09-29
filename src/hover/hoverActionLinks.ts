export const HOVER_TRUSTED_COMMANDS = [
  'aiTranslate.hover.copy',
  'aiTranslate.hover.insertComment',
  'aiTranslate.hover.refresh',
  'aiTranslate.hover.retranslate',
  'aiTranslate.selection.replace',
  'aiTranslate.selection.insertBelow',
  'aiTranslate.acknowledgePrivacy',
  'aiTranslate.setApiKey',
  'aiTranslate.openSettings',
  'aiTranslate.showLog',
] as const;

export interface HoverLinkOptions {
  copy?: boolean;
  insertComment?: boolean;
  replaceSelection?: boolean;
  insertBelow?: boolean;
  refresh?: boolean;
}

export function hoverActionLinks(id: string, opts: HoverLinkOptions): string {
  const arg = encodeURIComponent(JSON.stringify([id]));
  const parts: string[] = [];
  if (opts.copy) parts.push(`[复制](command:aiTranslate.hover.copy?${arg})`);
  if (opts.insertComment) parts.push(`[插入为注释](command:aiTranslate.hover.insertComment?${arg})`);
  if (opts.replaceSelection) parts.push(`[替换选区](command:aiTranslate.selection.replace?${arg})`);
  if (opts.insertBelow) parts.push(`[插入下方](command:aiTranslate.selection.insertBelow?${arg})`);
  if (opts.refresh) parts.push(`[刷新](command:aiTranslate.hover.refresh?${arg})`);
  return parts.length ? `\n\n---\n${parts.join(' · ')}` : '';
}
