import * as vscode from 'vscode';
import { t } from '../l10n/uiL10n';
import type { DocSession } from './DocTranslationService';
import { countCompletedTranslatableSegments, segmentProgressIncrement } from './documentProgress';

export class DocumentSegmentProgressReporter {
  private lastPercent = 0;

  constructor(
    private readonly progress: vscode.Progress<{ message?: string; increment?: number }>,
    private readonly fileName: string,
    private readonly total: number,
  ) {}

  sync(session: DocSession): void {
    const completed = countCompletedTranslatableSegments(session);
    const increment = segmentProgressIncrement(completed, this.total, this.lastPercent);
    this.lastPercent += increment;
    this.progress.report({
      message: t('document.progress.message', this.fileName, completed, this.total),
      increment,
    });
  }
}
