import * as vscode from 'vscode';
import type { TargetLang } from '../types';

export class SideFileWriter {
  targetUri(source: vscode.Uri, lang: TargetLang, pattern: string): vscode.Uri {
    const base = source.path.split('/').pop() ?? 'file.txt';
    const extMatch = base.match(/(\.[^.]+)$/);
    const ext = extMatch?.[1] ?? '';
    const baseNoExt = base.replace(/\.[^.]+$/, '');
    const dir = source.with({ path: source.path.replace(/\/[^/]+$/, '') });
    const name = pattern
      .replace(/\$\{fileBasenameNoExtension\}/g, baseNoExt)
      .replace(/\$\{fileExtname\}/g, ext)
      .replace(/\$\{lang\}/g, lang)
      .replace(/\$\{fileDirname\}/g, dir.path);
    return vscode.Uri.joinPath(dir, name.split('/').pop() ?? name);
  }

  async write(
    source: vscode.Uri,
    content: string,
    lang: TargetLang,
    pattern: string,
  ): Promise<'written' | 'cancelled'> {
    const target = this.targetUri(source, lang, pattern);
    if (target.toString() === source.toString()) {
      void vscode.window.showErrorMessage('译文文件路径不能与源文件相同');
      return 'cancelled';
    }
    try {
      await vscode.workspace.fs.stat(target);
      const choice = await vscode.window.showWarningMessage(
        `${target.path.split('/').pop()} 已存在，是否覆盖？`,
        { modal: true },
        '覆盖',
      );
      if (choice !== '覆盖') return 'cancelled';
    } catch {
      /* not exists */
    }
    const crlf = content.includes('\r\n');
    const data = Buffer.from(crlf ? content.replace(/\n/g, '\r\n') : content, 'utf8');
    await vscode.workspace.fs.writeFile(target, data);
    void vscode.window.showInformationMessage(`已写入 ${target.path.split('/').pop()}`);
    return 'written';
  }
}
