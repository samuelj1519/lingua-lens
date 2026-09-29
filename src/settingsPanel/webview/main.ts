declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void;
  getState(): unknown;
  setState(s: unknown): void;
};

const vscode = acquireVsCodeApi();

type InitMsg = {
  type: 'init';
  strings: Record<string, string>;
  scope: 'global' | 'workspace';
  values: Record<string, unknown>;
  overrides: Record<string, 'workspace' | 'workspaceFolder' | null>;
  apiKeyConfigured: boolean;
  cacheStats: { memoryEntries: number; diskBytes: number };
  totalNativeSettings: number;
  targetLanguage: string;
};

let state: InitMsg | null = null;
let scope: 'global' | 'workspace' = 'global';

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

function render(): void {
  const app = document.getElementById('app');
  if (!app || !state) return;
  app.innerHTML = '';

  const h1 = el('h1');
  h1.textContent = t('panel.title');
  app.appendChild(h1);

  const scopeBar = el('div', 'scope-bar');
  const userBtn = el('button');
  userBtn.textContent = t('panel.scope.user');
  userBtn.classList.toggle('active', scope === 'global');
  userBtn.onclick = () => {
    scope = 'global';
    vscode.postMessage({ type: 'setScope', scope });
  };
  const wsBtn = el('button');
  wsBtn.textContent = t('panel.scope.workspace');
  wsBtn.classList.toggle('active', scope === 'workspace');
  wsBtn.onclick = () => {
    scope = 'workspace';
    vscode.postMessage({ type: 'setScope', scope });
  };
  scopeBar.append(userBtn, wsBtn);
  if (Object.values(state.overrides).some((v) => v)) {
    const hint = el('span', 'override');
    hint.textContent = t('panel.override.workspace');
    scopeBar.appendChild(hint);
  }
  app.appendChild(scopeBar);

  const modelH = el('h2');
  modelH.textContent = t('panel.section.model');
  app.appendChild(modelH);

  app.appendChild(fieldText('llm.baseUrl', t('panel.field.baseUrl'), String(state.values['llm.baseUrl'] ?? '')));
  app.appendChild(fieldText('llm.model', t('panel.field.model'), String(state.values['llm.model'] ?? '')));

  const keyRow = el('div', 'row');
  const keyStatus = el('div');
  keyStatus.textContent = state.apiKeyConfigured ? t('panel.apiKey.configured') : t('panel.apiKey.notConfigured');
  const setKey = el('button', 'action');
  setKey.textContent = t('panel.apiKey.set');
  setKey.onclick = () => vscode.postMessage({ type: 'openSetApiKey' });
  keyRow.append(keyStatus, setKey);
  app.appendChild(keyRow);

  app.appendChild(fieldCheck('llm.stream', t('panel.field.stream') || 'Stream', Boolean(state.values['llm.stream'])));

  const extraLabel = el('label');
  extraLabel.textContent = t('panel.field.extraBody') || 'extraBody';
  app.appendChild(extraLabel);
  const extra = el('textarea');
  extra.value = JSON.stringify(state.values['llm.extraBody'] ?? {}, null, 2);
  extra.onchange = () => vscode.postMessage({ type: 'update', key: 'llm.extraBody', value: extra.value });
  app.appendChild(extra);
  const tplRow = el('div', 'row');
  for (const [template, labelKey] of [
    ['deepseek', 'panel.extraBody.templates.deepseek'],
    ['qwen', 'panel.extraBody.templates.qwen'],
    ['clear', 'panel.extraBody.clear'],
  ] as const) {
    const b = el('button', 'action secondary');
    b.textContent = t(labelKey);
    b.onclick = () => vscode.postMessage({ type: 'applyExtraBodyTemplate', template });
    tplRow.appendChild(b);
  }
  app.appendChild(tplRow);
  const testBtn = el('button', 'action');
  testBtn.textContent = t('panel.testConnection');
  testBtn.onclick = () => vscode.postMessage({ type: 'testConnection' });
  app.appendChild(testBtn);
  const testStatus = el('div', 'status');
  testStatus.id = 'test-status';
  app.appendChild(testStatus);

  const detH = el('h2');
  detH.textContent = t('panel.section.target') || t('panel.targetLanguage');
  app.appendChild(detH);
  app.appendChild(
    fieldSelect(
      'targetLanguage',
      t('panel.targetLanguage'),
      String(state.values['targetLanguage'] ?? 'zh-CN'),
      ['zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'ru'],
    ),
  );
  app.appendChild(
    fieldCheck(
      'detection.strictChineseVariant',
      t('panel.strictChineseVariant'),
      Boolean(state.values['detection.strictChineseVariant']),
    ),
  );

  const hoverH = el('h2');
  hoverH.textContent = t('panel.section.hover');
  app.appendChild(hoverH);
  app.appendChild(fieldCheck('hover.enabled', t('panel.hover.enabled'), Boolean(state.values['hover.enabled'])));
  app.appendChild(
    fieldNumber('hover.extraDelayMs', t('panel.hover.extraDelayMs') || 'Delay (ms)', Number(state.values['hover.extraDelayMs'] ?? 700)),
  );
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
    checks.appendChild(fieldCheckInline(key, t(labelKey), Boolean(state.values[key])));
  }
  app.appendChild(checks);

  const docH = el('h2');
  docH.textContent = t('panel.section.document');
  app.appendChild(docH);
  app.appendChild(
    fieldSelect('document.previewStyle', t('panel.document.previewStyle'), String(state.values['document.previewStyle'] ?? 'interleaved'), [
      'interleaved',
      'append',
    ]),
  );
  app.appendChild(fieldCheck('document.codeLens', t('panel.document.codeLens'), Boolean(state.values['document.codeLens'])));
  app.appendChild(
    fieldCheck('document.forceTranslate', t('panel.document.forceTranslate'), Boolean(state.values['document.forceTranslate'])),
  );

  const cacheH = el('h2');
  cacheH.textContent = t('panel.section.cache');
  app.appendChild(cacheH);
  app.appendChild(fieldCheck('cache.enabled', t('panel.cache.enabled'), Boolean(state.values['cache.enabled'])));
  const stats = el('div', 'row');
  stats.textContent = `${t('panel.cache.stats') || 'Cache'}: ${state.cacheStats.memoryEntries} · ${formatBytes(state.cacheStats.diskBytes)}`;
  app.appendChild(stats);
  const clearBtn = el('button', 'action secondary');
  clearBtn.textContent = t('panel.cache.clear') || 'Clear cache';
  clearBtn.onclick = () => vscode.postMessage({ type: 'clearCache' });
  app.appendChild(clearBtn);

  const footer = el('div', 'footer');
  const link = el('a');
  link.textContent = (t('panel.openNativeSettings') || 'Open all settings').replace(
    '{0}',
    String(state.totalNativeSettings),
  );
  link.onclick = () => vscode.postMessage({ type: 'openNativeSettings' });
  footer.appendChild(link);
  app.appendChild(footer);
}

function overrideHint(key: string): HTMLElement | null {
  const o = state?.overrides[key];
  if (!o) return null;
  const s = el('div', 'override');
  s.textContent = o === 'workspaceFolder' ? 'workspace folder' : 'workspace';
  return s;
}

function fieldText(key: string, label: string, value: string): HTMLElement {
  const row = el('div', 'row');
  const lab = el('label');
  lab.textContent = label;
  row.appendChild(lab);
  const hint = overrideHint(key);
  if (hint) row.appendChild(hint);
  const input = el('input');
  input.type = 'text';
  input.value = value;
  input.onchange = () => vscode.postMessage({ type: 'update', key, value: input.value });
  row.appendChild(input);
  return row;
}

function fieldNumber(key: string, label: string, value: number): HTMLElement {
  const row = el('div', 'row');
  const lab = el('label');
  lab.textContent = label;
  row.appendChild(lab);
  const input = el('input');
  input.type = 'number';
  input.value = String(value);
  input.onchange = () => vscode.postMessage({ type: 'update', key, value: Number(input.value) });
  row.appendChild(input);
  return row;
}

function fieldSelect(key: string, label: string, value: string, options: string[]): HTMLElement {
  const row = el('div', 'row');
  const lab = el('label');
  lab.textContent = label;
  row.appendChild(lab);
  const sel = el('select');
  for (const o of options) {
    const opt = el('option');
    opt.value = o;
    opt.textContent = o;
    if (o === value) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.onchange = () => vscode.postMessage({ type: 'update', key, value: sel.value });
  row.appendChild(sel);
  return row;
}

function fieldCheck(key: string, label: string, checked: boolean): HTMLElement {
  const row = el('div', 'row');
  const lab = el('label');
  const input = el('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.onchange = () => vscode.postMessage({ type: 'update', key, value: input.checked });
  lab.append(input, document.createTextNode(' ' + label));
  row.appendChild(lab);
  return row;
}

function fieldCheckInline(key: string, label: string, checked: boolean): HTMLElement {
  const lab = el('label');
  const input = el('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.onchange = () => vscode.postMessage({ type: 'update', key, value: input.checked });
  lab.append(input, document.createTextNode(' ' + label));
  return lab;
}

window.addEventListener('message', (ev) => {
  const msg = ev.data;
  if (msg.type === 'init') {
    state = msg as InitMsg;
    scope = msg.scope;
    render();
  } else if (msg.type === 'state' && state) {
    state.values = msg.values;
    state.overrides = msg.overrides;
    render();
  } else if (msg.type === 'testResult') {
    const el = document.getElementById('test-status');
    if (el) {
      el.textContent = msg.message;
      el.className = 'status ' + (msg.ok ? 'ok' : 'err');
    }
  } else if (msg.type === 'cacheCleared' && state) {
    render();
  } else if (msg.type === 'extraBodyError') {
    const el = document.getElementById('test-status');
    if (el) {
      el.textContent = msg.message;
      el.className = 'status err';
    }
  }
});

vscode.postMessage({ type: 'ready' });
