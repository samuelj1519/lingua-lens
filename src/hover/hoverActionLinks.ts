import { t } from '../l10n/uiL10n';

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
  if (opts.copy) parts.push(`[${t('hover.action.copy')}](command:aiTranslate.hover.copy?${arg})`);
  if (opts.insertComment) {
    parts.push(`[${t('hover.action.insertComment')}](command:aiTranslate.hover.insertComment?${arg})`);
  }
  if (opts.replaceSelection) {
    parts.push(`[${t('hover.action.replaceSelection')}](command:aiTranslate.selection.replace?${arg})`);
  }
  if (opts.insertBelow) {
    parts.push(`[${t('hover.action.insertBelow')}](command:aiTranslate.selection.insertBelow?${arg})`);
  }
  if (opts.refresh) parts.push(`[${t('hover.action.refresh')}](command:aiTranslate.hover.refresh?${arg})`);
  return parts.length ? `\n\n---\n${parts.join(' · ')}` : '';
}
