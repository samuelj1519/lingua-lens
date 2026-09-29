# 配置 LLM 提供商

## 目标

将 LinguaLens 指向 OpenAI 兼容的 chat completions API：设置 `linguaLens.llm.baseUrl`、`linguaLens.llm.model`，存储 API 密钥，并可选择调整超时、并发与面向厂商的 `extraBody` 请求字段。

## 前提

- 扩展已安装并激活（`onStartupFinished`）。
- 拥有提供商 API 密钥。
- 本机网络允许访问提供商主机。

## 步骤 1：选择提供商配置

LinguaLens 使用 **OpenAI Chat Completions** 协议。客户端构建 URL 为 `{baseUrl}/chat/completions`，除非 `baseUrl` 已以 `/chat/completions` 结尾（`LlmClient.chatUrl`）。

密钥保存在 VS Code Secret Storage 中，按 `baseUrl` 的**源**（scheme + host + port）。仅在同主机上改路径会复用同一密钥；改主机需新密钥。

## 步骤 2：应用设置（用户或工作区）

打开 **Preferences: Open User Settings (JSON)** 或工作区设置。下列示例可直接复制；请替换占位符。

### OpenAI

```json
{
  "linguaLens.llm.baseUrl": "https://api.openai.com/v1",
  "linguaLens.llm.model": "gpt-4o-mini",
  "linguaLens.llm.temperature": 0.2,
  "linguaLens.llm.timeoutMs": 30000,
  "linguaLens.llm.maxTokens": 4096
}
```

### DeepSeek

```json
{
  "linguaLens.llm.baseUrl": "https://api.deepseek.com/v1",
  "linguaLens.llm.model": "deepseek-chat",
  "linguaLens.llm.extraBody": {
    "thinking": { "type": "disabled" }
  }
}
```

部分 DeepSeek 模型默认启用「思考」；关闭可保持回复简短且 JSON 批量模式稳定。见[Extra body 与思考](./extra-body-thinking.md)。

### Qwen（DashScope 兼容模式）

```json
{
  "linguaLens.llm.baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "linguaLens.llm.model": "qwen-plus",
  "linguaLens.llm.extraBody": {
    "enable_thinking": false
  }
}
```

使用**兼容模式** base URL，使请求/响应形态与 OpenAI 一致。模型 id 遵循 DashScope 命名（`qwen-turbo`、`qwen-plus` 等）。

### 豆包 / 火山引擎 Ark

```json
{
  "linguaLens.llm.baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
  "linguaLens.llm.model": "ep-xxxxxxxxxxxxxxxx",
  "linguaLens.llm.extraHeaders": {}
}
```

Ark 端点将**端点 id**（`ep-…`）作为 model 字段。区域与 URL 须与火山控制台创建端点的位置一致。

### 本地 OpenAI 兼容服务（LM Studio、vLLM 等）

```json
{
  "linguaLens.llm.baseUrl": "http://127.0.0.1:1234/v1",
  "linguaLens.llm.model": "your-local-model-name",
  "linguaLens.llm.jsonMode": "auto"
}
```

文档批量翻译在 `jsonMode` 非 `off` 时请求 JSON 响应。若服务器不支持 `response_format`，将 `linguaLens.llm.jsonMode` 设为 `off`，并预期可能出现批量解析失败。

## 步骤 3：存储 API 密钥

1. **LinguaLens: Set API Key** — 输入密钥（密码字段）。
2. 无鉴权的本地服务器，部分用户仍设置占位密钥（服务器忽略 `Authorization`）；未配置密钥时会看到 `noKey`。

## 步骤 4：可选高级 LLM 设置

| 设置 | 何时修改 |
|------|----------|
| `linguaLens.llm.stream` | 启用聊天 SSE 流式（默认 false）。 |
| `linguaLens.llm.maxConcurrency` | 并行文档批量（默认 4）。 |
| `linguaLens.llm.maxRetries` | 带退避的 HTTP 重试（默认 3）。 |
| `linguaLens.llm.extraHeaders` | 自定义头（少见；部分网关）。 |
| `linguaLens.llm.systemPrompt` | 追加/替换系统指令（影响提示词版本与缓存）。 |
| `linguaLens.llm.jsonMode` | 文档 JSON 批量调用的 `auto` / `on` / `off`。 |

## 步骤 5：验证

1. 运行 **LinguaLens: Test Connection**。
2. 悬停注释或对短英文短语运行**翻译选区**，目标设为 `zh-CN`。
3. 需要请求级细节时将 **LinguaLens: Show Log** 设为 `debug`。

成功标准：测试连接成功消息、悬停或选区显示译文、日志显示 API 调用且无重复鉴权错误。

## 步骤 6：使用设置面板（可选）

**LinguaLens: Open Settings Panel** 通过 webview 与作用域切换（用户 / 工作区）编辑相同键。DeepSeek 与 Qwen 的 extra body 模板与上文 JSON 一致。API 密钥**不在**面板中编辑；请使用 **Set API Key**。

## 陷阱

| 现象 | 可能原因 |
|------|----------|
| `API Key is not set` | 此 `baseUrl` 源无密钥。 |
| `Model name is not configured` | `llm.model` 为空字符串（package.json 默认）。 |
| chat URL 404 | `baseUrl` 缺少 `/v1` 或 Ark 区域错误。 |
| 文档模式 JSON 空或无效 | 模型不支持 JSON 模式；调整 `jsonMode` 或模型。 |
| 切换提供商后译文陈旧 | 缓存键含 `baseUrl` 与 `extraBody` 哈希；仅改提示词时仍建议清空缓存。 |
| 译文质量差 | temperature 过高；降低 `llm.temperature`（默认 0.2）。 |

## Azure OpenAI 与兼容网关（概念）

许多团队通过 Azure OpenAI 或自建网关暴露 OpenAI 形态 API。`baseUrl` 通常形如 `https://{resource}.openai.azure.com/openai/deployments/{deployment}` 或网关文档给出的兼容前缀；`model` 字段填部署名而非公开模型商品名。密钥仍通过 **Set API Key** 写入 SecretStorage，与直连 OpenAI 相同。若网关要求 `api-version` 查询参数，部分环境需写入 `extraBody` 或 `extraHeaders`（以网关文档为准），并注意这些字段会进入缓存键哈希。

## 多工作区与作用域

`llm.baseUrl` 与 `llm.model` 可在工作区或文件夹级覆盖，适合文档仓库指向便宜模型、应用仓库指向高质量模型的场景。API 密钥仍按 **origin** 全局存储，不因工作区切换而自动轮换——切换 `baseUrl` 主机后务必重新 **Set API Key**。`llm.extraBody` 在 schema 中为应用程序作用域，面板作用域栏写入用户级时，多根工作区共享同一 extra body，除非各根使用不同用户配置档案（profiles）。

## 性能与并发建议

文档翻译并发由 `maxConcurrency` 与 `document.batchSize` 共同决定；提高并发可缩短长 README 的首屏时间，但可能触发提供商速率限制。交互悬停与后台批量通过 `RequestSemaphore` 分优先级，一般无需为悬停单独调参。若本地 vLLM 仅支持单连接，将 `maxConcurrency` 设为 1 并适当增大 `timeoutMs` 往往比盲目重试更稳定。

## 相关文档

- [排查连接](./troubleshoot-connection.md)
- [Extra body 与思考](./extra-body-thinking.md)
- [缓存](../explanation/caching.md)
- [设置参考](../reference/settings.md)
