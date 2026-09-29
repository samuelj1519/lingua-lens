import * as vscode from 'vscode';
import { CONFIG_KEYS_USED_IN_CODE } from '../config/keysUsedInCode';

export const LEGACY_CONFIG_SECTION = 'aiTranslate';
export const CONFIG_SECTION = 'linguaLens';

const MIGRATION_FLAG = 'linguaLens.settingsMigration.v1';

type ScopeTarget = vscode.ConfigurationTarget;

interface ScopeJob {
  resource?: vscode.Uri;
  label: string;
}

function scopesToMigrate(): ScopeJob[] {
  const jobs: ScopeJob[] = [{ label: 'global' }];
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (folder) {
    jobs.push({ resource: folder.uri, label: 'workspace' });
    for (const f of vscode.workspace.workspaceFolders ?? []) {
      jobs.push({ resource: f.uri, label: `folder:${f.name}` });
    }
  }
  return jobs;
}

function hasLegacyValues(): boolean {
  for (const { resource } of scopesToMigrate()) {
    const legacy = vscode.workspace.getConfiguration(LEGACY_CONFIG_SECTION, resource);
    for (const key of CONFIG_KEYS_USED_IN_CODE) {
      const ins = legacy.inspect(key);
      if (
        ins?.globalValue !== undefined ||
        ins?.workspaceValue !== undefined ||
        ins?.workspaceFolderValue !== undefined ||
        ins?.globalLanguageValue !== undefined ||
        ins?.workspaceLanguageValue !== undefined ||
        ins?.workspaceFolderLanguageValue !== undefined
      ) {
        return true;
      }
    }
  }
  return false;
}

function valueDefined(v: unknown): boolean {
  return v !== undefined;
}

function newValueAtTarget(
  inspect: ReturnType<vscode.WorkspaceConfiguration['inspect']> | undefined,
  target: ScopeTarget,
): unknown {
  if (!inspect) return undefined;
  switch (target) {
    case vscode.ConfigurationTarget.Global:
      return inspect.globalValue ?? inspect.globalLanguageValue;
    case vscode.ConfigurationTarget.Workspace:
      return inspect.workspaceValue ?? inspect.workspaceLanguageValue;
    case vscode.ConfigurationTarget.WorkspaceFolder:
      return inspect.workspaceFolderValue ?? inspect.workspaceFolderLanguageValue;
    default:
      return undefined;
  }
}

/**
 * Copy explicit `aiTranslate.*` values to `linguaLens.*` (never overwrite new keys), then clear legacy keys.
 */
export async function migrateLegacySettings(context: vscode.ExtensionContext): Promise<number> {
  const alreadyDone = context.globalState.get<boolean>(MIGRATION_FLAG) === true;
  if (alreadyDone && !hasLegacyValues()) {
    return 0;
  }

  let migrated = 0;
  for (const { resource } of scopesToMigrate()) {
    const legacy = vscode.workspace.getConfiguration(LEGACY_CONFIG_SECTION, resource);
    const modern = vscode.workspace.getConfiguration(CONFIG_SECTION, resource);

    for (const key of CONFIG_KEYS_USED_IN_CODE) {
      const oldIns = legacy.inspect(key);
      if (!oldIns) continue;

      const pairs: Array<[ScopeTarget, unknown]> = [
        [vscode.ConfigurationTarget.Global, oldIns.globalValue],
        [vscode.ConfigurationTarget.Workspace, oldIns.workspaceValue],
        [vscode.ConfigurationTarget.WorkspaceFolder, oldIns.workspaceFolderValue],
      ];

      for (const [target, oldVal] of pairs) {
        if (!valueDefined(oldVal)) continue;
        const newIns = modern.inspect(key);
        if (valueDefined(newValueAtTarget(newIns, target))) continue;
        await modern.update(key, oldVal, target);
        await legacy.update(key, undefined, target);
        migrated++;
      }
    }
  }

  if (migrated > 0 || !alreadyDone) {
    await context.globalState.update(MIGRATION_FLAG, true);
  }
  return migrated;
}
