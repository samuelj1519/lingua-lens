import { t } from '../l10n/uiL10n';

export const HOVER_TRUSTED_COMMANDS = [
  'linguaLens.hover.copy',
  'linguaLens.hover.insertComment',
  'linguaLens.hover.refresh',
  'linguaLens.hover.retranslate',
  'linguaLens.selection.replace',
  'linguaLens.selection.insertBelow',
  'linguaLens.acknowledgePrivacy',
  'linguaLens.setApiKey',
  'linguaLens.openSettings',
  'linguaLens.openExtraBodySettings',
  'linguaLens.applyDeepSeekExtraBodyPreset',
  'linguaLens.showLog',
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
  if (opts.copy) parts.push(`[${t('hover.action.copy')}](command:linguaLens.hover.copy?${arg})`);
  if (opts.insertComment) {
    parts.push(`[${t('hover.action.insertComment')}](command:linguaLens.hover.insertComment?${arg})`);
  }
  if (opts.replaceSelection) {
    parts.push(`[${t('hover.action.replaceSelection')}](command:linguaLens.selection.replace?${arg})`);
  }
  if (opts.insertBelow) {
    parts.push(`[${t('hover.action.insertBelow')}](command:linguaLens.selection.insertBelow?${arg})`);
  }
  if (opts.refresh) parts.push(`[${t('hover.action.refresh')}](command:linguaLens.hover.refresh?${arg})`);
  return parts.length ? `\n\n---\n${parts.join(' · ')}` : '';
}
