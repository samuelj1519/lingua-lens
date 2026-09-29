export function getSettingsPanelHtml(scriptUri: string, nonce: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Translate</title>
  <style>
    :root {
      --pad: 12px;
      --gap: 10px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
    }
    body { margin: 0; padding: var(--pad); }
    h1 { font-size: 1.25em; margin: 0; font-weight: 600; flex: 1; min-width: 0; }
    .header-row {
      display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px;
      margin-bottom: var(--gap);
    }
    .lang-control { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .lang-control label { margin: 0; font-weight: 600; white-space: nowrap; }
    select.lang-select, #lang-select {
      min-width: 11rem;
      font-weight: 500;
    }
    .locale-hint {
      margin: 0 0 10px; font-size: 0.85em;
      color: var(--vscode-descriptionForeground);
    }
    h2 { font-size: 1em; margin: 16px 0 8px; font-weight: 600; color: var(--vscode-textLink-foreground); }
    label { display: block; margin-bottom: 4px; opacity: 0.9; }
    input[type="text"], input[type="number"], select, textarea {
      width: 100%; box-sizing: border-box;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, transparent);
      padding: 6px 8px; border-radius: 4px;
    }
    textarea { min-height: 72px; font-family: var(--vscode-editor-font-family); }
    .row { margin-bottom: var(--gap); }
    .scope-bar { display: flex; gap: 8px; margin-bottom: 12px; align-items: center; }
    .scope-bar button {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;
    }
    .scope-bar button.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .override { font-size: 0.85em; color: var(--vscode-descriptionForeground); }
    .checks { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; }
    .checks label { display: flex; align-items: center; gap: 6px; margin: 0; }
    button.action {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-right: 6px;
    }
    button.action.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .status { margin-top: 6px; font-size: 0.9em; }
    .status.ok { color: var(--vscode-testing-iconPassed); }
    .status.err { color: var(--vscode-errorForeground); }
    .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid var(--vscode-widget-border); }
    a { color: var(--vscode-textLink-foreground); cursor: pointer; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
