import { execFile } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';

const exec = promisify(execFile);

export async function getCommitMessageAtLine(
  filePath: string,
  line: number,
): Promise<string | undefined> {
  const folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
  if (!folder) return undefined;
  const rel = vscode.workspace.asRelativePath(filePath, false);
  try {
    const { stdout } = await exec(
      'git',
      ['log', '-1', '--format=%B', `-L${line},${line}:${rel}`],
      { cwd: folder.uri.fsPath, maxBuffer: 1024 * 1024 },
    );
    const msg = stdout.trim();
    return msg || undefined;
  } catch {
    try {
      const { stdout } = await exec(
        'git',
        ['blame', '-p', '-L', `${line},${line}`, '--', rel],
        { cwd: folder.uri.fsPath },
      );
      const lines = stdout.split('\n');
      const summary = lines.find((l) => l.startsWith('summary '));
      if (summary) return summary.replace(/^summary /, '').trim();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function getScmInputMessage(): string | undefined {
  const git = vscode.extensions.getExtension('vscode.git')?.exports as
    | { getAPI(version: number): { repositories: { inputBox: { value: string } }[] } }
    | undefined;
  if (!git) return undefined;
  try {
    const api = git.getAPI(1);
    const repo = api.repositories.find((r) => r.inputBox.value.trim());
    return repo?.inputBox.value.trim() || api.repositories[0]?.inputBox.value;
  } catch {
    return undefined;
  }
}
