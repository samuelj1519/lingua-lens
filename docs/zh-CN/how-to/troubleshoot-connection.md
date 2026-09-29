# 排查 LLM 连接

## 目标

诊断并修复 **AI Translate: Test Connection**、悬停错误或 `LlmError` 消息（鉴权、网络、服务器、无密钥、无模型）导致的失败。

## 前提

- 知晓预期的 `baseUrl` 与 `model`（[配置提供商](./configure-providers.md)）。
- 能打开 **AI Translate: Show Log** 并临时将 `aiTranslate.log.level` 设为 `debug`。

## 步骤 1：确认配置

```json
{
  "aiTranslate.llm.baseUrl": "https://api.openai.com/v1",
  "aiTranslate.llm.model": "gpt-4o-mini",
  "aiTranslate.llm.timeoutMs": 30000,
  "aiTranslate.llm.maxRetries": 3
}
```

| 检查 | 命令 / 操作 |
|------|-------------|
| 模型非空 | 查看设置——默认 model 为 `""`。 |
| 密钥存在 | 对提示中显示的源运行 **Set API Key**。 |
| URL 形态 | 须解析为 `{base}/chat/completions`。 |

## 步骤 2：运行测试连接

**AI Translate: Test Connection** 调用 `LlmClient.testConnection()` 做最小 completion。结果：

- **信息消息** — HTTP 2xx 且内容可解析。
- **错误消息** — 显示在 UI；见下分类。

## 步骤 3：错误与修复对照

### `API Key is not set`（`noKey`）

- 运行 **AI Translate: Set API Key**。
- 切换 `baseUrl` 主机后重新设密钥（按源存储）。
- **Clear API Key** → 当前源或轮换密钥时清除所有源。

### `Model name is not configured`（`noModel`）

将 `aiTranslate.llm.model` 设为端点有效 id。

### 鉴权错误（`auth`）

- 密钥错误或过期。
- Ark/DashScope：使用正确控制台产品的 API 密钥。
- 企业代理剥离 `Authorization` 头——配置系统代理或提供商要求的 `extraHeaders`。

### 网络错误（`network`）

- DNS 或 TLS 失败、超时（慢网络下 `timeoutMs` 过低）。
- 本地服务未运行（`http://127.0.0.1:…`）。
- 防火墙阻止出站——放行提供商域名。

### 服务器错误（`server`）

- 提供商 5xx — 稍后重试；扩展退避且连续 5 次失败后可能**暂停**交互翻译 60 秒（`TranslationService`）。
- 速率限制 — 降低 `maxConcurrency` 或文档 `batchSize`。

### 无效响应（`invalidResponse`）

- 模型输出为空（思考模式消耗 token — [关闭思考](./extra-body-thinking.md)）。
- 不支持 JSON 批量模式 — 将 `llm.jsonMode` 设为 `off` 或换模型。

## 步骤 4：提供商专项检查

**OpenAI**

```json
{
  "aiTranslate.llm.baseUrl": "https://api.openai.com/v1",
  "aiTranslate.llm.model": "gpt-4o-mini"
}
```

**DeepSeek**

```json
{
  "aiTranslate.llm.baseUrl": "https://api.deepseek.com/v1",
  "aiTranslate.llm.model": "deepseek-chat",
  "aiTranslate.llm.extraBody": { "thinking": { "type": "disabled" } }
}
```

**Qwen 兼容**

```json
{
  "aiTranslate.llm.baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "aiTranslate.llm.model": "qwen-plus",
  "aiTranslate.llm.extraBody": { "enable_thinking": false }
}
```

**豆包 Ark**

```json
{
  "aiTranslate.llm.baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
  "aiTranslate.llm.model": "ep-xxxxxxxxxxxxxxxx"
}
```

验证端点 id 与区域与控制台 URL 一致。

## 步骤 5：集成测试模式（开发者）

`AITRANSLATE_INTEGRATION_TEST=1` 时，激活将 `baseUrl` 指向 `http://127.0.0.1:${AITRANSLATE_MOCK_PORT||18765}/v1` 并设模型 `mock`。仅用于自动化测试。

## 步骤 6：重置暂停状态

重复失败后翻译暂停。修复根因后：

- 再次 **Set API Key**（调用 `translation.resetPause()`），或
- 等待 60 秒。

## 步骤 7：端到端验证

1. 测试连接成功。
2. 短选区翻译成功。
3. 日志无错误刷屏且 `apiCalls` 正常。
4. 可选：在 VS Code 外对相同 URL 用 `curl` 与 `Authorization: Bearer $KEY` 隔离扩展与网络问题。

OpenAI 形态 curl 示例：

```bash
curl -sS "${BASE_URL%/}/chat/completions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"max_tokens":5}'
```

## 陷阱

| 陷阱 | 说明 |
|------|------|
| baseUrl 尾部斜杠 | 由 trim 逻辑处理；避免 `/v1/v1` 重复。 |
| 流式模式 | `llm.stream` true 改变响应处理；调试时关闭以简化。 |
| JSON 模式自动关闭 | 客户端按能力键记住拒绝 `response_format` 的模型。 |
| 日志中的密钥 | 生产用 `info`；`trace` 可能记录请求元数据——共享机器勿用。 |
| 工作区禁用 | `aiTranslate.enabled` false — 命令提前返回且不调用 LLM。 |

## 代理、证书与企业网络

部分企业环境要求 HTTPS 代理或自定义 CA。VS Code 遵循系统代理设置；若 `Test Connection` 报 TLS 或超时，请在同一终端用 curl 验证。`extraHeaders` 极少用于补充网关要求的 trace id，但不应替代标准 `Authorization`。本地自签证书服务需在 OS 或 Node 信任库安装 CA，扩展不内置「忽略证书错误」开关——这是刻意设计，避免中间人风险。

## 暂停与用户体验

连续失败后 60 秒暂停仅影响交互路径（悬停、选区等），不一定阻止您阅读日志或修改设置。修复密钥后 **Set API Key** 可立即 `resetPause()`；若仅网络闪断，也可等待自动恢复。暂停期间缓存读取仍可用，用户可能看到「无新 API 调用但有译文」——区分缓存命中与暂停状态可看日志是否出现 pause 相关条目。

## 对照检查表（打印用）

| 步骤 | 操作 |
|------|------|
| 1 | 确认 `aiTranslate.enabled` 与工作区未禁用 |
| 2 | 确认 `llm.model` 非空字符串 |
| 3 | 对当前 `baseUrl` 源 **Set API Key** |
| 4 | **Test Connection** |
| 5 | `log.level=debug` 重现一次悬停 |
| 6 | 若 JSON 文档失败，检查 `jsonMode` 与 extra body 思考标志 |
| 7 | 若仍失败，curl 同端点排除扩展因素 |

## 错误消息与 LlmError 类别

扩展将 HTTP 与解析失败映射为 `noKey`、`noModel`、`auth`、`network`、`server`、`invalidResponse` 等类别，便于 UI 与日志过滤。截图报错时请包含类别与状态码（若有），避免仅提供「不工作」描述。提供商返回的非英文错误体通常会原样附加在消息末尾。

## 相关文档

- [配置提供商](./configure-providers.md)
- [Extra body](./extra-body-thinking.md)
- [架构 — LLM 客户端](../explanation/architecture.md)
