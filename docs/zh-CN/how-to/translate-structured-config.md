# 翻译结构化配置文件（JSON、YAML、TOML、XML）

## 目标

只翻译配置文件中的**字符串值**，键名、注释、缩进、引号与转义保持不变（按 offset 回填，不 parse 后重排）。

## 支持格式

| 格式 | 扩展名 / language id |
| --- | --- |
| JSON / JSONC | `.json`、`.jsonc`、`json`、`jsonc` |
| YAML | `.yaml`、`.yml`、`yaml` |
| TOML | `.toml`、`toml` |
| XML | `.xml`、`.plist`、`xml` |

**本版（0.8.1）暂不支持** INI、`.properties` 等「键=值」行格式：注释与分隔符规则差异大，误译风险高，后续会在有可靠 AST 方案后再加入。

## 入口（与 Markdown 相同）

- **LinguaLens: Translate Document**（标题栏地球图标、CodeLens、资源管理器右键、`Ctrl+Alt+Shift+D`）。
- **LinguaLens: Generate Side File** 生成译文文件。
- **LinguaLens: Refresh Document Translation** 从源文件刷新。

## 预览

结构化预览与生成译文文件共用同一套翻译会话。`lingualens:` 虚拟文档展示**与原格式相同的译文**（非 Markdown 双语排版），翻译过程中文件仍可被解析。

## 翻译范围

- JSON/JSONC/TOML/YAML：仅**字符串值**（对象键、数组下标、TOML 表名等永不翻译）。
- XML：标签间文本；属性值仅在像人类文案时翻译（跳过 `href`、`id`、`class` 等）。
- **注释不翻译**：`#`、`//`、`<!--` 等多为版本、许可或机器可读标记，翻译会破坏 diff、合并与工具链；若需本地化说明，请放在可翻译的字符串字段中。

## 自动跳过

URL、路径、语义化版本号、颜色值、UUID、纯数字串、反向域名式标识符（如 `com.example.app`）、以及明显为代码标识符的短串不会发给模型。
