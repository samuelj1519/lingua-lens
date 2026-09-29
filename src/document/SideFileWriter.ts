import * as vscode from 'vscode';
import { t } from '../l10n/uiL10n';
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
      void vscode.window.showErrorMessage(t('msg.sideFileSamePath'));
      return 'cancelled';
    }
    const fileName = target.path.split('/').pop() ?? target.path;
    try {
      await vscode.workspace.fs.stat(target);
      const overwrite = t('msg.overwrite');
      const choice = await vscode.window.showWarningMessage(
        t('msg.sideFileExistsNamed', fileName),
        { modal: true },
        overwrite,
      );
      if (choice !== overwrite) return 'cancelled';
    } catch {
      /* not exists */
    }
    const crlf = content.includes('\r\n');
    const data = Buffer.from(crlf ? content.replace(/\n/g, '\r\n') : content, 'utf8');
    await vscode.workspace.fs.writeFile(target, data);
    void vscode.window.showInformationMessage(t('msg.sideFileWritten', fileName));
    return 'written';
  }
}
