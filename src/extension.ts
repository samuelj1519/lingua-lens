import * as vscode from 'vscode';
import { CacheService } from './cache/CacheService';
import { ConfigService } from './config/ConfigService';
import { DocTranslationService } from './document/DocTranslationService';
import { PreviewContentProvider } from './document/PreviewContentProvider';
import { createHoverProvider } from './hover/TranslateHoverProvider';
import { createSelectionHoverProvider } from './hover/SelectionHoverProvider';
import { registerDocumentCodeLens } from './document/DocumentCodeLensProvider';
import { showAiTranslateQuickPick } from './commands/quickPickMenu';
import { SelectionTranslateCodeActionProvider } from './commands/selectionCodeAction';
import { translateSelectionPopup } from './commands/selectionPopup';
import { HoverActionRegistry } from './hover/HoverActionRegistry';
import { GlossaryService } from './glossary/GlossaryService';
import { LlmClient } from './llm/LlmClient';
import { CombinedExtractor } from './parsing/CombinedExtractor';
import { ParserService } from './parsing/ParserService';
import { getSpec } from './parsing/languages/specs';
import { PrivacyGuard } from './privacy/PrivacyGuard';
import { ApiKeyStore } from './secrets/ApiKeyStore';
import { StatsService } from './stats/StatsService';
import { TranslationService } from './translation/TranslationService';
import { StatusBarController } from './ui/StatusBarController';
import { Logger } from './util/logger';
import { translateClipboardOrSelection } from './commands/clipboardTranslate';
import { translateInsertBelow, translateReplaceSelection } from './commands/selectionReplace';
import { translateGitCommitAtLine, translateScmInput } from './commands/gitTranslate';
import { generateLocaleFile } from './locale/LocaleFileGenerator';
import { suggestVariableNames } from './commands/variableNaming';
import { refreshHoverTranslation } from './commands/refreshHover';
import { SettingsPanelController } from './settingsPanel/SettingsPanelController';
import { countConfigurationProperties } from './settingsPanel/countSettings';
import { applyTargetLanguageCursorUiBootstrap } from './l10n/targetLanguageBootstrap';
import { initUiL10n, resetUiL10nCache, t } from './l10n/uiL10n';

let parserService: ParserService | undefined;
let cacheService: CacheService | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const config = new ConfigService();
  initUiL10n(context.extensionPath, () => config.getRawTargetLanguage());
  await applyTargetLanguageCursorUiBootstrap(context);
  const logger = new Logger(() => config.get().log.level);
  const stats = new StatsService();
  const apiKeys = new ApiKeyStore(context);
  const llm = new LlmClient(() => config.get(), apiKeys);
  const cfg = config.get();
  if (process.env.AITRANSLATE_INTEGRATION_TEST === '1') {
    const port = process.env.AITRANSLATE_MOCK_PORT ?? '18765';
    const baseUrl = `http://127.0.0.1:${port}/v1`;
    await vscode.workspace
      .getConfiguration('aiTranslate')
      .update('llm.baseUrl', baseUrl, vscode.ConfigurationTarget.Global);
    await vscode.workspace
      .getConfiguration('aiTranslate')
      .update('llm.model', 'mock', vscode.ConfigurationTarget.Global);
    await vscode.workspace
      .getConfiguration('aiTranslate')
      .update('hover.extraDelayMs', 0, vscode.ConfigurationTarget.Global);
    await apiKeys.set(baseUrl, 'integration-test-key');
    logger.info(`Integration test mode: LLM -> ${baseUrl}`);
  }
  cacheService = new CacheService(context, cfg.cache.memoryEntries, cfg.cache.maxDiskMB);
  await cacheService.initialize();

  const glossary = new GlossaryService(config, logger);
  const translation = new TranslationService((uri) => config.get(uri), cacheService, llm, glossary, stats);
  const guard = new PrivacyGuard(config, context);
  const wasmDir = vscode.Uri.joinPath(context.extensionUri, 'dist', 'wasm').fsPath;
  parserService = new ParserService(wasmDir, cfg.parser.maxFileSizeKB, logger);
  const extractor = new CombinedExtractor(parserService, logger);
  const hoverRegistry = new HoverActionRegistry();
  const preview = new PreviewContentProvider();
  const docService = new DocTranslationService(config, guard, translation, preview);
  const settingsPanel = new SettingsPanelController(
    context,
    config,
    cacheService,
    apiKeys,
    llm,
    countConfigurationProperties(context.extensionPath),
  );

  const codeLensRegistration = registerDocumentCodeLens(config);
  const statusBar = new StatusBarController(config, stats, apiKeys);
  preview.setPreviewStyle(config.get().document.previewStyle);
  config.onDidChange((e) => {
    if (e.affectsConfiguration('aiTranslate.targetLanguage')) {
      resetUiL10nCache();
      codeLensRegistration.provider.refresh();
      void statusBar.refresh();
      preview.refreshAll();
    }
  });
  context.subscriptions.push(
    logger,
    config,
    glossary,
    statusBar,
    vscode.workspace.registerTextDocumentContentProvider('aitranslate', preview),
    createHoverProvider(config, guard, extractor, translation, stats, hoverRegistry, logger),
    createSelectionHoverProvider(config, guard, translation, hoverRegistry),
    codeLensRegistration.disposable,
    vscode.languages.registerCodeActionsProvider('*', new SelectionTranslateCodeActionProvider(config), {
      providedCodeActionKinds: [vscode.CodeActionKind.RefactorRewrite],
    }),
    vscode.workspace.onDidChangeTextDocument((e) => {
      parserService?.applyChanges(e.document.uri.toString(), e.contentChanges, e.document.version);
    }),
    vscode.workspace.onDidCloseTextDocument((d) => {
      parserService?.release(d.uri.toString());
      if (d.uri.scheme === 'aitranslate') docService.onClosePreview(d.uri);
    }),
  );

  const reg = (id: string, fn: (...args: never[]) => unknown) => {
    context.subscriptions.push(vscode.commands.registerCommand(id, fn as (...args: unknown[]) => unknown));
  };

  reg('aiTranslate.toggle', async () => {
    const c = config.get();
    await config.setEnabled(!c.enabled);
    await statusBar.refresh();
  });

  reg('aiTranslate.selectTargetLanguage', () => statusBar.pickLanguage());

  reg('aiTranslate.setApiKey', async () => {
    const c = config.get();
    const origin = new URL(c.llm.baseUrl).origin;
    const key = await vscode.window.showInputBox({
      prompt: t('msg.apiKeyPrompt', origin),
      password: true,
      ignoreFocusOut: true,
    });
    if (key?.trim()) {
      await apiKeys.set(c.llm.baseUrl, key);
      translation.resetPause();
      await statusBar.refresh();
    }
  });

  reg('aiTranslate.clearApiKey', async () => {
    const pick = await vscode.window.showQuickPick(
      [t('msg.clearApiKey.current'), t('msg.clearApiKey.all')],
      { title: t('msg.clearApiKey.title') },
    );
    if (!pick) return;
    const confirmLabel = t('msg.confirm');
    const confirm = await vscode.window.showWarningMessage(t('msg.clearApiKey.confirm'), { modal: true }, confirmLabel);
    if (confirm !== confirmLabel) return;
    if (pick === t('msg.clearApiKey.all')) await apiKeys.clearAll();
    else await apiKeys.clear(config.get().llm.baseUrl);
    await statusBar.refresh();
  });

  reg('aiTranslate.testConnection', async () => {
    const r = await llm.testConnection();
    if (r.ok) void vscode.window.showInformationMessage(r.message);
    else void vscode.window.showErrorMessage(r.message);
  });

  reg('aiTranslate.translateSelection', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.selection.isEmpty) return;
    const doc = editor.document;
    const block = guard.check(doc);
    if (block === 'excluded') {
      void vscode.window.showWarningMessage(t('doc.fileExcluded'));
      return;
    }
    if (!(await guard.ensureAcknowledged(true))) return;
    const text = doc.getText(editor.selection);
    if (guard.containsSecret(text)) {
      void vscode.window.showWarningMessage(t('msg.secretNotSent'));
      return;
    }
    const c = config.get(doc.uri);
    const unit = {
      kind: 'string' as const,
      range: { start: doc.offsetAt(editor.selection.start), end: doc.offsetAt(editor.selection.end) },
      rawText: text,
      text,
      placeholders: [],
      languageId: doc.languageId,
      source: 'selection' as const,
    };
    try {
      const result = await translation.translate(unit, c.targetLanguage, { kind: 'selection', uri: doc.uri });
      const out = c.selection.output === 'auto' ? (result.text.length > 300 ? 'document' : 'notification') : c.selection.output;
      if (out === 'notification') {
        const copyLabel = t('msg.copy');
        const replaceLabel = t('msg.replaceSelection');
        const action = await vscode.window.showInformationMessage(result.text.slice(0, 500), copyLabel, replaceLabel);
        if (action === copyLabel) await vscode.env.clipboard.writeText(result.text);
        if (action === replaceLabel) {
          await editor.edit((eb) => eb.replace(editor.selection, result.text));
        }
      } else {
        const virt = await vscode.workspace.openTextDocument({
          language: 'markdown',
          content: result.text,
        });
        await vscode.window.showTextDocument(virt, { viewColumn: vscode.ViewColumn.Beside, preview: true });
      }
    } catch (e) {
      void vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
    }
  });

  reg('aiTranslate.translateDocument', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    return docService.openPreview(editor.document);
  });

  reg('aiTranslate.refreshPreview', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor?.document.uri.scheme === 'aitranslate') {
      return docService.refresh(editor.document.uri, { bypassCache: true });
    }
  });

  reg('aiTranslate.refreshDocumentTranslation', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    return docService.refreshDocumentTranslation(editor.document);
  });

  reg('aiTranslate.generateSideFile', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    return docService.generateSideFile(editor.document);
  });

  reg('aiTranslate.clearCache', async () => {
    const clearLabel = t('msg.clearCacheYes');
    const ok = await vscode.window.showWarningMessage(t('msg.clearCacheConfirm'), { modal: true }, clearLabel);
    if (ok === clearLabel) {
      await cacheService?.clear();
      void vscode.window.showInformationMessage(t('msg.cacheCleared'));
    }
  });

  reg('aiTranslate.disableForWorkspace', async () => {
    const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
    await config.setEnabled(false, folder);
    await statusBar.refresh();
  });

  reg('aiTranslate.enableForWorkspace', async () => {
    const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
    const cfgWs = vscode.workspace.getConfiguration('aiTranslate', folder);
    await cfgWs.update('enabled', undefined, vscode.ConfigurationTarget.WorkspaceFolder);
    await statusBar.refresh();
  });

  reg('aiTranslate.openGlossary', async () => {
    const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!folder) return;
    const rel = config.get(folder).glossary.path;
    const uri = vscode.Uri.joinPath(folder, rel);
    try {
      await vscode.workspace.fs.stat(uri);
    } catch {
      const createLabel = t('msg.create');
      const create = await vscode.window.showInformationMessage(t('msg.glossaryCreate'), createLabel);
      if (create === createLabel) {
        const template = JSON.stringify({ version: 1, terms: [] }, null, 2);
        await vscode.workspace.fs.writeFile(uri, Buffer.from(template, 'utf8'));
      } else return;
    }
    await vscode.window.showTextDocument(uri);
  });

  reg('aiTranslate.showLog', () => logger.show());
  reg('aiTranslate.openSettings', () =>
    vscode.commands.executeCommand(
      'workbench.action.openSettings',
      '@ext:cursor-ai-translate.cursor-ai-translate',
    ),
  );

  reg('aiTranslate.openSettingsPanel', () => settingsPanel.reveal());

  reg('aiTranslate.translateClipboardOrSelection', () =>
    translateClipboardOrSelection(config, guard, translation),
  );

  reg('aiTranslate.translateReplaceSelection', () =>
    translateReplaceSelection(config, guard, translation),
  );

  reg('aiTranslate.translateInsertBelow', () => translateInsertBelow(config, guard, translation));

  reg('aiTranslate.showQuickPick', () => showAiTranslateQuickPick(config, docService));
  reg('aiTranslate.translateSelectionPopup', () => translateSelectionPopup(config, guard, translation));

  reg('aiTranslate.selection.replace', async (...args: unknown[]) => {
    const id = args[0] as string;
    const action = hoverRegistry.get(id);
    if (!action) return;
    const editor = vscode.window.visibleTextEditors.find((e) => e.document.uri.toString() === action.uri);
    if (!editor) return;
    const start = editor.document.positionAt(action.range.start);
    const end = editor.document.positionAt(action.range.end);
    await editor.edit((eb) => eb.replace(new vscode.Range(start, end), action.translation));
  });

  reg('aiTranslate.selection.insertBelow', async (...args: unknown[]) => {
    const id = args[0] as string;
    const action = hoverRegistry.get(id);
    if (!action) return;
    const editor = vscode.window.visibleTextEditors.find((e) => e.document.uri.toString() === action.uri);
    if (!editor) return;
    const end = editor.document.positionAt(action.range.end);
    const line = editor.document.lineAt(end.line);
    const insertLine = end.character >= line.text.length ? end.line + 1 : end.line + 1;
    const indent = editor.document.lineAt(Math.min(insertLine, editor.document.lineCount - 1)).text.match(/^\s*/)?.[0] ?? '';
    await editor.edit((eb) => eb.insert(new vscode.Position(insertLine, 0), indent + action.translation + '\n'));
  });

  reg('aiTranslate.translateGitCommitAtLine', () =>
    translateGitCommitAtLine(config, guard, translation),
  );
  reg('aiTranslate.translateScmInput', () => translateScmInput(config, guard, translation));
  reg('aiTranslate.generateLocaleFile', async () => {
    const uri = vscode.window.activeTextEditor?.document.uri;
    if (!uri) return;
    return generateLocaleFile(uri, config, guard, translation);
  });
  reg('aiTranslate.suggestVariableNames', () => suggestVariableNames(config, guard, llm));

  reg('aiTranslate.acknowledgePrivacy', async () => {
    await guard.acknowledgeOrigin();
    void vscode.window.showInformationMessage(t('msg.privacyAcknowledged'));
  });

  reg('aiTranslate.hover.copy', async (...args: unknown[]) => {
    const id = args[0] as string;
    const action = hoverRegistry.get(id);
    if (action) await vscode.env.clipboard.writeText(action.translation);
  });

  reg('aiTranslate.hover.insertComment', async (...args: unknown[]) => {
    const id = args[0] as string;
    const action = hoverRegistry.get(id);
    if (!action) return;
    const editor = vscode.window.visibleTextEditors.find((e) => e.document.uri.toString() === action.uri);
    if (!editor) {
      void vscode.window.showWarningMessage(t('msg.positionChanged'));
      return;
    }
    const spec = getSpec(action.languageId);
    const prefix = spec?.lineCommentPrefixForInsert ?? '//';
    const line = editor.document.positionAt(action.range.start).line;
    const indent = editor.document.lineAt(line).text.match(/^\s*/)?.[0] ?? '';
    const lines = action.translation.split('\n').map((l) => indent + prefix + ' ' + l);
    await editor.edit((eb) => {
      const pos = new vscode.Position(line, 0);
      eb.insert(pos, lines.join('\n') + '\n');
    });
  });

  reg('aiTranslate.hover.refresh', async (...args: unknown[]) => {
    const id = args[0] as string;
    await refreshHoverTranslation(id, config, translation, hoverRegistry);
  });

  reg('aiTranslate.hover.retranslate', async (...args: unknown[]) => {
    const id = args[0] as string;
    await refreshHoverTranslation(id, config, translation, hoverRegistry);
  });

  config.onDidChange(() => {
    const c = config.get();
    logger.setLevelProvider(() => c.log.level);
    cacheService?.configure(c.cache.enabled, c.cache.memoryEntries, c.cache.maxDiskMB);
    parserService?.setMaxFileSizeKB(c.parser.maxFileSizeKB);
    preview.setPreviewStyle(c.document.previewStyle);
  });

  apiKeys.onDidChange(() => {
    translation.resetPause();
    void statusBar.refresh();
  });

  void glossary.ensureLoaded();
  logger.info(`AI Translate activated (VS Code ${vscode.version})`);
}

export async function deactivate(): Promise<void> {
  await cacheService?.flush();
  parserService?.dispose();
}
