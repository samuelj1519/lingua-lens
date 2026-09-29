import * as vscode from 'vscode';
import { isAiTranslateHoverContent } from './hoverMarkers';
import { withForeignHoverFetch } from './hoverDepth';

export async function extractSymbolDocumentation(
  uri: vscode.Uri,
  pos: vscode.Position,
): Promise<string | null> {
  return withForeignHoverFetch(async () => {
    const hovers = await vscode.commands.executeCommand<vscode.Hover[] | undefined>(
      'vscode.executeHoverProvider',
      uri,
      pos,
    );
    if (!hovers?.length) return null;
    const chunks: string[] = [];
    for (const h of hovers) {
      const text = hoverToPlainText(h);
      if (!text.trim()) continue;
      if (isAiTranslateHoverContent(text)) continue;
      chunks.push(text.trim());
    }
    const merged = chunks.join('\n\n---\n\n').trim();
    if (merged.length < 8) return null;
    return merged.slice(0, 8000);
  });
}

function hoverToPlainText(hover: vscode.Hover): string {
  return hover.contents
    .map((c) => {
      if (typeof c === 'string') return c;
      return c.value;
    })
    .join('\n');
}
