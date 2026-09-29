/**
 * 集成测试需在本机安装 @vscode/test-electron 并具备图形/Xvfb 环境。
 * CI 无头环境可跳过：npm test 仅运行 vitest 单元测试。
 *
 * 运行示例：npx @vscode/test-electron --extensionDevelopmentPath=. --extensionTestsPath=test/integration
 */
import { describe, it } from 'vitest';

describe('vscode integration (skipped in headless CI)', () => {
  it.skip('activates extension', () => {
    /* placeholder for @vscode/test-electron */
  });
});
