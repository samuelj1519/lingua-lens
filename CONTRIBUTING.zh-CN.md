# 参与贡献

[English](CONTRIBUTING.md) | 简体中文

## 开发环境

```bash
npm install
npm run build
npm test
npm run package
```

`prebuild` 与 `pretest` 会执行 `merge-config` 与 `merge-nls`。

## 常用脚本

| 脚本 | 作用 |
| --- | --- |
| `npm run merge-nls` | 将 `i18n/` 合并为 `package.nls*.json` 与 `l10n/bundle.l10n.*` |
| `npm run merge-config` | 将 `contributes/configuration.json` 合并进 `package.json` |
| `node scripts/generate-settings-reference.mjs` | 重新生成设置参考文档 |

## 测试

- 单元测试：`npm test`（Vitest）
- 集成测试可能需要图形环境，见 `test/integration/`
- 修改 `contributes/configuration.json` 或 nls 键后，请重新生成 settings 参考并提交

## 国际化流程

- 清单字符串：`i18n/commands`、`i18n/config` → `package.nls.*`
- 运行时 UI：`i18n/bundle/*.json` → `l10n/bundle.l10n.*`
- 源码与日志保持**英文**；面向用户的文案走 `t()` 或 `package.nls`

## 提交说明

请使用清晰的英文提交说明，并以如下 trailer 结尾：

```
Co-authored-by: Samuel-J <samuelj1519@gmail.com>
```
