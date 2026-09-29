import type { DocSession } from './DocTranslationService';
import { assembleDocument, assembleTranslatedOnly } from './DocumentAssembler';
import type { PreviewStyle } from './DocumentAssembler';

export class BilingualRenderer {
  renderBilingual(source: string, session: DocSession, style: PreviewStyle = 'interleaved'): string {
    return assembleDocument(source, session, style);
  }

  renderTranslated(source: string, session: DocSession): string {
    return assembleTranslatedOnly(source, session);
  }
}
