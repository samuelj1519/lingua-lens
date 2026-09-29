import * as vscode from 'vscode';
import { formatDocumentPreviewUriPath } from './previewUriFormat';

export function documentPreviewUri(source: vscode.Uri, lang: string): vscode.Uri {
  return vscode.Uri.parse(formatDocumentPreviewUriPath(source.path, source.toString(), lang));
}
