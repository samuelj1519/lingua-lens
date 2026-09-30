/** ALLOW_CJK_FIXTURE: intentional Chinese samples for detection, documents, or l10n assertions. */
import * as path from 'path';
import * as assert from 'assert';
import * as vscode from 'vscode';

async function hoverMarkdownAt(uri: vscode.Uri, search: string): Promise<string | undefined> {
  const doc = await vscode.workspace.openTextDocument(uri);
  const idx = doc.getText().indexOf(search);
  assert.ok(idx >= 0, `fixture should contain: ${search}`);
  const pos = doc.positionAt(idx);
  const hovers = await vscode.commands.executeCommand<vscode.Hover[] | undefined>(
    'vscode.executeHoverProvider',
    doc.uri,
    pos,
  );
  if (!hovers?.length) return undefined;
  return hovers[0].contents.map((c) => (typeof c === 'string' ? c : c.value)).join('\n');
}

export async function run(): Promise<void> {
  const ext = vscode.extensions.getExtension('samuelj1519.lingua-lens');
  assert.ok(ext, 'extension should be loaded');
  await ext.activate();

  await vscode.workspace.getConfiguration('linguaLens').update('log.level', 'debug', true);
  await vscode.workspace.getConfiguration('linguaLens').update('hover.extraDelayMs', 0, true);
  await vscode.workspace.getConfiguration('linguaLens').update('hover.documents', true, true);
  await vscode.workspace.getConfiguration('linguaLens').update('hover.configKeys', true, true);
  await vscode.commands.executeCommand('linguaLens.acknowledgePrivacy');

  const root = path.join(ext.extensionPath, 'test', 'fixtures', 'hover');

  for (const file of ['sample.ts', 'sample.py']) {
    const uri = vscode.Uri.file(path.join(root, file));
    const md = await hoverMarkdownAt(uri, 'English');
    assert.ok(md && md.length > 0, `expected hover for code file ${file}`);
  }

  const mdUri = vscode.Uri.file(path.join(root, 'sample-doc.md'));
  const enMd = await hoverMarkdownAt(mdUri, 'English paragraph');
  assert.ok(enMd && /AI 翻译|\[zh-CN\]|翻译/i.test(enMd), `expected EN md hover: ${enMd?.slice(0, 120)}`);

  const inCode = await hoverMarkdownAt(mdUri, 'not hoverable');
  assert.ok(!inCode, 'code block should not produce hover');

  const zhMd = await hoverMarkdownAt(mdUri, '简体中文');
  assert.ok(!zhMd, 'Chinese paragraph should not produce hover');

  const txtUri = vscode.Uri.file(path.join(root, 'sample-doc.txt'));
  const enTxt = await hoverMarkdownAt(txtUri, 'English plain');
  assert.ok(enTxt && /AI 翻译|\[zh-CN\]|翻译/i.test(enTxt), `expected EN txt hover: ${enTxt?.slice(0, 120)}`);

  const yamlUri = vscode.Uri.file(path.join(root, 'sample-config.yaml'));
  const yamlComment = await hoverMarkdownAt(yamlUri, 'English config comment');
  assert.ok(yamlComment && /AI 翻译|\[zh-CN\]|翻译/i.test(yamlComment), 'yaml comment hover');

  const yamlValue = await hoverMarkdownAt(yamlUri, 'Hello from yaml');
  assert.ok(yamlValue && /AI 翻译|\[zh-CN\]|翻译/i.test(yamlValue), 'yaml value hover');

  const yamlKey = await hoverMarkdownAt(yamlUri, 'max_retry');
  assert.ok(yamlKey && /AI 翻译|\[zh-CN\]|翻译/i.test(yamlKey), 'yaml key hover');

  const yamlZh = await hoverMarkdownAt(yamlUri, '不应翻译');
  assert.ok(!yamlZh, 'yaml Chinese value should not hover');

  const tomlUri = vscode.Uri.file(path.join(root, 'sample-config.toml'));
  const tomlComment = await hoverMarkdownAt(tomlUri, 'English toml comment');
  assert.ok(tomlComment && /AI 翻译|\[zh-CN\]|翻译/i.test(tomlComment), 'toml comment hover');

  const tomlValue = await hoverMarkdownAt(tomlUri, 'Hello from toml');
  assert.ok(tomlValue && /AI 翻译|\[zh-CN\]|翻译/i.test(tomlValue), 'toml value hover');

  const tomlKey = await hoverMarkdownAt(tomlUri, 'max_retry');
  assert.ok(tomlKey && /AI 翻译|\[zh-CN\]|翻译/i.test(tomlKey), 'toml key hover');

  const tomlZh = await hoverMarkdownAt(tomlUri, '不应翻译');
  assert.ok(!tomlZh, 'toml Chinese value should not hover');

  const jsonUri = vscode.Uri.file(path.join(root, 'sample-config.json'));
  const jsonValue = await hoverMarkdownAt(jsonUri, 'Hello from json');
  assert.ok(jsonValue && /AI 翻译|\[zh-CN\]|翻译/i.test(jsonValue), 'json value hover');
  const jsonKey = await hoverMarkdownAt(jsonUri, 'max_retry');
  assert.ok(jsonKey && /AI 翻译|\[zh-CN\]|翻译/i.test(jsonKey), 'json key hover');
  const jsonZh = await hoverMarkdownAt(jsonUri, '不应翻译');
  assert.ok(!jsonZh, 'json Chinese value should not hover');

  const jsoncUri = vscode.Uri.file(path.join(root, 'sample-config.jsonc'));
  const jsoncComment = await hoverMarkdownAt(jsoncUri, 'English jsonc');
  assert.ok(jsoncComment && /AI 翻译|\[zh-CN\]|翻译/i.test(jsoncComment), 'jsonc comment hover');

  const xmlUri = vscode.Uri.file(path.join(root, 'sample-config.xml'));
  const xmlComment = await hoverMarkdownAt(xmlUri, 'English xml');
  assert.ok(xmlComment && /AI 翻译|\[zh-CN\]|翻译/i.test(xmlComment), 'xml comment hover');
  const xmlValue = await hoverMarkdownAt(xmlUri, 'Hello from xml');
  assert.ok(xmlValue && /AI 翻译|\[zh-CN\]|翻译/i.test(xmlValue), 'xml attribute value hover');
  const xmlKey = await hoverMarkdownAt(xmlUri, 'max_retry');
  assert.ok(xmlKey && /AI 翻译|\[zh-CN\]|翻译/i.test(xmlKey), 'xml attribute name hover');
}
