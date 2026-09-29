# Extra body 与思考模式

## 目标

通过 `aiTranslate.llm.extraBody` 将厂商特定字段合并到每次 chat completions 请求，尤其是**关闭 DeepSeek 与 Qwen 的「思考」**或扩展推理，使译文简洁且文档 JSON 批量可可靠解析。

## 前提

- 已按[配置提供商](./configure-providers.md)配置提供商。
- 理解 `extraBody` 在 `LlmClient` 中于标准字段（`model`、`messages`、`temperature` 等）之后浅合并进 HTTP JSON 体。

## extra body 如何工作

`aiTranslate.llm.extraBody` 为 JSON 对象（默认 `{}`）。请求时扩展将其展开到 POST 体。任何对您提供商 OpenAI 兼容 API 有效的键均可传入：`top_p`、`presence_penalty`、提供商标志等。

**缓存影响：** 自 0.4.3 起，`TranslationService` 将 `JSON.stringify(extraBody ?? {})` 的 SHA-256 前缀（16 字符）与文本、目标语言、模型、提示词版本、`baseUrl` 一并哈希进缓存键。更改 `extraBody` 会使新查找自动失效，无需手动清磁盘缓存。

## 步骤 1：在设置 JSON 中编辑

### DeepSeek — 关闭思考

```json
{
  "aiTranslate.llm.baseUrl": "https://api.deepseek.com/v1",
  "aiTranslate.llm.model": "deepseek-chat",
  "aiTranslate.llm.extraBody": {
    "thinking": {
      "type": "disabled"
    }
  }
}
```

与设置面板内置模板 `EXTRA_BODY_TEMPLATE_DEEPSEEK` 一致。

### Qwen DashScope 兼容 — 关闭思考

```json
{
  "aiTranslate.llm.baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "aiTranslate.llm.model": "qwen-plus",
  "aiTranslate.llm.extraBody": {
    "enable_thinking": false
  }
}
```

与面板模板 `EXTRA_BODY_TEMPLATE_QWEN` 一致。

### OpenAI — 典型扩展（无思考标志）

OpenAI 公开 API 不使用 DeepSeek/Qwen 思考字段。仍可传入：

```json
{
  "aiTranslate.llm.baseUrl": "https://api.openai.com/v1",
  "aiTranslate.llm.model": "gpt-4o-mini",
  "aiTranslate.llm.extraBody": {
    "seed": 42
  }
}
```

仅包含您的模型与账户支持的键。

### 豆包 / Ark

查阅火山引擎 OpenAI 兼容参数文档。若无需思考标志，保持 `extraBody` 为 `{}`：

```json
{
  "aiTranslate.llm.baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
  "aiTranslate.llm.model": "ep-xxxxxxxxxxxxxxxx",
  "aiTranslate.llm.extraBody": {}
}
```

## 步骤 2：在设置面板中编辑

1. **LinguaLens: Open Settings Panel**。
2. 找到 **Extra body (JSON)**。
3. 粘贴合法 JSON 对象文本，或点击 **DeepSeek** / **Qwen** / **Clear** 模板按钮。
4. 非法 JSON 会向 webview 回传 `extraBodyError`；保存前修正语法。

面板用 `JSON.stringify` 显示对象；更新经 `parseExtraBodyJson` 解析（须为普通对象，不能是数组）。

## 步骤 3：验证行为

1. **LinguaLens: Test Connection** — 仍应成功；额外字段不应破坏最小 completion。
2. 翻译短注释 — 回复应为直接译文，无长段推理前言。
3. 打开 Markdown 文档预览 — 批量分段应返回可解析的 JSON id。若模型用思考标签或散文包裹输出，请关闭思考或换模型。

## 步骤 4：重大变更后清空缓存

若先前在**启用**思考时缓存了译文，现在关闭思考，新键会自动应用。旧条目可能留在磁盘直至 LRU 淘汰或 **LinguaLens: Clear Cache**。

## 陷阱

| 问题 | 缓解 |
|------|------|
| 模型返回空内容 | 思考消耗 token 预算；关闭思考或提高 `maxTokens`。 |
| 面板 `Invalid JSON` | `extraBody` 须为 `{ "key": "value" }`，不能是字符串或数组。 |
| 提供商忽略未知键 | 删除不支持的键；查提供商 OpenAI 兼容矩阵。 |
| 作用域行为不同 | `llm.extraBody` 在 package.json 为**应用程序**作用域——除非用面板作用域栏做多根覆盖，请在用户级设置。 |
| 安全 | 勿在 `extraBody` 放密钥；用 API 密钥存储，仅在必要时用 `extraHeaders`。 |

## 与 JSON 批量模式的耦合

文档 `translateBatch` 依赖模型返回严格 JSON 映射。思考模式可能在 `content` 外输出推理轨迹或包裹额外字段，导致解析失败并触发重试或分段降级。除关闭思考外，还可将 `llm.jsonMode` 设为 `on` 强制 `response_format`（若提供商支持），或换用明确支持 JSON mode 的模型。调试时先在 **Test Connection** 与短选区翻译验证 extra body，再打开整篇 Markdown 预览，可更快定位是「思考」还是「JSON 能力」问题。

## 版本升级注意

自 0.4.3 起 extra body 参与缓存键；升级后旧缓存不会对相同文本命中，但也不会返回错误译文。若您在 extra body 中存放非思考类参数（如 `top_p`），变更这些参数同样会使旧缓存失效——属预期行为。请勿在 extra body 中存储会频繁旋转的临时 token；应使用官方 header 或密钥机制。

## 面板模板与手写 JSON 的一致性

设置面板 **DeepSeek** / **Qwen** 按钮写入的 JSON 与本文示例字段名一致；若您同时在 `settings.json` 手写 extra body，请以面板保存结果为准，避免两处不同步。`parseExtraBodyJson` 拒绝数组顶层或带注释的 JSON（JSONC 不适用 extra body 字段）。合并顺序为：标准 chat 字段先构建，再浅合并 extra body——同名键以 extra body 覆盖，请勿用 extra body 覆盖 `messages` 除非您明确知道提供商行为。

## 观测模型是否仍在「思考」

在 `debug` 日志中查看 completion 原始长度与首字符；若出现推理标签或大量元叙述，即使 `thinking` 已 disabled，也可能是模型版本忽略该标志。此时换模型或联系提供商文档，比反复清空缓存更有效。文档批量失败时，日志常含 JSON parse 错误片段，可据此判断是思考输出污染还是 id 缺失。

## 提供商矩阵（思考相关字段）

| 提供商 | 常见字段 | 面板模板 |
|--------|----------|----------|
| DeepSeek | `thinking.type: disabled` | DeepSeek |
| Qwen 兼容 | `enable_thinking: false` | Qwen |
| OpenAI | 无官方思考字段 | — |
| Ark / 豆包 | 以火山文档为准 | — |

新增厂商时优先在设置面板增加模板按钮，减少用户粘贴错误 JSON 的概率；字段名错误时提供商往往静默忽略，表现为译文仍带推理废话，易被误判为模型质量问题。合并后应用 `Test Connection` 与一条悬停翻译即可回归；无需为 extra body 单独清空缓存，除非您同时更换了模型或 `baseUrl`。

## 相关文档

- [配置提供商](./configure-providers.md)
- [缓存](../explanation/caching.md)
- [架构 — LLM 客户端](../explanation/architecture.md)
