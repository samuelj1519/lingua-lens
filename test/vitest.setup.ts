import path from 'node:path';
import { initUiL10n } from '../src/l10n/uiL10n';

initUiL10n(path.join(process.cwd()), () => 'en');
