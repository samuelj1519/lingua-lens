// ALLOW_CJK_LOCALE_DATA: zh-CN string values for bundle key backfill.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const dir = join(root, 'i18n/bundle');

const enExtra = {
  'hover.brand': 'LinguaLens',
  'hover.sectionPrefix': 'LinguaLens · {0}',
  'hover.fromCache': ' · cache',
  'hover.invalidCache': ' · invalid cache',
  'hover.title.gitCommit': 'Git commit message',
  'hover.title.diagnostics': 'Diagnostics',
  'hover.title.symbolDocs': 'Symbol documentation',
  'hover.title.selection': 'Selection',
  'hover.action.copy': 'Copy',
  'hover.action.insertComment': 'Insert as comment',
  'hover.action.replaceSelection': 'Replace selection',
  'hover.action.insertBelow': 'Insert below',
  'hover.action.refresh': 'Refresh',
  'codelens.translatePreview': '🌐 Translate document (preview)',
  'codelens.generateSideFile': 'Generate translation file',
  'codelens.refreshDocument': '🔄 Refresh document translation',
  'statusbar.tooltip.title': 'LinguaLens',
  'statusbar.tooltip.enabled': 'enabled',
  'statusbar.tooltip.disabled': 'disabled',
  'statusbar.tooltip.target': 'Target',
  'statusbar.tooltip.apiCalls': 'API calls',
  'statusbar.tooltip.cacheHits': 'Cache hits (mem/disk)',
  'statusbar.tooltip.skipped': 'Skipped locally',
  'statusbar.tooltip.errors': 'Errors',
  'statusbar.tooltip.tokens': 'Tokens (in/out)',
  'statusbar.tooltip.model': 'Model',
  'statusbar.tooltip.setApiKey': 'Set API Key',
  'statusbar.tooltip.clearCache': 'Clear cache',
  'statusbar.pickLanguage.title': 'Select target language',
  'quickpick.title': 'LinguaLens',
  'quickpick.enable': 'Enable LinguaLens',
  'quickpick.disable': 'Disable LinguaLens',
  'quickpick.selectLanguage': 'Select target language',
  'quickpick.translateDocument': 'Translate document (preview)',
  'quickpick.generateSideFile': 'Generate translation file',
  'quickpick.openSettings': 'Open settings',
  'quickpick.settingsPanel': 'Settings panel',
  'quickpick.setApiKey': 'Set API Key',
  'doc.alreadyTarget': 'Document is already in the target language; nothing to translate.',
  'doc.markdownOnly':
    'Whole-document translation supports Markdown/plain text only; use hover for config files.',
  'doc.fileExcluded': 'This file is excluded.',
  'doc.disabled': 'LinguaLens is disabled.',
  'doc.openPreviewFirst': 'Open the document translation preview first.',
  'doc.previewExpired': 'Preview expired. Run the translate document command again.',
  'doc.preview.header':
    '> AI translation preview (read-only) · Source {0} · Target {1} · Progress {2}/{3}',
  'msg.secretNotSent': 'Looks like a secret; not sent.',
  'msg.translationDone': 'Translation complete',
  'msg.copyTranslation': 'Copy translation',
  'msg.copy': 'Copy',
  'msg.replaceSelection': 'Replace selection',
  'msg.replace': 'Replace',
  'msg.hoverExpired': 'Hover action expired; hover again.',
  'msg.emptyTranslation': 'Model returned empty translation.',
  'msg.hoverRefreshed': 'Translation refreshed; move the cursor back and hover again.',
  'msg.selectTextFirst': 'Select text first.',
  'msg.clearCacheConfirm': 'Clear all translation cache?',
  'msg.clearCacheYes': 'Clear',
  'msg.cacheCleared': 'Cache cleared',
  'msg.clearApiKey.title': 'Clear API Key',
  'msg.clearApiKey.current': 'Clear current origin',
  'msg.clearApiKey.all': 'Clear all',
  'msg.clearApiKey.confirm': 'Clear API Key?',
  'msg.confirm': 'Confirm',
  'msg.positionChanged': 'Source position changed.',
  'msg.privacyAcknowledged': 'Privacy notice acknowledged.',
  'msg.apiKeyPrompt': 'Set API Key for {0}',
  'msg.glossaryCreate': 'Glossary not found. Create?',
  'msg.create': 'Create',
  'msg.git.useInRepo': 'Use this command on a file inside a repository.',
  'msg.git.noCommitMessage': 'No Git commit message for this line.',
  'msg.scm.empty': 'SCM input is empty.',
  'msg.scm.replacePrompt': 'Replace SCM input with translation?',
  'msg.copied': 'Copied: {0}',
  'msg.localeUnsupported': 'Only JSON/YAML/properties locale files are supported.',
  'msg.localeUpToDate': 'Locale file is already up to date.',
  'msg.localeWritten': 'Written to {0}',
  'msg.sideFileSamePath': 'Translation file path cannot match the source file.',
  'msg.sideFileExists': 'File already exists. Overwrite?',
  'msg.overwrite': 'Overwrite',
  'msg.sideFileWritten': 'Written to {0}',
  'privacy.prompt':
    'LinguaLens sends comments, strings, and documents to {0} for translation. Confirm this is allowed for your project.',
  'privacy.continue': 'Continue',
  'privacy.disableWorkspace': 'Disable for this workspace only',
  'privacy.openSettings': 'Open settings',
  'codeAction.translateSelection': 'Translate selection',
};

const zhCnExtra = {
  'hover.brand': 'LinguaLens',
  'hover.sectionPrefix': 'LinguaLens · {0}',
  'hover.fromCache': ' · 缓存',
  'hover.invalidCache': ' · 缓存无效',
  'hover.title.gitCommit': 'Git 提交说明',
  'hover.title.diagnostics': '诊断信息',
  'hover.title.symbolDocs': '符号文档',
  'hover.title.selection': '选区',
  'hover.action.copy': '复制',
  'hover.action.insertComment': '插入为注释',
  'hover.action.replaceSelection': '替换选区',
  'hover.action.insertBelow': '插入下方',
  'hover.action.refresh': '刷新',
  'codelens.translatePreview': '🌐 翻译全文（对照预览）',
  'codelens.generateSideFile': '生成译文文件',
  'codelens.refreshDocument': '🔄 刷新全文翻译',
  'statusbar.tooltip.title': 'LinguaLens',
  'statusbar.tooltip.enabled': '已启用',
  'statusbar.tooltip.disabled': '已禁用',
  'statusbar.tooltip.target': '目标',
  'statusbar.tooltip.apiCalls': 'API 调用',
  'statusbar.tooltip.cacheHits': '缓存命中 (内存/磁盘)',
  'statusbar.tooltip.skipped': '本地跳过',
  'statusbar.tooltip.errors': '错误',
  'statusbar.tooltip.tokens': 'Token (输入/输出)',
  'statusbar.tooltip.model': '模型',
  'statusbar.tooltip.setApiKey': '设置 API Key',
  'statusbar.tooltip.clearCache': '清除缓存',
  'statusbar.pickLanguage.title': '选择目标语言',
  'quickpick.title': 'LinguaLens',
  'quickpick.enable': '启用 LinguaLens',
  'quickpick.disable': '禁用 LinguaLens',
  'quickpick.selectLanguage': '选择目标语言',
  'quickpick.translateDocument': '翻译全文（对照预览）',
  'quickpick.generateSideFile': '生成译文文件',
  'quickpick.openSettings': '打开设置',
  'quickpick.settingsPanel': '设置面板',
  'quickpick.setApiKey': '设置 API Key',
  'doc.alreadyTarget': '文档已是目标语言，无需翻译',
  'doc.markdownOnly': '整篇翻译仅支持 Markdown / 纯文本；配置文件请使用悬停翻译。',
  'doc.fileExcluded': '该文件已被排除',
  'doc.disabled': 'LinguaLens 已禁用',
  'doc.openPreviewFirst': '请先打开全文翻译预览',
  'doc.previewExpired': '预览已失效，请重新执行「翻译文档」命令。',
  'doc.preview.header': '> LinguaLens预览 (只读) · 源文件 {0} · 目标 {1} · 进度 {2}/{3}',
  'msg.secretNotSent': '疑似密钥，未发送',
  'msg.translationDone': '翻译完成',
  'msg.copyTranslation': '复制译文',
  'msg.copy': '复制',
  'msg.replaceSelection': '替换选区',
  'msg.replace': '替换',
  'msg.hoverExpired': '悬停操作已过期，请再次悬停',
  'msg.emptyTranslation': '模型返回空译文',
  'msg.hoverRefreshed': '已刷新译文，请将光标移回原文后再次悬停',
  'msg.selectTextFirst': '请先选中文本',
  'msg.clearCacheConfirm': '清除所有翻译缓存？',
  'msg.clearCacheYes': '清除',
  'msg.cacheCleared': '缓存已清除',
  'msg.clearApiKey.title': '清除 API Key',
  'msg.clearApiKey.current': '清除当前 origin',
  'msg.clearApiKey.all': '清除全部',
  'msg.clearApiKey.confirm': '确认清除 API Key？',
  'msg.confirm': '确认',
  'msg.positionChanged': '原文位置已变化',
  'msg.privacyAcknowledged': '已确认隐私提示',
  'msg.apiKeyPrompt': '为 {0} 设置 API Key',
  'msg.glossaryCreate': '术语表不存在，是否创建？',
  'msg.create': '创建',
  'msg.git.useInRepo': '请在仓库内的文件中使用此命令',
  'msg.git.noCommitMessage': '未找到该行的 Git 提交说明',
  'msg.scm.empty': 'SCM 提交说明框为空',
  'msg.scm.replacePrompt': '翻译完成，是否替换 SCM 输入框内容？',
  'msg.copied': '已复制: {0}',
  'msg.localeUnsupported': '仅支持 JSON/YAML/properties 语言包',
  'msg.localeUpToDate': '语言包已是最新，无需更新',
  'msg.localeWritten': '已写入 {0}',
  'msg.sideFileSamePath': '译文文件路径不能与源文件相同',
  'msg.sideFileExists': '文件已存在，是否覆盖？',
  'msg.overwrite': '覆盖',
  'msg.sideFileWritten': '已写入 {0}',
  'privacy.prompt':
    'LinguaLens 会把注释、字符串和文档内容发送到 {0} 进行翻译。公司项目请确认是否允许。',
  'privacy.continue': '继续',
  'privacy.disableWorkspace': '仅对此工作区禁用',
  'privacy.openSettings': '打开设置',
  'codeAction.translateSelection': '翻译选区',
};

function mergeJson(path, extra) {
  const j = JSON.parse(readFileSync(path, 'utf8'));
  Object.assign(j, extra);
  const sorted = Object.keys(j).sort();
  const out = {};
  for (const k of sorted) out[k] = j[k];
  writeFileSync(path, `${JSON.stringify(out, null, 2)}\n`);
}

mergeJson(join(dir, 'en.json'), enExtra);
mergeJson(join(dir, 'zh-cn.json'), zhCnExtra);

const en = JSON.parse(readFileSync(join(dir, 'en.json'), 'utf8'));
const enKeys = Object.keys(en);
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.json') || f === 'en.json') continue;
  const p = join(dir, f);
  const j = JSON.parse(readFileSync(p, 'utf8'));
  for (const k of enKeys) {
    if (!j[k]) j[k] = en[k];
  }
  const sorted = Object.keys(j).sort();
  const out = {};
  for (const k of sorted) out[k] = j[k];
  writeFileSync(p, `${JSON.stringify(out, null, 2)}\n`);
}

console.log('UI l10n keys:', enKeys.length);
