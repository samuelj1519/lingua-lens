export function formatDiagnosticMessages(
  diags: Array<{ message: string; source?: string }>,
): string {
  const lines: string[] = [];
  for (const d of diags) {
    const src = d.source ? `[${d.source}] ` : '';
    lines.push(`${src}${d.message}`.trim());
  }
  return lines.join('\n\n');
}
