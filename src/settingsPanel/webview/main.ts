declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void;
  getState(): unknown;
  setState(s: unknown): void;
};

const vscode = acquireVsCodeApi();

type LanguageOption = { value: string; label: string };

type PanelState = {
  strings: Record<string, string>;
  scope: 'global' | 'workspace';
  values: Record<string, unknown>;
  overrides: Record<string, 'workspace' | 'workspaceFolder' | null>;
  apiKeyConfigured: boolean;
  cacheStats: { memoryEntries: number; diskBytes: number };
  totalNativeSettings: number;
  targetLanguage: string;
  targetLanguageIsCustom: boolean;
  languageOptions: LanguageOption[];
  showLocaleBootstrapHint: boolean;
};

let state: PanelState | null = null;
let scope: 'global' | 'workspace' = 'global';
let mounted = false;

function t(key: string): string {
  return state?.strings[key] ?? key;
}

function el(tag: string, className?: string): HTMLElement {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function setText(node: HTMLElement | null, text: string): void {
  if (node) node.textContent = text;
}

function applyI18n(): void {
  if (!state) return;
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((node) => {
    const key = node.dataset.i18n;
    if (key) node.textContent = t(key);
  });
  const footerLink = document.getElementById('footer-link');
  if (footerLink) {
    footerLink.textContent = t('panel.openNativeSettings').replace('{0}', String(state.totalNativeSettings));
  }
  const stats = document.getElementById('cache-stats');
  if (stats && state) {
    stats.textContent = `${t('panel.cache.stats')}: ${state.cacheStats.memoryEntries} · ${formatBytes(state.cacheStats.diskBytes)}`;
  }
  const keyStatus = document.getElementById('api-key-status');
  if (keyStatus) {
    keyStatus.textContent = state.apiKeyConfigured ? t('panel.apiKey.configured') : t('panel.apiKey.notConfigured');
  }
  const hint = document.getElementById('locale-bootstrap-hint');
  if (hint) {
    hint.hidden = !state.showLocaleBootstrapHint;
    hint.textContent = t('panel.localeBootstrapHint');
  }
  syncLanguageSelect();
}

function syncLanguageSelect(): void {
  if (!state) return;
  const sel = document.getElementById('lang-select') as HTMLSelectElement | null;
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '';
  for (const opt of state.languageOptions) {
    const o = el('option') as HTMLOptionElement;
    o.value = opt.value;
    o.textContent = opt.label;
    sel.appendChild(o);
  }
  if (state.targetLanguageIsCustom) {
    const custom = el('option') as HTMLOptionElement;
    custom.value = state.targetLanguage;
    custom.textContent = t('panel.targetLanguage.custom').replace('{0}', state.targetLanguage);
    custom.selected = true;
    sel.appendChild(custom);
  } else {
    sel.value = state.targetLanguage;
  }
  if (current !== sel.value && document.activeElement !== sel) {
    sel.value = state.targetLanguageIsCustom ? state.targetLanguage : state.targetLanguage;
  }
}

function applyValues(): void {
  if (!state) return;
  const v = state.values;
  const setVal = (id: string, value: string | number | boolean) => {
    const node = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
    if (!node || document.activeElement === node) return;
    if (node instanceof HTMLInputElement && node.type === 'checkbox') {
      node.checked = Boolean(value);
    } else {
      node.value = String(value);
    }
  };
  setVal('field-llm.baseUrl', String(v['llm.baseUrl'] ?? ''));
  setVal('field-llm.model', String(v['llm.model'] ?? ''));
  setVal('field-llm.stream', Boolean(v['llm.stream']));
  setVal('field-llm.extraBody', JSON.stringify(v['llm.extraBody'] ?? {}, null, 2));
  setVal('field-detection.strictChineseVariant', Boolean(v['detection.strictChineseVariant']));
  setVal('field-hover.enabled', Boolean(v['hover.enabled']));
  setVal('field-hover.extraDelayMs', Number(v['hover.extraDelayMs'] ?? 700));
  setVal('field-document.previewStyle', String(v['document.previewStyle'] ?? 'interleaved'));
  setVal('field-document.codeLens', Boolean(v['document.codeLens']));
  setVal('field-document.forceTranslate', Boolean(v['document.forceTranslate']));
  setVal('field-cache.enabled', Boolean(v['cache.enabled']));
  for (const key of [
    'hover.comments',
    'hover.strings',
    'hover.documents',
    'hover.configKeys',
    'hover.diagnostics',
    'hover.symbolDocs',
    'hover.gitCommitMessage',
    'hover.selection',
  ]) {
    setVal(`field-${key}`, Boolean(v[key]));
  }
  syncLanguageSelect();
  const overrideHint = document.getElementById('override-hint');
  if (overrideHint) {
    overrideHint.hidden = !Object.values(state.overrides).some((x) => x);
  }
}

function mount(): void {
  const app = document.getElementById('app');
  if (!app || mounted) return;
  mounted = true;
  app.innerHTML = '';

  const header = el('div', 'header-row');
  const h1 = el('h1');
  h1.dataset.i18n = 'panel.title';
  header.appendChild(h1);
  const langWrap = el('div', 'lang-control');
  const langLab = el('label');
  langLab.dataset.i18n = 'panel.language.label';
  langLab.htmlFor = 'lang-select';
  const langSel = el('select', 'lang-select') as HTMLSelectElement;
  langSel.id = 'lang-select';
  langSel.onchange = () => {
    vscode.postMessage({ type: 'update', key: 'targetLanguage', value: langSel.value });
  };
  langWrap.append(langLab, langSel);
  header.appendChild(langWrap);
  app.appendChild(header);

  const bootstrapHint = el('p', 'locale-hint');
  bootstrapHint.id = 'locale-bootstrap-hint';
  bootstrapHint.hidden = true;
  app.appendChild(bootstrapHint);

  const scopeBar = el('div', 'scope-bar');
  const userBtn = el('button');
  userBtn.id = 'scope-user';
  userBtn.dataset.i18n = 'panel.scope.user';
  userBtn.onclick = () => {
    scope = 'global';
    vscode.postMessage({ type: 'setScope', scope });
  };
  const wsBtn = el('button');
  wsBtn.id = 'scope-ws';
  wsBtn.dataset.i18n = 'panel.scope.workspace';
  wsBtn.onclick = () => {
    scope = 'workspace';
    vscode.postMessage({ type: 'setScope', scope });
  };
  const overrideHint = el('span', 'override');
  overrideHint.id = 'override-hint';
  overrideHint.dataset.i18n = 'panel.override.workspace';
  overrideHint.hidden = true;
  scopeBar.append(userBtn, wsBtn, overrideHint);
  app.appendChild(scopeBar);

  const modelH = el('h2');
  modelH.dataset.i18n = 'panel.section.model';
  app.appendChild(modelH);

  app.appendChild(textField('llm.baseUrl', 'panel.field.baseUrl'));
  app.appendChild(textField('llm.model', 'panel.field.model'));

  const keyRow = el('div', 'row');
  const keyStatus = el('div');
  keyStatus.id = 'api-key-status';
  const setKey = el('button', 'action');
  setKey.dataset.i18n = 'panel.apiKey.set';
  setKey.onclick = () => vscode.postMessage({ type: 'openSetApiKey' });
  keyRow.append(keyStatus, setKey);
  app.appendChild(keyRow);

  app.appendChild(checkField('llm.stream', 'panel.field.stream'));

  const extraLabel = el('label');
  extraLabel.dataset.i18n = 'panel.field.extraBody';
  app.appendChild(extraLabel);
  const extra = el('textarea');
  extra.id = 'field-llm.extraBody';
  extra.onchange = () => vscode.postMessage({ type: 'update', key: 'llm.extraBody', value: extra.value });
  app.appendChild(extra);

  const tplRow = el('div', 'row');
  for (const [template, labelKey] of [
    ['deepseek', 'panel.extraBody.templates.deepseek'],
    ['qwen', 'panel.extraBody.templates.qwen'],
    ['clear', 'panel.extraBody.clear'],
  ] as const) {
    const b = el('button', 'action secondary');
    b.dataset.i18n = labelKey;
    b.onclick = () => vscode.postMessage({ type: 'applyExtraBodyTemplate', template });
    tplRow.appendChild(b);
  }
  app.appendChild(tplRow);

  const testBtn = el('button', 'action');
  testBtn.dataset.i18n = 'panel.testConnection';
  testBtn.onclick = () => vscode.postMessage({ type: 'testConnection' });
  app.appendChild(testBtn);
  const testStatus = el('div', 'status');
  testStatus.id = 'test-status';
  app.appendChild(testStatus);

  const detH = el('h2');
  detH.dataset.i18n = 'panel.section.detection';
  app.appendChild(detH);
  app.appendChild(checkField('detection.strictChineseVariant', 'panel.strictChineseVariant'));

  const hoverH = el('h2');
  hoverH.dataset.i18n = 'panel.section.hover';
  app.appendChild(hoverH);
  app.appendChild(checkField('hover.enabled', 'panel.hover.enabled'));
  app.appendChild(numberField('hover.extraDelayMs', 'panel.hover.extraDelayMs'));

  const checks = el('div', 'checks');
  for (const [key, labelKey] of [
    ['hover.comments', 'panel.hover.comments'],
    ['hover.strings', 'panel.hover.strings'],
    ['hover.documents', 'panel.hover.documents'],
    ['hover.configKeys', 'panel.hover.configKeys'],
    ['hover.diagnostics', 'panel.hover.diagnostics'],
    ['hover.symbolDocs', 'panel.hover.symbolDocs'],
    ['hover.gitCommitMessage', 'panel.hover.gitCommitMessage'],
    ['hover.selection', 'panel.hover.selection'],
  ] as const) {
    checks.appendChild(inlineCheck(key, labelKey));
  }
  app.appendChild(checks);

  const docH = el('h2');
  docH.dataset.i18n = 'panel.section.document';
  app.appendChild(docH);
  app.appendChild(selectField('document.previewStyle', 'panel.document.previewStyle', ['interleaved', 'append']));
  app.appendChild(checkField('document.codeLens', 'panel.document.codeLens'));
  app.appendChild(checkField('document.forceTranslate', 'panel.document.forceTranslate'));

  const cacheH = el('h2');
  cacheH.dataset.i18n = 'panel.section.cache';
  app.appendChild(cacheH);
  app.appendChild(checkField('cache.enabled', 'panel.cache.enabled'));
  const stats = el('div', 'row');
  stats.id = 'cache-stats';
  app.appendChild(stats);
  const clearBtn = el('button', 'action secondary');
  clearBtn.dataset.i18n = 'panel.cache.clear';
  clearBtn.onclick = () => vscode.postMessage({ type: 'clearCache' });
  app.appendChild(clearBtn);

  const footer = el('div', 'footer');
  const link = el('a');
  link.id = 'footer-link';
  link.onclick = () => vscode.postMessage({ type: 'openNativeSettings' });
  footer.appendChild(link);
  app.appendChild(footer);
}

function textField(key: string, labelKey: string): HTMLElement {
  const row = el('div', 'row');
  const lab = el('label');
  lab.dataset.i18n = labelKey;
  lab.htmlFor = `field-${key}`;
  row.appendChild(lab);
  const input = el('input');
  input.id = `field-${key}`;
  input.type = 'text';
  input.onchange = () => vscode.postMessage({ type: 'update', key, value: input.value });
  row.appendChild(input);
  return row;
}

function numberField(key: string, labelKey: string): HTMLElement {
  const row = el('div', 'row');
  const lab = el('label');
  lab.dataset.i18n = labelKey;
  lab.htmlFor = `field-${key}`;
  row.appendChild(lab);
  const input = el('input');
  input.id = `field-${key}`;
  input.type = 'number';
  input.onchange = () => vscode.postMessage({ type: 'update', key, value: Number(input.value) });
  row.appendChild(input);
  return row;
}

function selectField(key: string, labelKey: string, options: string[]): HTMLElement {
  const row = el('div', 'row');
  const lab = el('label');
  lab.dataset.i18n = labelKey;
  lab.htmlFor = `field-${key}`;
  row.appendChild(lab);
  const sel = el('select');
  sel.id = `field-${key}`;
  for (const o of options) {
    const opt = el('option');
    opt.value = o;
    opt.textContent = o;
    sel.appendChild(opt);
  }
  sel.onchange = () => vscode.postMessage({ type: 'update', key, value: sel.value });
  row.appendChild(sel);
  return row;
}

function checkField(key: string, labelKey: string): HTMLElement {
  const row = el('div', 'row');
  const lab = el('label');
  const input = el('input');
  input.id = `field-${key}`;
  input.type = 'checkbox';
  input.onchange = () => vscode.postMessage({ type: 'update', key, value: input.checked });
  const span = el('span');
  span.dataset.i18n = labelKey;
  lab.append(input, span);
  row.appendChild(lab);
  return row;
}

function inlineCheck(key: string, labelKey: string): HTMLElement {
  const lab = el('label');
  const input = el('input');
  input.id = `field-${key}`;
  input.type = 'checkbox';
  input.onchange = () => vscode.postMessage({ type: 'update', key, value: input.checked });
  const span = el('span');
  span.dataset.i18n = labelKey;
  lab.append(input, span);
  return lab;
}

function updateScopeButtons(): void {
  const userBtn = document.getElementById('scope-user');
  const wsBtn = document.getElementById('scope-ws');
  userBtn?.classList.toggle('active', scope === 'global');
  wsBtn?.classList.toggle('active', scope === 'workspace');
}

function absorbInit(msg: PanelState & { type?: string }): void {
  state = {
    strings: msg.strings,
    scope: msg.scope,
    values: msg.values,
    overrides: msg.overrides,
    apiKeyConfigured: msg.apiKeyConfigured,
    cacheStats: msg.cacheStats,
    totalNativeSettings: msg.totalNativeSettings,
    targetLanguage: msg.targetLanguage,
    targetLanguageIsCustom: msg.targetLanguageIsCustom,
    languageOptions: msg.languageOptions,
    showLocaleBootstrapHint: msg.showLocaleBootstrapHint,
  };
  scope = msg.scope;
  mount();
  applyI18n();
  applyValues();
  updateScopeButtons();
}

window.addEventListener('message', (ev) => {
  const msg = ev.data;
  if (msg.type === 'init') {
    absorbInit(msg);
  } else if (msg.type === 'localeUpdate' && state) {
    state.strings = msg.strings;
    state.targetLanguage = msg.targetLanguage;
    state.targetLanguageIsCustom = msg.targetLanguageIsCustom;
    state.languageOptions = msg.languageOptions;
    state.showLocaleBootstrapHint = msg.showLocaleBootstrapHint;
    applyI18n();
    syncLanguageSelect();
  } else if (msg.type === 'state' && state) {
    state.values = msg.values;
    state.overrides = msg.overrides;
    if (msg.cacheStats) state.cacheStats = msg.cacheStats;
    if (msg.apiKeyConfigured !== undefined) state.apiKeyConfigured = msg.apiKeyConfigured;
    applyValues();
    applyI18n();
    updateScopeButtons();
  } else if (msg.type === 'testResult') {
    const node = document.getElementById('test-status');
    if (node) {
      node.textContent = msg.message;
      node.className = 'status ' + (msg.ok ? 'ok' : 'err');
    }
  } else if (msg.type === 'extraBodyError') {
    const node = document.getElementById('test-status');
    if (node) {
      node.textContent = msg.message;
      node.className = 'status err';
    }
  }
});

vscode.postMessage({ type: 'ready' });
