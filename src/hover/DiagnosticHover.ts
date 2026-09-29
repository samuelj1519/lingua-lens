import * as vscode from 'vscode';
import { formatDiagnosticMessages as formatMessages } from './diagnosticFormat';

export function diagnosticsAt(uri: vscode.Uri, pos: vscode.Position): vscode.Diagnostic[] {
  const all = vscode.languages.getDiagnostics(uri);
  return all.filter((d) => rangeContains(d.range, pos));
}

function rangeContains(range: vscode.Range, pos: vscode.Position): boolean {
  if (pos.isBefore(range.start)) return false;
  if (pos.isAfter(range.end)) return false;
  return true;
}

export function formatDiagnosticMessages(diags: vscode.Diagnostic[]): string {
  return formatMessages(diags);
}

export function diagnosticHoverRange(diags: vscode.Diagnostic[], pos: vscode.Position): vscode.Range {
  let range = diags[0]?.range ?? new vscode.Range(pos, pos);
  for (const d of diags.slice(1)) {
    range = range.union(d.range);
  }
  return range;
}
