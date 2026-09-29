import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CONFIG_KEYS_USED_IN_CODE } from '../../src/config/keysUsedInCode';
import {
  LEGACY_CONFIG_SECTION,
  CONFIG_SECTION,
  migrateLegacySettings,
} from '../../src/migration/settingsMigration';

const updates: Array<{ section: string; key: string; value: unknown; target: number }> = [];

const { ConfigurationTarget } = vi.hoisted(() => ({
  ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
}));

let modernEnabled: unknown = undefined;

vi.mock('vscode', () => ({
  ConfigurationTarget,
  workspace: {
    workspaceFolders: undefined,
    getConfiguration: (section: string) => ({
      inspect: (key: string) => {
        if (key !== 'enabled') return {};
        if (section === LEGACY_CONFIG_SECTION) return { globalValue: false };
        if (section === CONFIG_SECTION) return { globalValue: modernEnabled };
        return {};
      },
      update: async (key: string, value: unknown, target: number) => {
        updates.push({ section, key, value, target });
      },
    }),
  },
}));

describe('settings migration', () => {
  beforeEach(() => {
    updates.length = 0;
    modernEnabled = undefined;
  });

  it('migrates legacy global values and clears old keys', async () => {
    const globalState = new Map<string, unknown>();
    const context = {
      globalState: {
        get: (k: string) => globalState.get(k),
        update: async (k: string, v: unknown) => {
          globalState.set(k, v);
        },
      },
    } as import('vscode').ExtensionContext;

    const count = await migrateLegacySettings(context);
    expect(count).toBe(1);
    expect(updates).toContainEqual({
      section: CONFIG_SECTION,
      key: 'enabled',
      value: false,
      target: ConfigurationTarget.Global,
    });
    expect(updates).toContainEqual({
      section: LEGACY_CONFIG_SECTION,
      key: 'enabled',
      value: undefined,
      target: ConfigurationTarget.Global,
    });
    expect(globalState.get('linguaLens.settingsMigration.v1')).toBe(true);
  });

  it('skips migration when linguaLens already has a value at the same scope', async () => {
    modernEnabled = true;
    const globalState = new Map<string, unknown>();
    const context = {
      globalState: {
        get: () => undefined,
        update: async (k: string, v: unknown) => globalState.set(k, v),
      },
    } as import('vscode').ExtensionContext;

    const count = await migrateLegacySettings(context);
    expect(count).toBe(0);
    expect(updates.filter((u) => u.section === CONFIG_SECTION)).toHaveLength(0);
  });

  it('covers all config keys used in code', () => {
    expect(CONFIG_KEYS_USED_IN_CODE.length).toBeGreaterThan(40);
  });
});
