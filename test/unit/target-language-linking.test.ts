import { describe, expect, it } from 'vitest';
import {
  bundleLocaleForPanelUi,
  loadBundleStringsForPanel,
} from '../../src/l10n/bundleStrings';
import {
  isBuiltinTargetLanguage,
  isTargetLanguageUnset,
  mapVscodeUiLanguageToTarget,
} from '../../src/l10n/targetLanguage';
import type { ConfigurationInspect } from '../../src/config/targetLanguageInspect';

describe('mapVscodeUiLanguageToTarget', () => {
  it('maps Chinese UI tags', () => {
    expect(mapVscodeUiLanguageToTarget('zh-cn')).toBe('zh-CN');
    expect(mapVscodeUiLanguageToTarget('zh-tw')).toBe('zh-TW');
    expect(mapVscodeUiLanguageToTarget('zh-hk')).toBe('zh-TW');
  });

  it('falls back to English for unknown UI locales', () => {
    expect(mapVscodeUiLanguageToTarget('en')).toBe('en');
    expect(mapVscodeUiLanguageToTarget('en-US')).toBe('en');
    expect(mapVscodeUiLanguageToTarget('it')).toBe('en');
  });
});

describe('isTargetLanguageUnset', () => {
  it('is true when no layer has a value', () => {
    expect(isTargetLanguageUnset({})).toBe(true);
    expect(
      isTargetLanguageUnset({
        globalValue: undefined,
        workspaceValue: undefined,
        workspaceFolderValue: undefined,
      }),
    ).toBe(true);
  });

  it('is false when any layer is set (must not bootstrap over user choice)', () => {
    const inspect: ConfigurationInspect<string> = { globalValue: 'zh-CN' };
    expect(isTargetLanguageUnset(inspect)).toBe(false);
    expect(
      isTargetLanguageUnset({ workspaceValue: 'en' }),
    ).toBe(false);
    expect(
      isTargetLanguageUnset({ workspaceFolderValue: 'ja' }),
    ).toBe(false);
  });
});

describe('panel UI language vs targetLanguage', () => {
  it('uses built-in locale bundles for known targets', () => {
    expect(bundleLocaleForPanelUi('ja')).toBe('ja');
    const strings = loadBundleStringsForPanel(
      (loc) => (loc === 'ja' ? { 'panel.title': '日本語タイトル' } : { 'panel.title': 'English' }),
      'ja',
    );
    expect(strings['panel.title']).toBe('日本語タイトル');
  });

  it('falls back to English UI for custom target values', () => {
    expect(isBuiltinTargetLanguage('Nederlands')).toBe(false);
    expect(bundleLocaleForPanelUi('Nederlands')).toBe('en');
    const strings = loadBundleStringsForPanel(
      (loc) => (loc === 'en' ? { 'panel.title': 'English title' } : { 'panel.title': '日本語' }),
      'Nederlands',
    );
    expect(strings['panel.title']).toBe('English title');
  });
});

describe('cursor UI bootstrap (simulated)', () => {
  function simulateBootstrap(input: {
    alreadyDone: boolean;
    inspect: ConfigurationInspect<string> | undefined;
    uiLanguage: string;
  }): { shouldApply: boolean; target?: string; shouldMarkDone: boolean } {
    if (input.alreadyDone) {
      return { shouldApply: false, shouldMarkDone: false };
    }
    const shouldMarkDone = true;
    if (!isTargetLanguageUnset(input.inspect)) {
      return { shouldApply: false, shouldMarkDone };
    }
    return {
      shouldApply: true,
      target: mapVscodeUiLanguageToTarget(input.uiLanguage),
      shouldMarkDone,
    };
  }

  it('applies mapped target only when unset', () => {
    expect(
      simulateBootstrap({ alreadyDone: false, inspect: {}, uiLanguage: 'en-US' }),
    ).toEqual({ shouldApply: true, target: 'en', shouldMarkDone: true });
  });

  it('does not override explicit zh-CN while UI is English', () => {
    expect(
      simulateBootstrap({
        alreadyDone: false,
        inspect: { globalValue: 'zh-CN' },
        uiLanguage: 'en',
      }),
    ).toEqual({ shouldApply: false, shouldMarkDone: true });
  });

  it('runs at most once per install', () => {
    expect(
      simulateBootstrap({ alreadyDone: true, inspect: {}, uiLanguage: 'ja' }),
    ).toEqual({ shouldApply: false, shouldMarkDone: false });
  });
});
