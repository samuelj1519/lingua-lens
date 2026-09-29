# Contributing

English | [简体中文](CONTRIBUTING.zh-CN.md)

## Development setup

```bash
npm install
npm run build
npm test
npm run package
```

`prebuild` and `pretest` run `merge-config` and `merge-nls`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run merge-nls` | Merge `i18n/` into `package.nls*.json` and `l10n/bundle.l10n.*` |
| `npm run merge-config` | Merge `contributes/configuration.json` into `package.json` |
| `node scripts/generate-settings-reference.mjs` | Regenerate settings docs |

## Testing

- Unit tests: `npm test` (Vitest)
- Integration tests may require a display; see `test/integration/`
- After changing `contributes/configuration.json` or nls keys, regenerate settings reference and commit the output

## i18n workflow

- Manifest strings: `i18n/commands`, `i18n/config` → `package.nls.*`
- Runtime UI: `i18n/bundle/*.json` → `l10n/bundle.l10n.*`
- Source code and logs stay **English**; user-visible strings go through `t()` or `package.nls`

## Commits

Use clear English commit messages. End every commit with:

```
Co-authored-by: Samuel-J <samuelj1519@gmail.com>
```
