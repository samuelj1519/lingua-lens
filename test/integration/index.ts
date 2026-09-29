import * as path from 'path';
import * as assert from 'assert';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const ext = vscode.extensions.getExtension('cursor-ai-translate.cursor-ai-translate');
  assert.ok(ext, 'extension should be loaded');
  await ext.activate();

  await vscode.workspace.getConfiguration('aiTranslate').update('log.level', 'debug', true);
  await vscode.commands.executeCommand('aiTranslate.acknowledgePrivacy');

  const root = path.join(ext.extensionPath, 'test', 'fixtures', 'hover');

  // Code-file hover (not supported for markdown/plaintext body text)
  for (const file of ['sample.ts', 'sample.py']) {
    const uri = vscode.Uri.file(path.join(root, file));
    const doc = await vscode.workspace.openTextDocument(uri);
    const text = doc.getText();
    const idx = text.indexOf('English');
    assert.ok(idx >= 0, `fixture ${file} should contain English`);
    const pos = doc.positionAt(idx);
    const hovers = await vscode.commands.executeCommand<vscode.Hover[] | undefined>(
      'vscode.executeHoverProvider',
      doc.uri,
      pos,
    );
    assert.ok(hovers && hovers.length > 0, `expected hover for ${file}`);
    const md = hovers[0].contents.map((c) => (typeof c === 'string' ? c : c.value)).join('\n');
    assert.ok(/AI 翻译|翻译|zh-CN/i.test(md) || md.length > 0, `hover content for ${file}: ${md.slice(0, 200)}`);
  }
}
